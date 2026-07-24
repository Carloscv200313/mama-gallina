-- Add the combined broth and keep plain broths free of modifiers.

with branch as (select id from public.branches where code = 'MAIN')
insert into public.products (
  branch_id, category_id, code, name, slug, description, sale_price,
  estimated_cost, preparation_minutes, allows_modifiers, requires_kitchen, sort_order
)
select branch.id, categories.id, 'CAL-COM', 'Caldo combinado', 'caldo-combinado',
  'Caldo combinado de la casa.', 15.00::numeric, 6.50::numeric, 18, false, true, 35
from branch
join public.categories on categories.branch_id = branch.id and categories.slug = 'caldos'
on conflict (branch_id, code) do update set
  name = excluded.name,
  slug = excluded.slug,
  description = excluded.description,
  sale_price = excluded.sale_price,
  estimated_cost = excluded.estimated_cost,
  preparation_minutes = excluded.preparation_minutes,
  allows_modifiers = excluded.allows_modifiers,
  requires_kitchen = excluded.requires_kitchen,
  sort_order = excluded.sort_order,
  is_active = true,
  is_available = true;

with branch as (select id from public.branches where code = 'MAIN')
update public.products
set allows_modifiers = false
where branch_id = (select id from branch)
  and code in ('CAL-COR', 'CAL-MOT', 'CAL-COM');

with branch as (select id from public.branches where code = 'MAIN')
delete from public.product_modifier_groups
where branch_id = (select id from branch)
  and product_id in (
    select id
    from public.products
    where branch_id = (select id from branch)
      and code in ('CAL-COR', 'CAL-MOT', 'CAL-COM')
  );
