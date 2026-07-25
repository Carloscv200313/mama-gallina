-- Limpia únicamente datos transaccionales del local MAIN.
-- No elimina productos, categorías, modificadores, mesas, roles ni configuración.
-- Este SQL no puede borrar imágenes de Cloudinary. Para eso usa:
-- pnpm cleanup:test -- --confirm

begin;

do $$
declare
  main_branch_id uuid;
begin
  select id into main_branch_id from public.branches where code = 'MAIN';
  if main_branch_id is null then
    raise exception 'No existe el local MAIN';
  end if;

  delete from public.cash_movements where branch_id = main_branch_id;
  delete from public.payment_evidences where branch_id = main_branch_id;
  delete from public.payments where branch_id = main_branch_id;
  delete from public.order_status_history where branch_id = main_branch_id;
  delete from public.order_item_modifiers where branch_id = main_branch_id;
  delete from public.order_items where branch_id = main_branch_id;
  delete from public.expenses where branch_id = main_branch_id;
  delete from public.orders where branch_id = main_branch_id and parent_order_id is not null;
  delete from public.orders where branch_id = main_branch_id and parent_order_id is null;
  delete from public.cash_sessions where branch_id = main_branch_id;
  delete from public.audit_logs where branch_id = main_branch_id;
end;
$$;

commit;
