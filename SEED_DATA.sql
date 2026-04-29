-- ================================================================
-- SEED DATA - Importa i dati mock esistenti in Supabase
-- Esegui questo nel SQL Editor di Supabase
-- ================================================================

-- ----------------------------------------------------------------
-- MIGRATION: quantità per-kit (esegui una volta sola)
-- ----------------------------------------------------------------
ALTER TABLE kits ADD COLUMN IF NOT EXISTS quantity integer;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS estimated_qty integer;
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

