-- Salvataggio atomico di ordine + kit + articoli + pagamenti.
-- Kit e articoli si riscrivono da capo, nello stesso ordine in cui arrivano (l'ordine conta:
-- il modulo taglie ritrova gli articoli anche per posizione), ma riusano il loro id quando il
-- client lo manda e apparteneva gia' a questo ordine. Cosi' la Production Sheet, che collega
-- le schede all'id dell'articolo, non perde il collegamento a ogni salvataggio.
-- Un id sconosciuto, di un altro ordine o ripetuto nello stesso salvataggio (articolo duplicato)
-- genera un id nuovo. Senza id (client vecchio) il comportamento e' quello di prima.
-- Id dal client: uuid valido o null (gli id temporanei del browser non sono uuid).
CREATE OR REPLACE FUNCTION public.try_uuid(p text)
 RETURNS uuid
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
begin
  return p::uuid;
exception when others then
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.save_order_atomic(p_order jsonb, p_kits jsonb, p_payments jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  v_order_id text := p_order->>'id';
  v_kit jsonb;
  v_article jsonb;
  v_kit_id uuid;
  v_article_id uuid;
  v_position int := 0;
  v_old_kits uuid[];
  v_old_articles uuid[];
  v_used uuid[] := '{}';
begin
  if v_order_id is null or v_order_id = '' then
    raise exception 'save_order_atomic: order id is required';
  end if;

  insert into orders (
    id, client, client_email, client_phone, client_address, client_city, client_country, client_contact,
    date, delivery_date, shipped_date, actual_delivery_date, alert_days, status, pieces, pricing_mode,
    lost, lost_reason, lost_date, cancel_reason, cancel_date, converted_from_quote,
    kit_quantity, iva_enabled, iva_rate, shipping, discount_mode, discount_type, discount_value,
    order_note, invoice_number, notes, production_notes, show_total_in_client_pdf, order_type, client_id,
    standby, standby_reason, installments_granted
  )
  values (
    v_order_id,
    p_order->>'client', p_order->>'client_email', p_order->>'client_phone', p_order->>'client_address',
    p_order->>'client_city', coalesce(p_order->>'client_country','Italia'), p_order->>'client_contact',
    p_order->>'date', p_order->>'delivery_date', p_order->>'shipped_date', p_order->>'actual_delivery_date',
    coalesce((p_order->>'alert_days')::int, 7),
    coalesce(p_order->>'status','PREVENTIVO'),
    coalesce((p_order->>'pieces')::int, 0),
    coalesce(p_order->>'pricing_mode','singolo'),
    coalesce((p_order->>'lost')::boolean, false), p_order->>'lost_reason', p_order->>'lost_date',
    p_order->>'cancel_reason', p_order->>'cancel_date',
    coalesce((p_order->>'converted_from_quote')::boolean, false),
    (p_order->>'kit_quantity')::int,
    coalesce((p_order->>'iva_enabled')::boolean, false),
    coalesce((p_order->>'iva_rate')::numeric, 22),
    coalesce((p_order->>'shipping')::numeric, 0),
    coalesce(p_order->>'discount_mode','ordine'),
    coalesce(p_order->>'discount_type','percentuale'),
    coalesce((p_order->>'discount_value')::numeric, 0),
    p_order->>'order_note', p_order->>'invoice_number',
    coalesce(p_order->>'notes',''), coalesce(p_order->>'production_notes',''),
    coalesce((p_order->>'show_total_in_client_pdf')::boolean, false),
    coalesce(p_order->>'order_type','istituzionale'),
    nullif(p_order->>'client_id','')::uuid,
    coalesce((p_order->>'standby')::boolean, false), p_order->>'standby_reason',
    coalesce((p_order->>'installments_granted')::boolean, false)
  )
  on conflict (id) do update set
    client = excluded.client,
    client_email = excluded.client_email,
    client_phone = excluded.client_phone,
    client_address = excluded.client_address,
    client_city = excluded.client_city,
    client_country = excluded.client_country,
    client_contact = excluded.client_contact,
    date = excluded.date,
    delivery_date = excluded.delivery_date,
    shipped_date = excluded.shipped_date,
    actual_delivery_date = excluded.actual_delivery_date,
    alert_days = excluded.alert_days,
    status = excluded.status,
    pieces = excluded.pieces,
    pricing_mode = excluded.pricing_mode,
    lost = excluded.lost,
    lost_reason = excluded.lost_reason,
    lost_date = excluded.lost_date,
    cancel_reason = excluded.cancel_reason,
    cancel_date = excluded.cancel_date,
    converted_from_quote = excluded.converted_from_quote,
    kit_quantity = excluded.kit_quantity,
    iva_enabled = excluded.iva_enabled,
    iva_rate = excluded.iva_rate,
    shipping = excluded.shipping,
    discount_mode = excluded.discount_mode,
    discount_type = excluded.discount_type,
    discount_value = excluded.discount_value,
    order_note = excluded.order_note,
    invoice_number = excluded.invoice_number,
    notes = excluded.notes,
    production_notes = excluded.production_notes,
    show_total_in_client_pdf = excluded.show_total_in_client_pdf,
    order_type = excluded.order_type,
    client_id = coalesce(excluded.client_id, orders.client_id),
    standby = excluded.standby,
    standby_reason = excluded.standby_reason,
    -- Un client che non conosce il campo non deve azzerare una dilazione
    -- gia' registrata: si conserva il valore esistente quando manca dal payload.
    installments_granted = coalesce(
      (p_order->>'installments_granted')::boolean,
      orders.installments_granted,
      false
    );

  -- Id riusabili: solo quelli che questo ordine aveva prima del salvataggio.
  select coalesce(array_agg(id), '{}') into v_old_kits from kits where order_id = v_order_id;
  select coalesce(array_agg(a.id), '{}') into v_old_articles
    from articles a join kits k on k.id = a.kit_id where k.order_id = v_order_id;

  delete from kits where order_id = v_order_id;

  for v_kit in select * from jsonb_array_elements(coalesce(p_kits, '[]'::jsonb))
  loop
    v_kit_id := try_uuid(v_kit->>'id');
    if v_kit_id is null or not (v_kit_id = any(v_old_kits)) or v_kit_id = any(v_used) then
      v_kit_id := gen_random_uuid();
    end if;
    v_used := v_used || v_kit_id;

    insert into kits (id, order_id, name, price, quantity, position, discount_type, discount_value, omaggio)
    values (
      v_kit_id, v_order_id, v_kit->>'name', (v_kit->>'price')::numeric, (v_kit->>'quantity')::int, v_position,
      coalesce(v_kit->>'discount_type','percentuale'), coalesce((v_kit->>'discount_value')::numeric, 0),
      coalesce((v_kit->>'omaggio')::numeric, 0)
    );

    for v_article in select * from jsonb_array_elements(coalesce(v_kit->'articles', '[]'::jsonb))
    loop
      v_article_id := try_uuid(v_article->>'id');
      if v_article_id is null or not (v_article_id = any(v_old_articles)) or v_article_id = any(v_used) then
        v_article_id := gen_random_uuid();
      end if;
      v_used := v_used || v_article_id;

      insert into articles (
        id, kit_id, sp, category, line, description, color, price, notes, delivered, omaggio,
        discount_type, discount_value, sizes_adult, sizes_kids
      ) values (
        v_article_id, v_kit_id, v_article->>'sp', v_article->>'category', v_article->>'line', v_article->>'description',
        v_article->>'color', (v_article->>'price')::numeric, v_article->>'notes',
        coalesce((v_article->>'delivered')::boolean, false),
        coalesce((v_article->>'omaggio')::int, 0),
        coalesce(v_article->>'discount_type','percentuale'), coalesce((v_article->>'discount_value')::numeric, 0),
        coalesce(v_article->'sizes_adult', '{}'::jsonb),
        coalesce(v_article->'sizes_kids', '{}'::jsonb)
      );
    end loop;

    v_position := v_position + 1;
  end loop;

  perform save_order_payments(v_order_id, p_payments);
end;
$function$;
