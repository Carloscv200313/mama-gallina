-- The quick charge flow supports cash, Yape and Plin.

do $$
declare
  constraint_name text;
begin
  select conname
    into constraint_name
  from pg_constraint
  where conrelid = 'public.payments'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%operation_number%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.payments drop constraint %I', constraint_name);
  end if;
end;
$$;

alter table public.payments
  drop constraint if exists payments_method_check;

alter table public.payments
  add constraint payments_method_check check (method in ('cash', 'yape', 'plin', 'bank_transfer'));

alter table public.payment_methods
  drop constraint if exists payment_methods_code_check;

alter table public.payment_methods
  drop constraint if exists payment_methods_code_check1;

alter table public.payment_methods
  add constraint payment_methods_code_check check (code in ('cash', 'yape', 'plin', 'bank_transfer'));

insert into public.payment_methods (branch_id, code, name)
select id, 'yape', 'Yape'
from public.branches
on conflict (branch_id, code) do update set name = excluded.name;
