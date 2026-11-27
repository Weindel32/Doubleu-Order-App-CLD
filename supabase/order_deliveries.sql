-- Registro delle spedizioni di un ordine (bolle parziali), a livello di articolo.
-- orders.deliveries: [{ id, date: 'gg/mm/aaaa', articles: [uuid articolo], created_at }]
-- save_order_atomic non tocca questa colonna (aggiorna solo le sue): salvare l'ordine non la cancella.
-- articles.delivered resta il segno "spedito" usato da tutta l'app: le due funzioni lo tengono allineato.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deliveries jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Registra una spedizione: aggiunge la voce, segna spediti i suoi articoli e, se l'ordine
-- non ha ancora una data di spedizione, usa questa. Solo articoli dell'ordine.
CREATE OR REPLACE FUNCTION public.record_delivery(p_order_id text, p_date text, p_article_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
  v_ids uuid[];
  v_list jsonb;
begin
  select coalesce(array_agg(a.id), '{}') into v_ids
  from articles a join kits k on k.id = a.kit_id
  where k.order_id = p_order_id and a.id = any(p_article_ids);
  if cardinality(v_ids) = 0 then raise exception 'Nessun articolo di questo ordine'; end if;

  update articles set delivered = true where id = any(v_ids);

  update orders set
    deliveries = coalesce(deliveries, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'id', gen_random_uuid(), 'date', p_date, 'articles', to_jsonb(v_ids), 'created_at', now())),
    shipped_date = coalesce(shipped_date, p_date)
  where id = p_order_id
  returning deliveries into v_list;
  if v_list is null then raise exception 'Ordine % non trovato', p_order_id; end if;
  return v_list;
end;
$function$;

-- Annulla una spedizione registrata per errore: toglie la voce e rimette "da spedire"
-- i suoi articoli, tranne quelli presenti anche in un'altra spedizione.
CREATE OR REPLACE FUNCTION public.remove_delivery(p_order_id text, p_delivery_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
  v_removed jsonb;
  v_list jsonb;
begin
  select d into v_removed from orders o, jsonb_array_elements(o.deliveries) d
  where o.id = p_order_id and d->>'id' = p_delivery_id;
  if v_removed is null then raise exception 'Spedizione non trovata'; end if;

  update orders set deliveries = coalesce(
    (select jsonb_agg(d) from jsonb_array_elements(deliveries) d where d->>'id' <> p_delivery_id), '[]'::jsonb)
  where id = p_order_id
  returning deliveries into v_list;

  update articles a set delivered = false
  from kits k
  where k.id = a.kit_id and k.order_id = p_order_id
    and a.id::text in (select jsonb_array_elements_text(v_removed->'articles'))
    and a.id::text not in (select jsonb_array_elements_text(d->'articles') from jsonb_array_elements(v_list) d);
  return v_list;
end;
$function$;
