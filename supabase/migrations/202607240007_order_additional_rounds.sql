-- Allow additional kitchen tickets to belong to the same table sale.

alter table public.orders
  add column if not exists parent_order_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_parent_order_id_fkey'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_parent_order_id_fkey
      foreign key (parent_order_id) references public.orders(id) on delete restrict;
  end if;
end;
$$;

create index if not exists orders_parent_order_idx
  on public.orders (parent_order_id, created_at);
