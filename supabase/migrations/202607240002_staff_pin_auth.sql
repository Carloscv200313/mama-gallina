-- Personal interno sin email/password: acceso por nombre + PIN.
-- Esta migración debe ejecutarse después de 202607240001_initial_schema.sql.

create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  full_name text not null check (length(trim(full_name)) between 2 and 120),
  role_key text not null check (role_key in ('admin', 'waiter', 'kitchen', 'cashier')),
  pin_hash text not null check (length(pin_hash) >= 40),
  status text not null default 'active' check (status in ('active', 'inactive')),
  failed_pin_attempts integer not null default 0 check (failed_pin_attempts >= 0),
  locked_until timestamptz,
  last_login_at timestamptz,
  created_by uuid references public.staff_members(id) on delete set null,
  updated_by uuid references public.staff_members(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (branch_id, full_name)
);

create table if not exists public.staff_sessions (
  id uuid primary key default gen_random_uuid(),
  staff_member_id uuid not null references public.staff_members(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists staff_members_branch_status_idx
  on public.staff_members (branch_id, status, role_key);
create index if not exists staff_sessions_staff_active_idx
  on public.staff_sessions (staff_member_id, expires_at)
  where revoked_at is null;

alter table public.staff_members enable row level security;
alter table public.staff_sessions enable row level security;

-- Solo el backend con service_role accede a estas tablas. No se exponen al cliente.
revoke all on public.staff_members from anon, authenticated;
revoke all on public.staff_sessions from anon, authenticated;

drop trigger if exists touch_staff_members on public.staff_members;
create trigger touch_staff_members
  before update on public.staff_members
  for each row execute procedure public.touch_updated_at();

-- Las operaciones pasan a identificar al personal, no a auth.users/profiles.
alter table public.settings drop constraint if exists settings_created_by_fkey;
alter table public.settings drop constraint if exists settings_updated_by_fkey;
alter table public.categories drop constraint if exists categories_created_by_fkey;
alter table public.categories drop constraint if exists categories_updated_by_fkey;
alter table public.products drop constraint if exists products_created_by_fkey;
alter table public.products drop constraint if exists products_updated_by_fkey;
alter table public.product_variants drop constraint if exists product_variants_created_by_fkey;
alter table public.product_variants drop constraint if exists product_variants_updated_by_fkey;
alter table public.modifier_groups drop constraint if exists modifier_groups_created_by_fkey;
alter table public.modifier_groups drop constraint if exists modifier_groups_updated_by_fkey;
alter table public.modifier_options drop constraint if exists modifier_options_created_by_fkey;
alter table public.modifier_options drop constraint if exists modifier_options_updated_by_fkey;
alter table public.orders drop constraint if exists orders_waiter_id_fkey;
alter table public.orders drop constraint if exists orders_created_by_fkey;
alter table public.orders drop constraint if exists orders_updated_by_fkey;
alter table public.order_items drop constraint if exists order_items_created_by_fkey;
alter table public.order_items drop constraint if exists order_items_updated_by_fkey;
alter table public.order_status_history drop constraint if exists order_status_history_changed_by_fkey;
alter table public.cash_sessions drop constraint if exists cash_sessions_cashier_id_fkey;
alter table public.cash_sessions drop constraint if exists cash_sessions_created_by_fkey;
alter table public.cash_sessions drop constraint if exists cash_sessions_updated_by_fkey;
alter table public.payments drop constraint if exists payments_registered_by_fkey;
alter table public.payments drop constraint if exists payments_verified_by_fkey;
alter table public.payment_evidences drop constraint if exists payment_evidences_created_by_fkey;
alter table public.cash_movements drop constraint if exists cash_movements_created_by_fkey;
alter table public.expenses drop constraint if exists expenses_responsible_id_fkey;
alter table public.expenses drop constraint if exists expenses_created_by_fkey;
alter table public.expenses drop constraint if exists expenses_updated_by_fkey;
alter table public.audit_logs drop constraint if exists audit_logs_actor_id_fkey;

alter table public.settings add constraint settings_created_by_fkey foreign key (created_by) references public.staff_members(id) on delete set null;
alter table public.settings add constraint settings_updated_by_fkey foreign key (updated_by) references public.staff_members(id) on delete set null;
alter table public.categories add constraint categories_created_by_fkey foreign key (created_by) references public.staff_members(id) on delete set null;
alter table public.categories add constraint categories_updated_by_fkey foreign key (updated_by) references public.staff_members(id) on delete set null;
alter table public.products add constraint products_created_by_fkey foreign key (created_by) references public.staff_members(id) on delete set null;
alter table public.products add constraint products_updated_by_fkey foreign key (updated_by) references public.staff_members(id) on delete set null;
alter table public.product_variants add constraint product_variants_created_by_fkey foreign key (created_by) references public.staff_members(id) on delete set null;
alter table public.product_variants add constraint product_variants_updated_by_fkey foreign key (updated_by) references public.staff_members(id) on delete set null;
alter table public.modifier_groups add constraint modifier_groups_created_by_fkey foreign key (created_by) references public.staff_members(id) on delete set null;
alter table public.modifier_groups add constraint modifier_groups_updated_by_fkey foreign key (updated_by) references public.staff_members(id) on delete set null;
alter table public.modifier_options add constraint modifier_options_created_by_fkey foreign key (created_by) references public.staff_members(id) on delete set null;
alter table public.modifier_options add constraint modifier_options_updated_by_fkey foreign key (updated_by) references public.staff_members(id) on delete set null;
alter table public.orders add constraint orders_waiter_id_fkey foreign key (waiter_id) references public.staff_members(id) on delete restrict;
alter table public.orders add constraint orders_created_by_fkey foreign key (created_by) references public.staff_members(id) on delete set null;
alter table public.orders add constraint orders_updated_by_fkey foreign key (updated_by) references public.staff_members(id) on delete set null;
alter table public.order_items add constraint order_items_created_by_fkey foreign key (created_by) references public.staff_members(id) on delete set null;
alter table public.order_items add constraint order_items_updated_by_fkey foreign key (updated_by) references public.staff_members(id) on delete set null;
alter table public.order_status_history add constraint order_status_history_changed_by_fkey foreign key (changed_by) references public.staff_members(id) on delete set null;
alter table public.cash_sessions add constraint cash_sessions_cashier_id_fkey foreign key (cashier_id) references public.staff_members(id) on delete restrict;
alter table public.cash_sessions add constraint cash_sessions_created_by_fkey foreign key (created_by) references public.staff_members(id) on delete set null;
alter table public.cash_sessions add constraint cash_sessions_updated_by_fkey foreign key (updated_by) references public.staff_members(id) on delete set null;
alter table public.payments add constraint payments_registered_by_fkey foreign key (registered_by) references public.staff_members(id) on delete restrict;
alter table public.payments add constraint payments_verified_by_fkey foreign key (verified_by) references public.staff_members(id) on delete restrict;
alter table public.payment_evidences add constraint payment_evidences_created_by_fkey foreign key (created_by) references public.staff_members(id) on delete restrict;
alter table public.cash_movements add constraint cash_movements_created_by_fkey foreign key (created_by) references public.staff_members(id) on delete restrict;
alter table public.expenses add constraint expenses_responsible_id_fkey foreign key (responsible_id) references public.staff_members(id) on delete restrict;
alter table public.expenses add constraint expenses_created_by_fkey foreign key (created_by) references public.staff_members(id) on delete set null;
alter table public.expenses add constraint expenses_updated_by_fkey foreign key (updated_by) references public.staff_members(id) on delete set null;
alter table public.audit_logs add constraint audit_logs_actor_id_fkey foreign key (actor_id) references public.staff_members(id) on delete set null;

-- El flujo de PIN ya no usa el trigger de creación de usuarios Auth.
drop trigger if exists on_auth_user_created on auth.users;

