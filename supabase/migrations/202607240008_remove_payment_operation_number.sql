-- Payment evidence is sufficient for Plin and bank transfers in this POS.
-- Keep the historical column nullable, but stop requiring an operation number.

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
