-- ================================================================
-- SEED DATA - Importa i dati mock esistenti in Supabase
-- Esegui questo nel SQL Editor di Supabase
-- ================================================================

-- ----------------------------------------------------------------
-- MIGRATION: quantità per-kit (esegui una volta sola)
-- ----------------------------------------------------------------
ALTER TABLE kits ADD COLUMN IF NOT EXISTS quantity integer;
-- ----------------------------------------------------------------

-- ----------------------------------------------------------------
-- MIGRATION: provincia cliente (esegui una volta sola)
-- ----------------------------------------------------------------
ALTER TABLE clients ADD COLUMN IF NOT EXISTS province text;
-- ----------------------------------------------------------------

-- ----------------------------------------------------------------
-- MIGRATION: codice fiscale cliente (esegui una volta sola)
-- ----------------------------------------------------------------
ALTER TABLE clients ADD COLUMN IF NOT EXISTS fiscal_code text;
-- ----------------------------------------------------------------

-- ----------------------------------------------------------------
-- MIGRATION: articoli in omaggio (esegui una volta sola)
-- ----------------------------------------------------------------
ALTER TABLE articles ADD COLUMN IF NOT EXISTS omaggio integer DEFAULT 0;
-- ----------------------------------------------------------------

-- ----------------------------------------------------------------
-- MIGRATION: annullamento ordine — motivo e data (esegui una volta sola)
-- ----------------------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_reason text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_date text;
-- ----------------------------------------------------------------

-- ----------------------------------------------------------------
-- MIGRATION: data reale di spedizione (esegui una volta sola)
-- shipped_date: quando la merce e' realmente partita, distinta da
-- actual_delivery_date (quando e' stata consegnata al cliente).
-- Formato testo gg/mm/aaaa come le altre date ordine.
-- ----------------------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_date text;
-- ----------------------------------------------------------------

-- ----------------------------------------------------------------
-- MIGRATION: scadenze pagamento ancorate e data di incasso reale
-- (esegui una volta sola)
-- due_mode: 'fissa' (scadenza digitata a mano, campo date)
--         | 'consegna' (scadenza = consegna reale + due_offset_days)
-- paid_date: quando i soldi sono arrivati davvero, distinta dalla
-- scadenza. Serve a misurare il ritardo di pagamento per cliente.
-- ----------------------------------------------------------------
ALTER TABLE payments ADD COLUMN IF NOT EXISTS due_mode text DEFAULT 'fissa';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS due_offset_days integer DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_date text;

-- paid_date_verified: distingue una data di incasso registrata sapendo quando
-- i soldi sono arrivati da una ereditata dal backfill qui sotto, dove si e'
-- copiata la scadenza in mancanza di meglio. Le due sono altrimenti
-- indistinguibili, e senza il flag lo storico migrato fa apparire puntuali
-- clienti di cui non si sa nulla. Default true: chi scrive da qui in avanti
-- (Order App o Doubleu Finance) lo fa con una data reale.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_date_verified boolean DEFAULT true;

-- ----------------------------------------------------------------
-- MIGRATION: condizioni di pagamento concordate col cliente
-- (esegui una volta sola)
-- Non sono un giudizio sul cliente — quello si calcola dallo storico
-- incassi — ma un accordo commerciale, e servono a precompilare le
-- rate di un ordine nuovo.
-- payment_balance_due_mode: 'consegna' (saldo alla consegna + N gg)
--                         | 'fissa' (data da concordare ordine per ordine)
-- ----------------------------------------------------------------
ALTER TABLE clients ADD COLUMN IF NOT EXISTS payment_deposit_percent numeric;
-- Soglia sotto la quale l'acconto non si chiede: su un ordine da venti euro
-- non ha senso, e un avviso di deroga che scatta su ogni ordine piccolo e' un
-- avviso che si smette di leggere.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS payment_deposit_min_amount numeric;

-- ----------------------------------------------------------------
-- MIGRATION: scadenza ancorata alla conferma ordine (una volta sola)
-- payments.due_mode accetta ora anche 'ordine': la scadenza parte dalla
-- data dell'ordine invece che dalla consegna, per i clienti che pagano
-- in anticipo. Senza, quel patto si poteva esprimere solo come
-- "acconto 100%", che non e' un acconto ma l'intero importo.
-- compute_payment_due_date prende un parametro in piu' (p_order_date) e
-- i trigger sono aggiornati di conseguenza: vedi la migrazione Supabase
-- payment_due_mode_ordine.
-- ----------------------------------------------------------------
ALTER TABLE clients ADD COLUMN IF NOT EXISTS payment_deposit_offset_days integer DEFAULT 0;
-- ----------------------------------------------------------------
ALTER TABLE clients ADD COLUMN IF NOT EXISTS payment_balance_due_mode text DEFAULT 'consegna';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS payment_balance_offset_days integer DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS payment_notes text;

-- ----------------------------------------------------------------
-- MIGRATION: dilazione concessa sull'ordine (esegui una volta sola)
-- Segna che il saldo e' stato spezzato in piu' tranche su richiesta del
-- cliente. Non si deduce dal numero di rate: acconto piu' saldo sono due
-- rate per prassi, e tre rate possono essere pianificate dall'inizio.
-- ----------------------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS installments_granted boolean DEFAULT false;
-- ----------------------------------------------------------------
-- ----------------------------------------------------------------
-- NOTA: save_order_payments conserva paid_date_verified quando il client
-- non lo invia, altrimenti un'app non ancora aggiornata marcherebbe come
-- verificate le date ereditate dalla migrazione, una riga alla volta.
-- ----------------------------------------------------------------

-- Trigger che tengono payments.date sempre allineata alla scadenza effettiva
-- anche per le rate ancorate alla consegna (due_mode = 'consegna'): Doubleu
-- Finance legge questa tabella direttamente e scarta le rate senza data, e
-- una rata invisibile li' viene duplicata invece che chiusa. Le funzioni
-- compute_payment_due_date / payments_sync_due_date /
-- orders_sync_payment_due_dates sono applicate come migrazione Supabase
-- (payments_due_date_denormalized_trigger).
UPDATE payments SET paid_date = date WHERE paid = true AND paid_date IS NULL;
UPDATE payments SET paid_date_verified = false WHERE paid = true AND paid_date IS NOT NULL;
-- NOTA: il backfill sopra e' attendibile SOLO per le rate incassate da
-- Doubleu Finance, che gia' scriveva la data di incasso dentro date. Per
-- quelle spuntate a mano nella Order App, date era la scadenza: usare
-- scripts/backfill-order-app-paid-dates.mjs nel repo Finance per rimettere
-- le date reali dalle transazioni e azzerare le altre.
-- NOTA: anche la funzione save_order_atomic va aggiornata per scrivere
-- orders.shipped_date e le tre colonne qui sopra, altrimenti il salvataggio
-- di un ordine le azzera in silenzio.
-- ----------------------------------------------------------------

-- ----------------------------------------------------------------
-- MIGRATION: sconto ordine/preventivo (esegui una volta sola)
-- discount_type: 'percentuale' (% sul subtotale) | 'importo' (€ fissi)
-- ----------------------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_type text DEFAULT 'percentuale';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_value numeric DEFAULT 0;
-- ----------------------------------------------------------------

-- ----------------------------------------------------------------
-- MIGRATION: sconto per riga e nota ordine (esegui una volta sola)
-- discount_mode: 'nessuno' | 'ordine' (sul subtotale) | 'articolo'
-- (per articolo in pricing singolo, per kit in pricing kit)
-- order_note: nota in evidenza sul singolo ordine (es. chi ha
-- effettuato l'ordine per conto del cliente)
-- ----------------------------------------------------------------
ALTER TABLE orders   ADD COLUMN IF NOT EXISTS discount_mode text DEFAULT 'ordine';
ALTER TABLE orders   ADD COLUMN IF NOT EXISTS order_note text;
ALTER TABLE kits     ADD COLUMN IF NOT EXISTS discount_type text DEFAULT 'percentuale';
ALTER TABLE kits     ADD COLUMN IF NOT EXISTS discount_value numeric DEFAULT 0;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS discount_type text DEFAULT 'percentuale';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS discount_value numeric DEFAULT 0;
-- ----------------------------------------------------------------

-- ----------------------------------------------------------------
-- MIGRATION: registro campionature (esegui una volta sola)
--
-- Registra ogni invio di campioni a clienti acquisiti o prospect,
-- così non serve più ricostruire l'informazione dalle note.
--
-- purpose: 'valutazione' | 'misurazione' | 'fiera' | 'promozione'
--          'misurazione' (set taglie) implica sempre return_required
--          (fino alla migrazione più sotto esisteva anche 'omaggio',
--           poi diventato un attributo a sé: vedi omaggio boolean)
--
-- L'esito (outcome) vive sulla singola riga articolo, non
-- sull'invio: articoli diversi nello stesso invio possono avere
-- feedback diversi (es. la maglia piace, il pantaloncino no).
-- outcome: 'in_attesa' | 'positivo' | 'negativo' | 'preventivo' | 'ordine'
--
-- Ogni riga ha due valori economici distinti:
-- unit_cost  = prezzo di costo, base dell'investito reale di DOUBLEU
-- unit_price = prezzo al club/listino, riferimento per un eventuale
--              addebito in caso di danno o mancata restituzione
--
-- I tipi di client_id / prospect_id sono ricavati dalle tabelle
-- esistenti, così la migrazione funziona sia con id uuid sia bigint.
-- ----------------------------------------------------------------
DO $$
DECLARE
  cid_type text;
  pid_type text;
  oid_type text;
BEGIN
  SELECT data_type INTO cid_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients'   AND column_name = 'id';
  SELECT data_type INTO pid_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'prospects' AND column_name = 'id';
  SELECT data_type INTO oid_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders'    AND column_name = 'id';

  EXECUTE format($f$
    CREATE TABLE IF NOT EXISTS sample_shipments (
      id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id       %s REFERENCES clients(id)   ON DELETE SET NULL,
      prospect_id     %s REFERENCES prospects(id) ON DELETE SET NULL,
      recipient_name  text NOT NULL,
      contact_name    text,
      shipped_date    text NOT NULL,
      delivery_date   text,
      purpose         text    DEFAULT 'valutazione',
      return_required boolean DEFAULT false,
      return_due_date text,
      returned_date   text,
      carrier         text,
      tracking        text,
      shipping_cost   numeric DEFAULT 0,
      follow_up_date  text,
      notes           text,
      omaggio         boolean DEFAULT false,
      created_at      timestamptz DEFAULT now()
    )$f$, cid_type, pid_type);

  EXECUTE format($f$
    CREATE TABLE IF NOT EXISTS sample_items (
      id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      shipment_id       uuid REFERENCES sample_shipments(id) ON DELETE CASCADE,
      sp                text,
      description       text,
      category          text,
      color             text,
      size              text,
      quantity          integer DEFAULT 1,
      unit_cost         numeric DEFAULT 0,
      unit_price        numeric DEFAULT 0,
      returned          boolean DEFAULT false,
      position          integer DEFAULT 0,
      outcome           text    DEFAULT 'in_attesa',
      outcome_date      text,
      outcome_note      text,
      outcome_order_id  %s REFERENCES orders(id) ON DELETE SET NULL,
      revision_requested boolean DEFAULT false
    )$f$, oid_type);
END $$;

CREATE INDEX IF NOT EXISTS sample_shipments_client_idx   ON sample_shipments (client_id);
CREATE INDEX IF NOT EXISTS sample_shipments_prospect_idx ON sample_shipments (prospect_id);
CREATE INDEX IF NOT EXISTS sample_items_shipment_idx     ON sample_items (shipment_id);

ALTER TABLE sample_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sample_items     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sample_shipments_all ON sample_shipments;
CREATE POLICY sample_shipments_all ON sample_shipments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS sample_items_all ON sample_items;
CREATE POLICY sample_items_all ON sample_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- ----------------------------------------------------------------

-- ----------------------------------------------------------------
-- MIGRATION: omaggio come attributo, non come motivo (una volta sola)
--
-- Il motivo dell'invio e la sorte della merce sono due fatti
-- indipendenti: un invio può essere in valutazione — con l'obiettivo
-- di un ordine — e insieme regalato. Tenerli sullo stesso campo
-- costringeva a sceglierne uno solo e faceva perdere l'altro.
--
-- Gli invii già registrati come purpose='omaggio' diventano
-- omaggio=true con motivo 'promozione'. Il flag identifica esattamente
-- le righe convertite, quindi la migrazione è reversibile.
-- ----------------------------------------------------------------
ALTER TABLE sample_shipments ADD COLUMN IF NOT EXISTS omaggio boolean DEFAULT false;

UPDATE sample_shipments SET omaggio = true    WHERE purpose = 'omaggio';
UPDATE sample_shipments SET purpose = 'promozione' WHERE purpose = 'omaggio';
-- ----------------------------------------------------------------

-- ----------------------------------------------------------------
-- MIGRATION: data di consegna (esegui una volta sola)
--
-- Il cliente comincia a valutare quando riceve il pacco, non quando
-- parte: per una spedizione estera il transito può mangiarsi giorni
-- della finestra di follow-up. Se impostata, needsFollowUp() conta i
-- FOLLOW_UP_DAYS da qui invece che da shipped_date (vedi
-- followUpBaseDate in src/utils/samples.js); altrimenti il
-- comportamento resta quello di prima.
-- ----------------------------------------------------------------
ALTER TABLE sample_shipments ADD COLUMN IF NOT EXISTS delivery_date text;
-- ----------------------------------------------------------------

-- ----------------------------------------------------------------
-- MIGRATION: modulo taglie per il cliente (esegui una volta sola)
--
-- Il cliente riceve un link /m/<token> e compila solo le taglie degli
-- articoli dell'ordine: niente prezzi, niente login. Il token e' la
-- chiave (lungo e casuale, generato dall'app). Il cliente non tocca mai
-- le tabelle: legge e scrive solo attraverso le due funzioni qui sotto,
-- che lavorano sul singolo modulo e scartano qualunque taglia o riga
-- non prevista. Le taglie inviate restano nel modulo finche' non le
-- applichi tu dall'app: l'ordine non cambia senza la tua verifica.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_forms (
  token         text PRIMARY KEY CHECK (length(token) >= 20),
  order_id      text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  client_name   text,
  lines         jsonb NOT NULL DEFAULT '[]'::jsonb,
  sizes         jsonb NOT NULL DEFAULT '{}'::jsonb,
  contact_name  text,
  client_note   text,
  status        text NOT NULL DEFAULT 'aperto' CHECK (status IN ('aperto','inviato','applicato','revocato')),
  expires_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  submitted_at  timestamptz,
  applied_at    timestamptz
);
CREATE INDEX IF NOT EXISTS order_forms_order_idx ON order_forms (order_id);

ALTER TABLE order_forms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS order_forms_all ON order_forms;
CREATE POLICY order_forms_all ON order_forms
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Quello che il cliente vede del modulo: niente id interni oltre al
-- codice ordine, e "applicato" gli appare come "inviato".
CREATE OR REPLACE FUNCTION order_form_view(f order_forms)
RETURNS jsonb LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT jsonb_build_object(
    'client_name',  f.client_name,
    'order_id',     f.order_id,
    'lines',        f.lines,
    'sizes',        f.sizes,
    'contact_name', f.contact_name,
    'client_note',  f.client_note,
    'status',       CASE WHEN f.status = 'aperto' THEN 'aperto' ELSE 'inviato' END,
    'expired',      (f.expires_at IS NOT NULL AND f.expires_at < now()),
    'expires_at',   f.expires_at,
    'submitted_at', f.submitted_at
  )
$$;
REVOKE ALL ON FUNCTION order_form_view(order_forms) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION order_form_get(p_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE f order_forms;
BEGIN
  SELECT * INTO f FROM order_forms WHERE token = p_token AND status <> 'revocato';
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN order_form_view(f);
END $$;

CREATE OR REPLACE FUNCTION order_form_save(
  p_token text, p_sizes jsonb, p_contact text, p_note text, p_submit boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  f order_forms;
  ln jsonb; k text; grid text; sz text; v int;
  src jsonb; out_line jsonb; grid_obj jsonb; clean jsonb := '{}'::jsonb;
  adult_sizes text[] := ARRAY['XS','S','M','L','XL','XXL'];
  kids_sizes  text[] := ARRAY['4','6','8','10','12','14','16'];
BEGIN
  SELECT * INTO f FROM order_forms WHERE token = p_token FOR UPDATE;
  IF NOT FOUND OR f.status = 'revocato' THEN RAISE EXCEPTION 'modulo non disponibile'; END IF;
  IF f.status <> 'aperto' THEN RAISE EXCEPTION 'modulo gia inviato'; END IF;
  IF f.expires_at IS NOT NULL AND f.expires_at < now() THEN RAISE EXCEPTION 'modulo scaduto'; END IF;

  -- Solo le righe e le taglie previste dal modulo, interi 0..9999:
  -- quello che arriva dal browser del cliente non entra mai cosi' com'e'.
  FOR ln IN SELECT * FROM jsonb_array_elements(f.lines) LOOP
    k := ln->>'key';
    src := COALESCE(p_sizes->k, '{}'::jsonb);
    out_line := '{}'::jsonb;
    FOR grid IN SELECT jsonb_array_elements_text(COALESCE(ln->'grids', '[]'::jsonb)) LOOP
      IF grid = 'uni' THEN
        v := round(LEAST(GREATEST(COALESCE(CASE WHEN jsonb_typeof(src->'uni') = 'number' THEN (src->>'uni')::numeric END, 0), 0), 9999))::int;
        out_line := out_line || jsonb_build_object('uni', v);
      ELSIF grid IN ('adult','kids') THEN
        grid_obj := '{}'::jsonb;
        FOREACH sz IN ARRAY (CASE WHEN grid = 'adult' THEN adult_sizes ELSE kids_sizes END) LOOP
          v := round(LEAST(GREATEST(COALESCE(CASE WHEN jsonb_typeof(src->grid->sz) = 'number' THEN (src->grid->>sz)::numeric END, 0), 0), 9999))::int;
          grid_obj := grid_obj || jsonb_build_object(sz, v);
        END LOOP;
        out_line := out_line || jsonb_build_object(grid, grid_obj);
      END IF;
    END LOOP;
    clean := clean || jsonb_build_object(k, out_line);
  END LOOP;

  UPDATE order_forms SET
    sizes        = clean,
    contact_name = NULLIF(left(trim(COALESCE(p_contact, '')), 120), ''),
    client_note  = NULLIF(left(trim(COALESCE(p_note, '')), 2000), ''),
    status       = CASE WHEN p_submit THEN 'inviato' ELSE status END,
    submitted_at = CASE WHEN p_submit THEN now() ELSE submitted_at END,
    updated_at   = now()
  WHERE token = p_token
  RETURNING * INTO f;
  RETURN order_form_view(f);
END $$;

REVOKE ALL ON FUNCTION order_form_get(text) FROM public;
REVOKE ALL ON FUNCTION order_form_save(text, jsonb, text, text, boolean) FROM public;
GRANT EXECUTE ON FUNCTION order_form_get(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION order_form_save(text, jsonb, text, text, boolean) TO anon, authenticated;
-- ----------------------------------------------------------------

-- ORDINE 1: ECO VILLAGE
INSERT INTO orders VALUES ('DU-2026-0038','ECO VILLAGE','10/12/2025','28/02/2026',10,'CONSEGNATO',242,'kit','Cliente premium - priorità assoluta','Verde ECO pantone 356C. Logo fronte ricamato, retro stampa.',true,now());
INSERT INTO kits (order_id,name,price,position) VALUES ('DU-2026-0038','Kit Completo ECO Village',90,0);

-- ORDINE 2: MTC Ausstellungspark
INSERT INTO orders VALUES ('DU-2026-0034','MTC Ausstellungspark','09/06/2025','20/08/2025',14,'CONSEGNATO',160,'kit','Primo ordine cliente','Navy #1a2744 + Gold #b8965a. Logo fronte e retro.',true,now());
INSERT INTO kits (order_id,name,price,position) VALUES ('DU-2026-0034','Kit MTC Full',85,0);

-- ORDINE 3: MTC in produzione
INSERT INTO orders VALUES ('DU-2026-0031','MTC Ausstellungspark','20/12/2025','30/04/2026',7,'IN PRODUZIONE',30,'singolo','','Logo ricamato fronte sinistra.',false,now());
INSERT INTO kits (order_id,name,price,position) VALUES ('DU-2026-0031',null,null,0);

-- ORDINE 4: ALL ROUND
INSERT INTO orders VALUES ('DU-2026-0030','ALL ROUND Sport&Wellness','10/10/2025','15/12/2025',7,'CONSEGNATO',320,'singolo','','',true,now());
INSERT INTO kits (order_id,name,price,position) VALUES ('DU-2026-0030',null,null,0);

-- ORDINE 5: SNAUWAERT
INSERT INTO orders VALUES ('DU-2026-0040','SNAUWAERT','17/03/2026','15/04/2026',5,'CONSEGNATO',15,'singolo','','Piping bianco su manica raglan',true,now());
INSERT INTO kits (order_id,name,price,position) VALUES ('DU-2026-0040',null,null,0);

-- ORDINE 6: Paco Alcocer
INSERT INTO orders VALUES ('DU-2026-0028','Paco Alcocer','02/12/2025','20/01/2026',7,'CONSEGNATO',38,'singolo','','',true,now());
INSERT INTO kits (order_id,name,price,position) VALUES ('DU-2026-0028',null,null,0);

-- ORDINE 7: AL TENNIS
INSERT INTO orders VALUES ('DU-2026-0025','AL TENNIS','19/09/2025','15/11/2025',10,'CONSEGNATO',106,'singolo','','Verde lime su inserti laterali. Pantone 382C.',true,now());
INSERT INTO kits (order_id,name,price,position) VALUES ('DU-2026-0025',null,null,0);

-- ORDINE 8: Eco Village Kit Squadra (preventivo)
INSERT INTO orders VALUES ('DU-2026-0066','Eco Village (Kit Squadra)','14/04/2026','30/04/2026',7,'PREVENTIVO',12,'kit','Consegna entro fine aprile','Pantone ECO-verde 356C per tutti i loghi',false,now());
INSERT INTO kits (order_id,name,price,position) VALUES ('DU-2026-0066','Kit Completo ECO',90,0);

-- Aggiungi articoli per ogni kit (usa gli id dei kit appena inseriti)
-- Dopo aver eseguito gli INSERT sopra, esegui questo per vedere gli id:
-- SELECT id, order_id, name FROM kits ORDER BY order_id;
-- Poi aggiungi gli articoli manualmente dalla app usando "+ Nuovo Ordine"
-- oppure contatta il supporto per lo script completo degli articoli

