-- Invii campioni creati da Claude (connettore MCP, /api/mcp).
-- Solo aggiunte: nessuna colonna, riga o regola esistente viene toccata.

-- Origine dell'invio: null = inserito dall'app, 'claude-mcp' = creato da chat.
ALTER TABLE sample_shipments ADD COLUMN IF NOT EXISTS source text;

-- Impronta del codice di conferma: la stessa conferma ripetuta non crea un secondo invio.
ALTER TABLE sample_shipments ADD COLUMN IF NOT EXISTS mcp_token_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS sample_shipments_mcp_token_hash_key
  ON sample_shipments (mcp_token_hash) WHERE mcp_token_hash IS NOT NULL;

-- Registro di ogni operazione del connettore (riuscita, rifiutata o fallita).
CREATE TABLE IF NOT EXISTS mcp_audit_log (
  id          bigserial PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  tool        text NOT NULL,
  shipment_id uuid REFERENCES sample_shipments(id) ON DELETE SET NULL,
  payload     jsonb,
  outcome     text NOT NULL,          -- 'ok' | 'rifiutato' | 'errore'
  detail      text
);
-- RLS attiva senza policy: dal browser non si legge né si scrive, solo dal server.
ALTER TABLE mcp_audit_log ENABLE ROW LEVEL SECURITY;

-- Testata + righe + avanzamento prospect + registro in un'unica transazione:
-- se un passo fallisce non resta niente di scritto a metà.
CREATE OR REPLACE FUNCTION create_sample_shipment(p_shipment jsonb, p_items jsonb, p_token_hash text)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id       uuid;
  v_purpose  text;
  v_shipped  text;
  v_omaggio  boolean;
  v_return   boolean;
  v_due      text;
  v_prospect uuid;
  v_bad      int;
BEGIN
  IF coalesce(p_token_hash, '') = '' THEN
    RAISE EXCEPTION 'Codice di conferma mancante';
  END IF;

  -- Conferma già usata: si restituisce l'invio creato la prima volta.
  SELECT id INTO v_id FROM sample_shipments WHERE mcp_token_hash = p_token_hash;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  v_purpose := coalesce(nullif(p_shipment->>'purpose', ''), 'valutazione');
  IF v_purpose NOT IN ('valutazione', 'misurazione', 'fiera', 'promozione') THEN
    RAISE EXCEPTION 'Motivo non valido: %', v_purpose;
  END IF;

  v_shipped := p_shipment->>'shipped_date';
  IF v_shipped IS NULL OR v_shipped !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RAISE EXCEPTION 'Data invio mancante o non valida';
  END IF;

  IF coalesce(trim(p_shipment->>'recipient_name'), '') = '' THEN
    RAISE EXCEPTION 'Destinatario mancante';
  END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Nessun articolo da inviare';
  END IF;

  SELECT count(*) INTO v_bad
  FROM jsonb_array_elements(p_items) it
  WHERE coalesce(trim(it->>'description'), '') = '' AND coalesce(trim(it->>'sp'), '') = ''
     OR coalesce(it->>'quantity', '') !~ '^[1-9]\d*$';
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'Righe non valide: servono descrizione e quantità maggiore di zero';
  END IF;

  -- Stesse regole del modulo dell'app: i set misure rientrano sempre
  -- (entro 30 giorni dall'invio), la merce regalata non rientra mai.
  v_omaggio := coalesce((p_shipment->>'omaggio')::boolean, false);
  v_return  := NOT v_omaggio
               AND (v_purpose = 'misurazione' OR coalesce((p_shipment->>'return_required')::boolean, false));
  v_due     := CASE WHEN v_return THEN coalesce(
                 nullif(p_shipment->>'return_due_date', ''),
                 CASE WHEN v_purpose = 'misurazione' THEN to_char(v_shipped::date + 30, 'YYYY-MM-DD') END)
               END;
  v_prospect := nullif(p_shipment->>'prospect_id', '')::uuid;

  INSERT INTO sample_shipments (
    client_id, prospect_id, recipient_name, contact_name, shipped_date, delivery_date,
    purpose, return_required, return_due_date, carrier, tracking, shipping_cost,
    follow_up_date, notes, omaggio, source, mcp_token_hash
  ) VALUES (
    nullif(p_shipment->>'client_id', '')::uuid,
    v_prospect,
    trim(p_shipment->>'recipient_name'),
    nullif(trim(p_shipment->>'contact_name'), ''),
    v_shipped,
    nullif(p_shipment->>'delivery_date', ''),
    v_purpose,
    v_return,
    v_due,
    nullif(trim(p_shipment->>'carrier'), ''),
    nullif(trim(p_shipment->>'tracking'), ''),
    coalesce(nullif(p_shipment->>'shipping_cost', '')::numeric, 0),
    nullif(p_shipment->>'follow_up_date', ''),
    nullif(trim(p_shipment->>'notes'), ''),
    v_omaggio,
    'claude-mcp',
    p_token_hash
  ) RETURNING id INTO v_id;

  INSERT INTO sample_items (
    shipment_id, sp, description, category, color, size, quantity,
    unit_cost, unit_price, returned, position, outcome, revision_requested
  )
  SELECT v_id,
         nullif(trim(it->>'sp'), ''),
         nullif(trim(it->>'description'), ''),
         nullif(trim(it->>'category'), ''),
         nullif(trim(it->>'color'), ''),
         nullif(trim(it->>'size'), ''),
         (it->>'quantity')::int,
         coalesce(nullif(it->>'unit_cost', '')::numeric, 0),
         coalesce(nullif(it->>'unit_price', '')::numeric, 0),
         false,
         (ord - 1)::int,
         'in_attesa',
         false
  FROM jsonb_array_elements(p_items) WITH ORDINALITY AS t(it, ord);

  -- Come nell'app: un invio a un prospect al primo contatto lo porta a 'sample' (solo in avanti).
  IF v_prospect IS NOT NULL THEN
    UPDATE prospects SET stage = 'sample' WHERE id = v_prospect AND stage = 'contatto';
  END IF;

  INSERT INTO mcp_audit_log (tool, shipment_id, payload, outcome)
  VALUES ('crea_invio_campioni', v_id, jsonb_build_object('shipment', p_shipment, 'items', p_items), 'ok');

  RETURN v_id;
END;
$$;

-- Eseguibile solo dal server (service role), non dal browser.
REVOKE ALL ON FUNCTION create_sample_shipment(jsonb, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_sample_shipment(jsonb, jsonb, text) TO service_role;
