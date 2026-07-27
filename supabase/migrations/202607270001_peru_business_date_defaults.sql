-- Las fechas operativas sin hora, como los gastos, deben usar el día de Lima.
-- Los timestamptz continúan guardándose en UTC y se convierten al mostrarse.
alter table public.expenses
  alter column expense_date set default ((now() at time zone 'America/Lima')::date);
