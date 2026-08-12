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
-- purpose: 'valutazione' | 'misurazione' | 'fiera' | 'omaggio'
--          'misurazione' (set taglie) implica sempre return_required
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
      purpose         text    DEFAULT 'valutazione',
      return_required boolean DEFAULT false,
      return_due_date text,
      returned_date   text,
      carrier         text,
      tracking        text,
      shipping_cost   numeric DEFAULT 0,
      follow_up_date  text,
      notes           text,
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
      outcome_order_id  %s REFERENCES orders(id) ON DELETE SET NULL
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

