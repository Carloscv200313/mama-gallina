-- Keep only the two spice preferences for new orders.
-- Old options are made inactive instead of deleted to preserve historical orders.

with branch as (select id from public.branches where code = 'MAIN'),
preference_group as (
  select modifier_groups.id
  from public.modifier_groups
  join branch on branch.id = modifier_groups.branch_id
  where modifier_groups.name = 'Preferencias'
)
update public.modifier_options
set status = 'inactive'
from preference_group
where modifier_options.modifier_group_id = preference_group.id;

with branch as (select id from public.branches where code = 'MAIN'),
preference_group as (
  select modifier_groups.id
  from public.modifier_groups
  join branch on branch.id = modifier_groups.branch_id
  where modifier_groups.name = 'Preferencias'
)
insert into public.modifier_options (branch_id, modifier_group_id, name, additional_price, sort_order, status)
select branch.id, preference_group.id, source.name, 0, source.sort_order, 'active'
from branch
cross join preference_group
cross join (values
  ('Picante normal', 40),
  ('Muy picante', 50)
) as source(name, sort_order)
on conflict (modifier_group_id, name) do update set
  additional_price = excluded.additional_price,
  sort_order = excluded.sort_order,
  status = 'active';

update public.modifier_groups
set selection_mode = 'single',
    min_selections = 0,
    max_selections = 1
where name = 'Preferencias';

