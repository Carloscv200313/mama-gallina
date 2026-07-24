-- Mamá Gallina POS - initial schema
-- Apply with Supabase CLI or paste into the Supabase SQL editor.

create extension if not exists pgcrypto;

create sequence if not exists public.order_code_seq;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  slug text not null unique,
  timezone text not null default 'America/Lima',
  currency text not null default 'PEN' check (currency = 'PEN'),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key in ('admin', 'waiter', 'kitchen', 'cashier')),
  name text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  branch_id uuid references public.branches(id),
  full_name text not null check (length(trim(full_name)) between 2 and 120),
  email text not null,
  phone text,
  avatar_url text,
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
  last_login_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  branch_id uuid references public.branches(id),
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, role_id, branch_id)
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (branch_id, key)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  image_url text,
  sort_order integer not null default 0 check (sort_order >= 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (branch_id, slug)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  code text not null,
  name text not null,
  slug text not null,
  description text,
  image_url text,
  sale_price numeric(12, 2) not null default 0 check (sale_price >= 0),
  estimated_cost numeric(12, 2) not null default 0 check (estimated_cost >= 0),
  preparation_minutes integer not null default 15 check (preparation_minutes between 0 and 1440),
  is_available boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  allows_modifiers boolean not null default false,
  requires_kitchen boolean not null default true,
  controls_stock boolean not null default false,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (branch_id, code),
  unique (branch_id, slug)
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null,
  name text not null,
  sale_price numeric(12, 2) not null check (sale_price >= 0),
  estimated_cost numeric(12, 2) not null default 0 check (estimated_cost >= 0),
  max_flavors integer check (max_flavors is null or max_flavors between 1 and 10),
  sort_order integer not null default 0 check (sort_order >= 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (branch_id, sku),
  unique (product_id, name)
);

create table if not exists public.modifier_groups (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  name text not null,
  description text,
  selection_mode text not null default 'single' check (selection_mode in ('single', 'multiple')),
  is_required boolean not null default false,
  min_selections integer not null default 0 check (min_selections >= 0),
  max_selections integer check (max_selections is null or max_selections >= min_selections),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (branch_id, name)
);

create table if not exists public.modifier_options (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  modifier_group_id uuid not null references public.modifier_groups(id) on delete cascade,
  name text not null,
  additional_price numeric(12, 2) not null default 0 check (additional_price >= 0),
  sort_order integer not null default 0 check (sort_order >= 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (modifier_group_id, name)
);

create table if not exists public.product_modifier_groups (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  modifier_group_id uuid not null references public.modifier_groups(id) on delete cascade,
  min_selections_override integer check (min_selections_override is null or min_selections_override >= 0),
  max_selections_override integer check (max_selections_override is null or max_selections_override >= 1),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (product_id, modifier_group_id)
);

create table if not exists public.tables (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  table_number integer not null check (table_number > 0),
  name text,
  capacity integer not null default 4 check (capacity between 1 and 100),
  position_x numeric(8, 2) not null default 0,
  position_y numeric(8, 2) not null default 0,
  is_active boolean not null default true,
  status text not null default 'available' check (status in ('available', 'out_of_service')),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (branch_id, table_number)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  order_code text not null default ('MG-' || lpad(nextval('public.order_code_seq')::text, 6, '0')),
  order_type text not null default 'dine_in' check (order_type in ('dine_in', 'takeaway')),
  table_id uuid references public.tables(id) on delete restrict,
  waiter_id uuid not null references public.profiles(id) on delete restrict,
  people_count integer check (people_count is null or people_count between 1 and 100),
  customer_name text,
  notes text,
  status text not null default 'draft' check (status in ('draft', 'confirmed', 'sent_to_kitchen', 'preparing', 'partially_ready', 'ready', 'delivered', 'payment_pending', 'paid', 'cancelled', 'partially_cancelled')),
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  discount_total numeric(12, 2) not null default 0 check (discount_total >= 0),
  total numeric(12, 2) not null default 0 check (total >= 0),
  payment_total numeric(12, 2) not null default 0 check (payment_total >= 0),
  balance_due numeric(12, 2) not null default 0 check (balance_due >= 0),
  idempotency_key uuid not null default gen_random_uuid(),
  opened_at timestamptz not null default timezone('utc', now()),
  sent_to_kitchen_at timestamptz,
  delivered_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (order_code),
  unique (branch_id, idempotency_key),
  check ((order_type = 'dine_in' and table_id is not null) or (order_type = 'takeaway' and table_id is null))
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete restrict,
  product_name_snapshot text not null,
  variant_name_snapshot text,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  estimated_cost_snapshot numeric(12, 2) not null default 0 check (estimated_cost_snapshot >= 0),
  quantity integer not null check (quantity > 0),
  modifiers_total numeric(12, 2) not null default 0 check (modifiers_total >= 0),
  line_total numeric(12, 2) not null check (line_total >= 0),
  notes text,
  priority text not null default 'normal' check (priority in ('normal', 'high')),
  status text not null default 'pending' check (status in ('pending', 'preparing', 'ready', 'delivered', 'cancelled')),
  sent_to_kitchen_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.order_item_modifiers (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  modifier_group_id uuid not null references public.modifier_groups(id) on delete restrict,
  modifier_option_id uuid not null references public.modifier_options(id) on delete restrict,
  group_name_snapshot text not null,
  option_name_snapshot text not null,
  additional_price numeric(12, 2) not null default 0 check (additional_price >= 0),
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (order_item_id, modifier_option_id)
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  from_status text,
  to_status text not null,
  changed_by uuid references public.profiles(id),
  reason text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  code text not null check (code in ('cash', 'plin', 'bank_transfer')),
  name text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (branch_id, code)
);

create table if not exists public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  cashier_id uuid not null references public.profiles(id) on delete restrict,
  opening_amount numeric(12, 2) not null check (opening_amount >= 0),
  expected_amount numeric(12, 2),
  counted_amount numeric(12, 2),
  difference numeric(12, 2),
  opening_note text,
  closing_note text,
  status text not null default 'open' check (status in ('open', 'closed', 'closed_with_difference')),
  opened_at timestamptz not null default timezone('utc', now()),
  closed_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check ((status = 'open' and closed_at is null) or (status <> 'open' and closed_at is not null))
);

create unique index if not exists one_open_cash_session_per_cashier_branch
  on public.cash_sessions (branch_id, cashier_id)
  where status = 'open';

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  cash_session_id uuid references public.cash_sessions(id) on delete restrict,
  method text not null check (method in ('cash', 'plin', 'bank_transfer')),
  amount numeric(12, 2) not null check (amount > 0),
  received_amount numeric(12, 2) check (received_amount is null or received_amount >= amount),
  change_amount numeric(12, 2) not null default 0 check (change_amount >= 0),
  currency text not null default 'PEN' check (currency = 'PEN'),
  operation_number text,
  idempotency_key uuid not null default gen_random_uuid(),
  status text not null default 'pending_evidence' check (status in ('pending_evidence', 'evidence_uploaded', 'pending_verification', 'verified', 'rejected', 'refunded')),
  notes text,
  rejection_reason text,
  registered_by uuid not null references public.profiles(id) on delete restrict,
  verified_by uuid references public.profiles(id) on delete restrict,
  registered_at timestamptz not null default timezone('utc', now()),
  verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (branch_id, idempotency_key),
  unique (branch_id, operation_number),
  check ((method = 'cash') or (operation_number is not null and length(trim(operation_number)) >= 4)),
  check ((method = 'cash') or status <> 'verified' or verified_by is not null)
);

create table if not exists public.payment_evidences (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  payment_id uuid not null unique references public.payments(id) on delete restrict,
  secure_url text not null,
  public_id text not null unique,
  file_sha256 text not null unique,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  format text not null,
  bytes integer not null check (bytes > 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  cash_session_id uuid not null references public.cash_sessions(id) on delete restrict,
  payment_id uuid references public.payments(id) on delete restrict,
  expense_id uuid,
  type text not null check (type in ('cash_sale', 'manual_entry', 'manual_exit', 'expense', 'refund', 'adjustment', 'withdrawal')),
  amount numeric(12, 2) not null check (amount > 0),
  note text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  unique (payment_id),
  unique (expense_id)
);

create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  name text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (branch_id, name)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  cash_session_id uuid references public.cash_sessions(id) on delete restrict,
  category_id uuid not null references public.expense_categories(id) on delete restrict,
  description text not null,
  amount numeric(12, 2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('cash', 'plin', 'bank_transfer')),
  expense_date date not null default current_date,
  responsible_id uuid not null references public.profiles(id) on delete restrict,
  receipt_url text,
  note text,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.cash_movements
  drop constraint if exists cash_movements_expense_id_fkey;
alter table public.cash_movements
  add constraint cash_movements_expense_id_fkey
  foreign key (expense_id) references public.expenses(id) on delete restrict;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.branches(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  reason text,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists profiles_branch_status_idx on public.profiles (branch_id, status);
create index if not exists user_roles_user_branch_idx on public.user_roles (user_id, branch_id);
create index if not exists products_branch_category_idx on public.products (branch_id, category_id, is_active);
create index if not exists orders_branch_status_idx on public.orders (branch_id, status, created_at desc);
create index if not exists orders_branch_table_idx on public.orders (branch_id, table_id, status);
create index if not exists order_items_order_status_idx on public.order_items (order_id, status);
create index if not exists payments_branch_status_idx on public.payments (branch_id, status, created_at desc);
create index if not exists cash_movements_session_idx on public.cash_movements (cash_session_id, created_at);
create index if not exists expenses_branch_date_idx on public.expenses (branch_id, expense_date desc);
create index if not exists audit_logs_branch_created_idx on public.audit_logs (branch_id, created_at desc);

create or replace function public.handle_new_user()
returns trigger
security definer set search_path = public
language plpgsql
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Usuario nuevo'),
    new.email
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.has_role(required_role text, target_branch_id uuid default null)
returns boolean
security definer set search_path = public
stable
language sql
as $$
  select exists (
    select 1
    from public.profiles p
    join public.user_roles ur on ur.user_id = p.id
    join public.roles r on r.id = ur.role_id
    where p.id = auth.uid()
      and p.status = 'active'
      and r.key = required_role
      and (
        target_branch_id is null
        or p.branch_id = target_branch_id
        or ur.branch_id = target_branch_id
        or ur.branch_id is null
      )
  );
$$;

create or replace function public.user_can_access_branch(target_branch_id uuid)
returns boolean
security definer set search_path = public
stable
language sql
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and p.branch_id = target_branch_id
  )
  or exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and (ur.branch_id = target_branch_id or ur.branch_id is null)
  );
$$;

create or replace function public.recalculate_order_totals(p_order_id uuid)
returns public.orders
security definer set search_path = public
language plpgsql
as $$
declare
  current_order public.orders%rowtype;
  calculated_subtotal numeric(12, 2);
  calculated_payments numeric(12, 2);
begin
  select * into current_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Pedido no encontrado' using errcode = 'P0002';
  end if;

  if not public.user_can_access_branch(current_order.branch_id) then
    raise exception 'No autorizado para este local' using errcode = '42501';
  end if;

  select coalesce(sum(line_total), 0)::numeric(12, 2)
    into calculated_subtotal
  from public.order_items
  where order_id = p_order_id
    and status <> 'cancelled';

  select coalesce(sum(amount), 0)::numeric(12, 2)
    into calculated_payments
  from public.payments
  where order_id = p_order_id
    and status not in ('rejected', 'refunded');

  update public.orders
  set subtotal = calculated_subtotal,
      total = greatest(calculated_subtotal - discount_total, 0)::numeric(12, 2),
      payment_total = calculated_payments,
      balance_due = greatest(greatest(calculated_subtotal - discount_total, 0) - calculated_payments, 0)::numeric(12, 2),
      updated_by = auth.uid()
  where id = p_order_id
  returning * into current_order;

  return current_order;
end;
$$;

create or replace function public.transition_order_status(
  p_order_id uuid,
  p_to_status text,
  p_reason text default null
)
returns public.orders
security definer set search_path = public
language plpgsql
as $$
declare
  current_order public.orders%rowtype;
  previous_status text;
  can_transition boolean := false;
  payments_are_valid boolean := true;
begin
  select * into current_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Pedido no encontrado' using errcode = 'P0002';
  end if;

  if not public.user_can_access_branch(current_order.branch_id) then
    raise exception 'No autorizado para este local' using errcode = '42501';
  end if;

  previous_status := current_order.status;

  can_transition := case current_order.status
    when 'draft' then p_to_status in ('confirmed', 'cancelled')
    when 'confirmed' then p_to_status in ('sent_to_kitchen', 'cancelled')
    when 'sent_to_kitchen' then p_to_status in ('preparing', 'partially_cancelled')
    when 'preparing' then p_to_status in ('partially_ready', 'ready', 'partially_cancelled')
    when 'partially_ready' then p_to_status in ('ready', 'partially_cancelled')
    when 'ready' then p_to_status in ('delivered')
    when 'delivered' then p_to_status in ('payment_pending')
    when 'payment_pending' then p_to_status in ('paid')
    else false
  end;

  if not can_transition then
    raise exception 'Transición no válida: % → %', current_order.status, p_to_status using errcode = 'P0001';
  end if;

  if p_to_status in ('sent_to_kitchen', 'preparing', 'partially_ready', 'ready')
     and not (public.has_role('admin', current_order.branch_id) or public.has_role('kitchen', current_order.branch_id) or public.has_role('waiter', current_order.branch_id)) then
    raise exception 'El usuario no puede enviar o preparar pedidos' using errcode = '42501';
  end if;

  if p_to_status in ('confirmed', 'sent_to_kitchen', 'delivered', 'payment_pending')
     and not (public.has_role('admin', current_order.branch_id) or (public.has_role('waiter', current_order.branch_id) and current_order.waiter_id = auth.uid()) or public.has_role('cashier', current_order.branch_id)) then
    raise exception 'El usuario no puede cambiar este estado' using errcode = '42501';
  end if;

  if p_to_status in ('cancelled', 'partially_cancelled')
     and (nullif(trim(coalesce(p_reason, '')), '') is null
       or not (public.has_role('admin', current_order.branch_id)
         or (public.has_role('waiter', current_order.branch_id) and current_order.waiter_id = auth.uid())
         or public.has_role('kitchen', current_order.branch_id))) then
    raise exception 'La anulación requiere permiso y motivo' using errcode = '42501';
  end if;

  if p_to_status = 'paid' then
    if not (public.has_role('admin', current_order.branch_id) or public.has_role('cashier', current_order.branch_id)) then
      raise exception 'Solo caja o administración puede cerrar la venta' using errcode = '42501';
    end if;

    perform public.recalculate_order_totals(p_order_id);
    select * into current_order from public.orders where id = p_order_id for update;

    select not exists (
      select 1 from public.payments
      where order_id = p_order_id
        and method <> 'cash'
        and status <> 'verified'
        and status not in ('rejected', 'refunded')
    ) into payments_are_valid;

    if current_order.balance_due > 0 or not payments_are_valid then
      raise exception 'El pedido tiene saldo o pagos digitales sin verificar' using errcode = 'P0001';
    end if;
  end if;

  update public.orders
  set status = p_to_status,
      sent_to_kitchen_at = case when p_to_status = 'sent_to_kitchen' then coalesce(sent_to_kitchen_at, timezone('utc', now())) else sent_to_kitchen_at end,
      delivered_at = case when p_to_status = 'delivered' then timezone('utc', now()) else delivered_at end,
      paid_at = case when p_to_status = 'paid' then timezone('utc', now()) else paid_at end,
      cancelled_at = case when p_to_status = 'cancelled' then timezone('utc', now()) else cancelled_at end,
      updated_by = auth.uid()
  where id = p_order_id
  returning * into current_order;

  insert into public.order_status_history (branch_id, order_id, from_status, to_status, changed_by, reason)
  values (current_order.branch_id, current_order.id, previous_status, p_to_status, auth.uid(), p_reason);

  insert into public.audit_logs (branch_id, actor_id, action, entity, entity_id, after_data, reason)
  values (current_order.branch_id, auth.uid(), 'order.status_changed', 'orders', current_order.id, jsonb_build_object('status', p_to_status), p_reason);

  return current_order;
end;
$$;

revoke execute on function public.recalculate_order_totals(uuid) from public;
grant execute on function public.recalculate_order_totals(uuid) to authenticated;
revoke execute on function public.transition_order_status(uuid, text, text) from public;
grant execute on function public.transition_order_status(uuid, text, text) to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'branches', 'profiles', 'user_roles', 'settings', 'categories', 'products',
    'product_variants', 'modifier_groups', 'modifier_options', 'product_modifier_groups',
    'tables', 'orders', 'order_items', 'order_item_modifiers', 'order_status_history',
    'payment_methods', 'payments', 'payment_evidences', 'cash_sessions', 'cash_movements',
    'expense_categories', 'expenses', 'audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

-- The policies intentionally keep business actions server-authorized as well.
-- RLS is a second line of defense for direct Supabase access.
create policy "authenticated users can read roles" on public.roles
  for select to authenticated using (true);

create policy "members can read their branch" on public.branches
  for select to authenticated using (public.user_can_access_branch(id));

create policy "admins can manage branches" on public.branches
  for all to authenticated using (public.has_role('admin', id)) with check (public.has_role('admin', id));

create policy "users can read own profile" on public.profiles
  for select to authenticated using (id = auth.uid() or public.has_role('admin', branch_id));
create policy "admins can manage branch profiles" on public.profiles
  for all to authenticated using (public.has_role('admin', branch_id)) with check (public.has_role('admin', branch_id));

create policy "users can read their roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid() or public.has_role('admin', branch_id));
create policy "admins can manage roles" on public.user_roles
  for all to authenticated using (public.has_role('admin', branch_id)) with check (public.has_role('admin', branch_id));

create policy "members can read branch settings" on public.settings
  for select to authenticated using (public.user_can_access_branch(branch_id));
create policy "admins can manage settings" on public.settings
  for all to authenticated using (public.has_role('admin', branch_id)) with check (public.has_role('admin', branch_id));

create policy "members can read catalog" on public.categories
  for select to authenticated using (public.user_can_access_branch(branch_id));
create policy "admins can manage categories" on public.categories
  for all to authenticated using (public.has_role('admin', branch_id)) with check (public.has_role('admin', branch_id));

create policy "members can read products" on public.products
  for select to authenticated using (public.user_can_access_branch(branch_id));
create policy "admins can manage products" on public.products
  for all to authenticated using (public.has_role('admin', branch_id)) with check (public.has_role('admin', branch_id));

create policy "members can read variants" on public.product_variants
  for select to authenticated using (public.user_can_access_branch(branch_id));
create policy "admins can manage variants" on public.product_variants
  for all to authenticated using (public.has_role('admin', branch_id)) with check (public.has_role('admin', branch_id));

create policy "members can read modifier groups" on public.modifier_groups
  for select to authenticated using (public.user_can_access_branch(branch_id));
create policy "admins can manage modifier groups" on public.modifier_groups
  for all to authenticated using (public.has_role('admin', branch_id)) with check (public.has_role('admin', branch_id));

create policy "members can read modifier options" on public.modifier_options
  for select to authenticated using (public.user_can_access_branch(branch_id));
create policy "admins can manage modifier options" on public.modifier_options
  for all to authenticated using (public.has_role('admin', branch_id)) with check (public.has_role('admin', branch_id));

create policy "members can read product modifier groups" on public.product_modifier_groups
  for select to authenticated using (public.user_can_access_branch(branch_id));
create policy "admins can manage product modifier groups" on public.product_modifier_groups
  for all to authenticated using (public.has_role('admin', branch_id)) with check (public.has_role('admin', branch_id));

create policy "members can read tables" on public.tables
  for select to authenticated using (public.user_can_access_branch(branch_id));
create policy "admins can manage tables" on public.tables
  for all to authenticated using (public.has_role('admin', branch_id)) with check (public.has_role('admin', branch_id));

create policy "members can read orders" on public.orders
  for select to authenticated using (public.user_can_access_branch(branch_id));
create policy "service staff can create orders" on public.orders
  for insert to authenticated with check (
    public.user_can_access_branch(branch_id)
    and (public.has_role('admin', branch_id) or public.has_role('waiter', branch_id) or public.has_role('cashier', branch_id))
  );
create policy "service staff can update orders" on public.orders
  for update to authenticated using (
    public.user_can_access_branch(branch_id)
    and (public.has_role('admin', branch_id) or public.has_role('waiter', branch_id) or public.has_role('cashier', branch_id) or public.has_role('kitchen', branch_id))
  ) with check (public.user_can_access_branch(branch_id));

create policy "members can read order items" on public.order_items
  for select to authenticated using (public.user_can_access_branch(branch_id));
create policy "service staff can create order items" on public.order_items
  for insert to authenticated with check (public.user_can_access_branch(branch_id) and (public.has_role('admin', branch_id) or public.has_role('waiter', branch_id)));
create policy "service staff can update order items" on public.order_items
  for update to authenticated using (public.user_can_access_branch(branch_id) and (public.has_role('admin', branch_id) or public.has_role('waiter', branch_id) or public.has_role('kitchen', branch_id))) with check (public.user_can_access_branch(branch_id));

create policy "members can read order item modifiers" on public.order_item_modifiers
  for select to authenticated using (public.user_can_access_branch(branch_id));
create policy "service staff can create order item modifiers" on public.order_item_modifiers
  for insert to authenticated with check (public.user_can_access_branch(branch_id) and (public.has_role('admin', branch_id) or public.has_role('waiter', branch_id)));

create policy "members can read order history" on public.order_status_history
  for select to authenticated using (public.user_can_access_branch(branch_id));
create policy "members can insert order history" on public.order_status_history
  for insert to authenticated with check (public.user_can_access_branch(branch_id));

create policy "members can read payment methods" on public.payment_methods
  for select to authenticated using (public.user_can_access_branch(branch_id));
create policy "admins can manage payment methods" on public.payment_methods
  for all to authenticated using (public.has_role('admin', branch_id)) with check (public.has_role('admin', branch_id));

create policy "members can read payments" on public.payments
  for select to authenticated using (public.user_can_access_branch(branch_id));
create policy "cash staff can register payments" on public.payments
  for insert to authenticated with check (public.user_can_access_branch(branch_id) and (public.has_role('admin', branch_id) or public.has_role('cashier', branch_id)));
create policy "cash staff can verify payments" on public.payments
  for update to authenticated using (public.has_role('admin', branch_id) or public.has_role('cashier', branch_id)) with check (public.has_role('admin', branch_id) or public.has_role('cashier', branch_id));

create policy "cash staff can read evidence" on public.payment_evidences
  for select to authenticated using (public.has_role('admin', branch_id) or public.has_role('cashier', branch_id));
create policy "cash staff can create evidence" on public.payment_evidences
  for insert to authenticated with check (public.has_role('admin', branch_id) or public.has_role('cashier', branch_id));

create policy "cash staff can read cash sessions" on public.cash_sessions
  for select to authenticated using (public.has_role('admin', branch_id) or public.has_role('cashier', branch_id));
create policy "cash staff can manage cash sessions" on public.cash_sessions
  for all to authenticated using (public.has_role('admin', branch_id) or public.has_role('cashier', branch_id)) with check (public.has_role('admin', branch_id) or public.has_role('cashier', branch_id));

create policy "cash staff can read cash movements" on public.cash_movements
  for select to authenticated using (public.has_role('admin', branch_id) or public.has_role('cashier', branch_id));
create policy "cash staff can create cash movements" on public.cash_movements
  for insert to authenticated with check (public.has_role('admin', branch_id) or public.has_role('cashier', branch_id));

create policy "cash staff can read expense categories" on public.expense_categories
  for select to authenticated using (public.user_can_access_branch(branch_id));
create policy "admins can manage expense categories" on public.expense_categories
  for all to authenticated using (public.has_role('admin', branch_id)) with check (public.has_role('admin', branch_id));

create policy "financial staff can read expenses" on public.expenses
  for select to authenticated using (public.has_role('admin', branch_id) or public.has_role('cashier', branch_id));
create policy "financial staff can manage expenses" on public.expenses
  for all to authenticated using (public.has_role('admin', branch_id) or public.has_role('cashier', branch_id)) with check (public.has_role('admin', branch_id) or public.has_role('cashier', branch_id));

create policy "admins can read audit logs" on public.audit_logs
  for select to authenticated using (public.has_role('admin', branch_id));
create policy "members can append audit logs" on public.audit_logs
  for insert to authenticated with check (actor_id = auth.uid() and public.user_can_access_branch(branch_id));

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'branches', 'profiles', 'settings', 'categories', 'products', 'product_variants',
    'modifier_groups', 'modifier_options', 'tables', 'orders', 'order_items',
    'payment_methods', 'payments', 'cash_sessions', 'expense_categories', 'expenses'
  ] loop
    execute format('drop trigger if exists %I on public.%I', 'touch_' || table_name, table_name);
    execute format('create trigger %I before update on public.%I for each row execute procedure public.touch_updated_at()', 'touch_' || table_name, table_name);
  end loop;
end;
$$;
