-- Tempi di produzione dell'ordine: giorni lavorativi (null = 30) e primo giorno scritto a mano
-- (aaaa-mm-gg, null = dalla ricezione delle taglie dal modulo). save_order_atomic non li tocca:
-- si scrivono a parte, come la trattativa.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS production_days integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS production_start text;
