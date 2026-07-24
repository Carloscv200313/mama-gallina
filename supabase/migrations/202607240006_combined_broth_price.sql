-- Set the combined broth sale price to S/ 15.00.

with branch as (select id from public.branches where code = 'MAIN')
update public.products
set sale_price = 15.00::numeric
where branch_id = (select id from branch)
  and code = 'CAL-COM';
