-- Add the per-plate chicken piece selector for the two broth products.

with branch as (select id from public.branches where code = 'MAIN')
insert into public.modifier_groups (branch_id, name, description, selection_mode, is_required, min_selections, max_selections)
select branch.id, 'Presa', 'Elige la presa para tu caldo.', 'single', true, 1, 1
from branch
on conflict (branch_id, name) do update set
  description = excluded.description,
  selection_mode = excluded.selection_mode,
  is_required = excluded.is_required,
  min_selections = excluded.min_selections,
  max_selections = excluded.max_selections;

with branch as (select id from public.branches where code = 'MAIN'),
group_row as (select modifier_groups.id from public.modifier_groups join branch on branch.id = modifier_groups.branch_id where modifier_groups.name = 'Presa')
insert into public.modifier_options (branch_id, modifier_group_id, name, additional_price, sort_order)
select branch.id, group_row.id, source.name, 0, source.sort_order
from branch cross join group_row cross join (values
  ('Pierna', 190),
  ('Pecho', 200),
  ('Alas', 210),
  ('Rabadillas', 220),
  ('Encuentro', 230)
) as source(name, sort_order)
on conflict (modifier_group_id, name) do update set additional_price = excluded.additional_price, sort_order = excluded.sort_order;

with branch as (select id from public.branches where code = 'MAIN'),
products as (select products.id, products.code from public.products join branch on branch.id = products.branch_id where products.code in ('CAL-GAL', 'CAL-ACE')),
group_row as (select modifier_groups.id from public.modifier_groups join branch on branch.id = modifier_groups.branch_id where modifier_groups.name = 'Presa')
insert into public.product_modifier_groups (branch_id, product_id, modifier_group_id, sort_order)
select branch.id, products.id, group_row.id, 5
from branch cross join products cross join group_row
on conflict (product_id, modifier_group_id) do nothing;
