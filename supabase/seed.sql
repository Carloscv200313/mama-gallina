-- Safe, repeatable development seed. It never creates auth credentials.

insert into public.branches (code, name, slug)
values ('MAIN', 'Mamá Gallina - Local principal', 'mama-gallina-principal')
on conflict (code) do update set name = excluded.name, slug = excluded.slug;

insert into public.roles (key, name, description)
values
  ('admin', 'Administrador', 'Acceso total al sistema'),
  ('waiter', 'Mozo', 'Atención de mesas y creación de pedidos'),
  ('kitchen', 'Cocina', 'Preparación y estados de cocina'),
  ('cashier', 'Cajero', 'Cobros y control de caja')
on conflict (key) do update set name = excluded.name, description = excluded.description;

with branch as (select id from public.branches where code = 'MAIN')
insert into public.categories (branch_id, name, slug, sort_order)
select branch.id, source.name, source.slug, source.sort_order
from branch
cross join (values
  ('Caldo', 'caldos', 10),
  ('Alitas', 'alitas', 20),
  ('Bebidas', 'bebidas', 30),
  ('Extras', 'extras', 40)
) as source(name, slug, sort_order)
on conflict (branch_id, slug) do update set name = excluded.name, sort_order = excluded.sort_order;

with branch as (select id from public.branches where code = 'MAIN')
insert into public.products (
  branch_id, category_id, code, name, slug, description, sale_price,
  estimated_cost, preparation_minutes, allows_modifiers, requires_kitchen, sort_order
)
select branch.id, categories.id, source.code, source.name, source.slug, source.description,
  source.sale_price, source.estimated_cost, source.preparation_minutes,
  source.allows_modifiers, source.requires_kitchen, source.sort_order
from branch
join public.categories on categories.branch_id = branch.id
cross join (values
  ('CAL-GAL', 'Caldo de gallina', 'caldo-de-gallina', 'Caldo tradicional de gallina.', 14.00::numeric, 5.00::numeric, 15, true, true, 10),
  ('CAL-COR', 'Caldo de cordero', 'caldo-de-cordero', 'Caldo casero de cordero.', 15.00::numeric, 6.00::numeric, 18, false, true, 20),
  ('CAL-MOT', 'Caldo de mote', 'caldo-de-mote', 'Caldo reconfortante con mote.', 15.00::numeric, 5.50::numeric, 18, false, true, 30),
  ('CAL-COM', 'Caldo combinado', 'caldo-combinado', 'Caldo combinado de la casa.', 15.00::numeric, 6.50::numeric, 18, false, true, 35),
  ('CAL-ACE', 'Caldo acevichado', 'caldo-acevichado', 'Caldo con el toque acevichado de la casa.', 17.00::numeric, 7.00::numeric, 20, true, true, 40),
  ('ALI-BASE', 'Alitas', 'alitas', 'Alitas crocantes con sabores a elección.', 12.00::numeric, 5.00::numeric, 20, true, true, 50),
  ('BEB-CHI-VAS', 'Vaso de chicha', 'vaso-de-chicha', null, 2.50::numeric, 0.80::numeric, 3, false, false, 60),
  ('BEB-CHI-MED', '1/2 litro de chicha', 'medio-litro-de-chicha', null, 5.00::numeric, 1.50::numeric, 3, false, false, 70),
  ('BEB-CHI-LIT', '1 litro de chicha', 'litro-de-chicha', null, 9.00::numeric, 2.60::numeric, 3, false, false, 80),
  ('BEB-GAS-PER', 'Gaseosa personal', 'gaseosa-personal', null, 4.00::numeric, 1.50::numeric, 3, false, false, 90),
  ('BEB-GOR', 'Gordita', 'gordita', null, 5.00::numeric, 2.00::numeric, 3, false, false, 100),
  ('BEB-GAS-1L', '1 litro de Coca-Cola o Inca Kola', 'gaseosa-1-litro', null, 7.00::numeric, 3.20::numeric, 3, false, false, 110),
  ('BEB-GAS-15', '1.5 litros de Coca-Cola o Inca Kola', 'gaseosa-1-5-litros', null, 9.00::numeric, 4.50::numeric, 3, false, false, 120),
  ('BEB-GAS-3L', '3 litros de Coca-Cola o Inca Kola', 'gaseosa-3-litros', null, 13.00::numeric, 6.00::numeric, 3, false, false, 130),
  ('EXT-SP', 'Salchipapa', 'salchipapa', null, 8.00::numeric, 3.50::numeric, 12, false, true, 140),
  ('EXT-SA', 'Salchialitas', 'salchialitas', null, 14.00::numeric, 6.00::numeric, 15, false, true, 150),
  ('EXT-YU', 'Yuquitas', 'yuquitas', null, 5.00::numeric, 2.00::numeric, 10, false, true, 160)
) as source(code, name, slug, description, sale_price, estimated_cost, preparation_minutes, allows_modifiers, requires_kitchen, sort_order)
where categories.slug = case when source.code like 'CAL-%' then 'caldos' when source.code like 'ALI-%' then 'alitas' when source.code like 'BEB-%' then 'bebidas' else 'extras' end
on conflict (branch_id, code) do update set
  name = excluded.name,
  sale_price = excluded.sale_price,
  estimated_cost = excluded.estimated_cost,
  preparation_minutes = excluded.preparation_minutes,
  allows_modifiers = excluded.allows_modifiers,
  requires_kitchen = excluded.requires_kitchen,
  sort_order = excluded.sort_order;

with branch as (select id from public.branches where code = 'MAIN'), product as (select products.id from public.products join branch on branch.id = products.branch_id where products.code = 'ALI-BASE')
insert into public.product_variants (branch_id, product_id, sku, name, sale_price, estimated_cost, max_flavors, sort_order)
select branch.id, product.id, source.sku, source.name, source.sale_price, source.estimated_cost, source.max_flavors, source.sort_order
from branch cross join product cross join (values
  ('ALI-4', '4 alitas', 12.00::numeric, 5.00::numeric, 1, 10),
  ('ALI-6', '6 alitas', 17.00::numeric, 7.00::numeric, 1, 20),
  ('ALI-8', '8 alitas', 22.00::numeric, 9.00::numeric, 2, 30),
  ('ALI-10', '10 alitas', 27.00::numeric, 11.00::numeric, 2, 40),
  ('ALI-12', '12 alitas', 32.00::numeric, 13.00::numeric, 3, 50)
) as source(sku, name, sale_price, estimated_cost, max_flavors, sort_order)
on conflict (branch_id, sku) do update set sale_price = excluded.sale_price, max_flavors = excluded.max_flavors;

with branch as (select id from public.branches where code = 'MAIN')
insert into public.modifier_groups (branch_id, name, description, selection_mode, is_required, min_selections, max_selections)
select branch.id, source.name, source.description, source.selection_mode, source.is_required, source.min_selections, source.max_selections
from branch cross join (values
  ('Acompañamiento', 'Personaliza tu plato.', 'single', false, 0, 1),
  ('Preferencias', 'Indica el nivel de picante.', 'single', false, 0, 1),
  ('Sabores de alitas', 'Selecciona los sabores permitidos por la variante.', 'multiple', true, 1, 3),
  ('Extras', 'Añade complementos a tu pedido.', 'multiple', false, 0, 5),
  ('Presa', 'Elige la presa para tu caldo.', 'single', true, 1, 1)
) as source(name, description, selection_mode, is_required, min_selections, max_selections)
on conflict (branch_id, name) do update set
  description = excluded.description,
  selection_mode = excluded.selection_mode,
  is_required = excluded.is_required,
  min_selections = excluded.min_selections,
  max_selections = excluded.max_selections;

with branch as (select id from public.branches where code = 'MAIN'), groups as (select modifier_groups.id, modifier_groups.name from public.modifier_groups join branch on branch.id = modifier_groups.branch_id)
update public.modifier_options
set status = 'inactive'
from groups
where modifier_options.modifier_group_id = groups.id
  and groups.name = 'Preferencias'
  and modifier_options.name not in ('Picante normal', 'Muy picante');

with branch as (select id from public.branches where code = 'MAIN'), groups as (select modifier_groups.id, modifier_groups.name from public.modifier_groups join branch on branch.id = modifier_groups.branch_id)
insert into public.modifier_options (branch_id, modifier_group_id, name, additional_price, sort_order)
select branch.id, groups.id, source.name, source.additional_price, source.sort_order
from branch join groups on true
join (values
  ('Acompañamiento', 'Con arroz', 0.00::numeric, 10),
  ('Acompañamiento', 'Sin arroz', 0.00::numeric, 20),
  ('Acompañamiento', 'Arroz separado', 0.00::numeric, 30),
  ('Preferencias', 'Picante normal', 0.00::numeric, 40),
  ('Preferencias', 'Muy picante', 0.00::numeric, 50),
  ('Sabores de alitas', 'BBQ', 0.00::numeric, 90),
  ('Sabores de alitas', 'Crispy', 0.00::numeric, 100),
  ('Sabores de alitas', 'Búfalo', 0.00::numeric, 110),
  ('Sabores de alitas', 'Maracuyá', 0.00::numeric, 120),
  ('Sabores de alitas', 'Acevichadas', 0.00::numeric, 130),
  ('Extras', 'Arroz adicional', 2.00::numeric, 140),
  ('Extras', 'Presa adicional', 5.00::numeric, 150),
  ('Extras', 'Huevo adicional', 2.00::numeric, 160),
  ('Extras', 'Mote adicional', 2.00::numeric, 170),
  ('Extras', 'Yuca adicional', 2.00::numeric, 180),
  ('Presa', 'Pierna', 0.00::numeric, 190),
  ('Presa', 'Pecho', 0.00::numeric, 200),
  ('Presa', 'Alas', 0.00::numeric, 210),
  ('Presa', 'Rabadillas', 0.00::numeric, 220),
  ('Presa', 'Encuentro', 0.00::numeric, 230)
) as source(group_name, name, additional_price, sort_order) on source.group_name = groups.name
on conflict (modifier_group_id, name) do update set additional_price = excluded.additional_price;

with branch as (select id from public.branches where code = 'MAIN'), products as (select product_row.id, product_row.code from public.products as product_row join branch on branch.id = product_row.branch_id), groups as (select modifier_groups.id, modifier_groups.name from public.modifier_groups join branch on branch.id = modifier_groups.branch_id)
insert into public.product_modifier_groups (branch_id, product_id, modifier_group_id, max_selections_override)
select branch.id, products.id, groups.id, case when groups.name = 'Sabores de alitas' then 3 else null end
from branch cross join products cross join groups
where (products.code in ('CAL-GAL', 'CAL-ACE') and groups.name in ('Acompañamiento', 'Preferencias', 'Extras'))
   or (products.code = 'ALI-BASE' and groups.name in ('Sabores de alitas', 'Extras'))
   or (products.code in ('CAL-GAL', 'CAL-ACE') and groups.name = 'Presa')
on conflict (product_id, modifier_group_id) do nothing;

with branch as (select id from public.branches where code = 'MAIN')
insert into public.tables (branch_id, table_number, name, capacity, position_x, position_y)
select branch.id, series.number, 'Mesa ' || series.number, 4, ((series.number - 1) % 4) * 180, ((series.number - 1) / 4) * 150
from branch cross join generate_series(1, 12) as series(number)
on conflict (branch_id, table_number) do update set name = excluded.name, position_x = excluded.position_x, position_y = excluded.position_y;

with branch as (select id from public.branches where code = 'MAIN')
insert into public.payment_methods (branch_id, code, name)
select branch.id, source.code, source.name
from branch cross join (values
  ('cash', 'Efectivo'),
  ('plin', 'Plin'),
  ('bank_transfer', 'Transferencia bancaria')
) as source(code, name)
on conflict (branch_id, code) do update set name = excluded.name;

with branch as (select id from public.branches where code = 'MAIN')
insert into public.expense_categories (branch_id, name)
select branch.id, source.name
from branch cross join (values
  ('Ingredientes'), ('Gas'), ('Agua'), ('Electricidad'), ('Limpieza'),
  ('Mantenimiento'), ('Sueldos'), ('Delivery'), ('Transporte'), ('Otros')
) as source(name)
on conflict (branch_id, name) do nothing;

with branch as (select id from public.branches where code = 'MAIN')
insert into public.settings (branch_id, key, value)
select branch.id, source.key, source.value::jsonb
from branch cross join (values
  ('kitchen_warning_minutes', '15'),
  ('kitchen_delay_minutes', '25'),
  ('allow_multiple_open_cash_sessions', 'false'),
  ('default_currency', '"PEN"')
) as source(key, value)
on conflict (branch_id, key) do update set value = excluded.value;
