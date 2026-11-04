-- Numero fattura per singolo pagamento.
-- Acconto, saldo e rate si fatturano spesso separatamente: un solo numero
-- sull'ordine faceva puntare tutti i pagamenti alla prima fattura emessa.
-- orders.invoice_number resta come storico, non si modifica piu' dall'app.

alter table public.payments add column if not exists invoice_number text;

-- Migrazione: il numero dell'ordine va sui pagamenti gia' incassati; se
-- l'ordine non ha ancora incassi, sul primo acconto (in mancanza, sul primo
-- pagamento). Si tocca solo chi non ha gia' un numero.
with src as (
  select id as order_id, nullif(trim(invoice_number), '') as inv
    from orders
   where nullif(trim(invoice_number), '') is not null
),
paid_targets as (
  select p.id, s.inv
    from payments p join src s on s.order_id = p.order_id
   where p.paid
),
first_targets as (
  select distinct on (p.order_id) p.id, s.inv
    from payments p join src s on s.order_id = p.order_id
   where not exists (select 1 from payments q where q.order_id = p.order_id and q.paid)
   order by p.order_id, (p.type = 'acconto') desc, p.date nulls last, p.id
)
update payments p
   set invoice_number = t.inv
  from (select * from paid_targets union all select * from first_targets) t
 where p.id = t.id
   and nullif(trim(p.invoice_number), '') is null;

CREATE OR REPLACE FUNCTION public.save_order_payments(p_order_id text, p_payments jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  v_payment jsonb;
  v_prev jsonb;
  v_prev_inv jsonb;
  v_id text;
  v_verified boolean;
  v_invoice text;
begin
  select coalesce(jsonb_object_agg(id, paid_date_verified), '{}'::jsonb)
    into v_prev
    from payments
   where order_id = p_order_id
     and paid_date_verified is not null;

  select coalesce(jsonb_object_agg(id, invoice_number), '{}'::jsonb)
    into v_prev_inv
    from payments
   where order_id = p_order_id
     and invoice_number is not null;

  delete from payments where order_id = p_order_id;

  for v_payment in select * from jsonb_array_elements(coalesce(p_payments, '[]'::jsonb))
  loop
    v_id := coalesce(v_payment->>'id', gen_random_uuid()::text);

    -- Precedenza: valore inviato dal client, poi quello che la rata aveva
    -- prima, poi true (una rata nuova nasce con una data registrata).
    if v_payment ? 'paid_date_verified' and v_payment->>'paid_date_verified' is not null then
      v_verified := (v_payment->>'paid_date_verified')::boolean;
    elsif v_prev ? v_id and v_prev->>v_id is not null then
      v_verified := (v_prev->>v_id)::boolean;
    else
      v_verified := true;
    end if;

    -- Un client che non conosce il campo non deve cancellare il numero
    -- fattura gia' registrato: se la chiave manca si conserva il precedente.
    if v_payment ? 'invoice_number' then
      v_invoice := nullif(trim(v_payment->>'invoice_number'), '');
    else
      v_invoice := v_prev_inv->>v_id;
    end if;

    insert into payments (
      id, order_id, type, amount, date, method, note, paid,
      due_mode, due_offset_days, paid_date, paid_date_verified, invoice_number
    ) values (
      v_id, p_order_id, v_payment->>'type',
      (v_payment->>'amount')::numeric, v_payment->>'date', v_payment->>'method', v_payment->>'note',
      coalesce((v_payment->>'paid')::boolean, false),
      coalesce(v_payment->>'due_mode','fissa'),
      coalesce((v_payment->>'due_offset_days')::int, 0),
      v_payment->>'paid_date',
      v_verified,
      v_invoice
    );
  end loop;
end;
$function$;
