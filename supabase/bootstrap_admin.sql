-- Ejecuta después de las migraciones 0001 y 0002, y de supabase/seed.sql.
-- Genera el hash con: pnpm staff:hash-pin
-- Nunca guardes el PIN en este archivo.

do $$
declare
  admin_name text := 'Administrador principal';
  admin_role text := 'admin';
  admin_pin_hash text := 'scrypt$16384$8$1$0499f09d0560e2f380b0e7a36b892266$bcda31f7d4200dd9839a348b94c668bc1a858872131d92c8cf5b62fc3d57870e74359562af1e1950ea9b3029a07cb7dfd24e4e857a3f8efeee20376e00f05164';
  main_branch_id uuid;
begin
  if admin_pin_hash = 'REEMPLAZA_' || 'CON_EL_HASH_GENERADO' then
    raise exception 'Genera un hash con pnpm staff:hash-pin y reemplaza el valor antes de ejecutar';
  end if;

  select id into main_branch_id
  from public.branches
  where code = 'MAIN'
  limit 1;

  if main_branch_id is null then
    raise exception 'No existe el local MAIN. Ejecuta primero supabase/seed.sql';
  end if;

  insert into public.staff_members (branch_id, full_name, role_key, pin_hash, status)
  values (main_branch_id, admin_name, admin_role, admin_pin_hash, 'active')
  on conflict (branch_id, full_name) do update set
    role_key = excluded.role_key,
    pin_hash = excluded.pin_hash,
    status = 'active',
    failed_pin_attempts = 0,
    locked_until = null,
    updated_at = timezone('utc', now());
end;
$$;
