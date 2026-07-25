# Bootstrap local y acceso del personal

## 1. Variables de entorno

```bash
cp .env.example .env.local
```

Completa Supabase y Cloudinary. `SUPABASE_SERVICE_ROLE_KEY` y `CLOUDINARY_API_SECRET` son únicamente de servidor. `CLOUDINARY_FOLDER` puede ser `mama-gallina` y no debe tener prefijo `NEXT_PUBLIC_`.

## 2. Base de datos

En Supabase SQL Editor ejecuta, en este orden:

1. `supabase/migrations/202607240001_initial_schema.sql`
2. `supabase/migrations/202607240002_staff_pin_auth.sql`
3. `supabase/migrations/202607240003_chicken_piece_modifier.sql`
4. `supabase/migrations/202607240004_spice_preferences.sql`
5. `supabase/migrations/202607240005_plain_broths_and_combined.sql`
6. `supabase/migrations/202607240006_combined_broth_price.sql`
7. `supabase/migrations/202607240007_order_additional_rounds.sql`
8. `supabase/migrations/202607240008_remove_payment_operation_number.sql`
9. `supabase/migrations/202607240009_add_yape_payment_method.sql`
10. `supabase/seed.sql`

La segunda migración cambia las referencias operativas para que apunten a `staff_members`, no a usuarios de correo.

## 3. Crear el primer administrador

No existen credenciales predeterminadas. Crea un PIN para el administrador:

```bash
pnpm staff:hash-pin
```

Pega el hash resultante en `supabase/bootstrap_admin.sql`, reemplazando `REEMPLAZA_CON_EL_HASH_GENERADO`. Después ejecuta ese archivo en Supabase SQL Editor.

El PIN nunca se almacena en texto plano. El administrador aparecerá en el login como **Administrador principal**.

## 4. Crear meseros, cocina y cajeros

Genera un hash distinto por persona con `pnpm staff:hash-pin` y ejecuta una inserción como esta:

```sql
insert into public.staff_members (branch_id, full_name, role_key, pin_hash)
values (
  (select id from public.branches where code = 'MAIN'),
  'Nombre del mesero',
  'waiter',
  'REEMPLAZA_CON_HASH_DEL_PIN'
);
```

Roles válidos: `admin`, `waiter`, `kitchen`, `cashier`.

Para desactivar a una persona:

```sql
update public.staff_members
set status = 'inactive'
where full_name = 'Nombre del mesero';
```

## 5. Ingreso al sistema

Abre:

```text
http://localhost:3000/login
```

El trabajador selecciona su nombre e ingresa su PIN. La sesión dura 12 horas, se guarda en una cookie `HttpOnly` y se bloquea el acceso durante 10 minutos después de cinco intentos fallidos.

## 6. Firma de evidencias Cloudinary

El backend expone `POST /api/cloudinary/signature` para administradores y cajeros. Recibe `{ "orderCode": "MG-000001" }` y devuelve una firma temporal con una carpeta como:

```text
{CLOUDINARY_FOLDER}/pagos/{branch_id}/{year}/{month}/{order_code}
```

El secreto nunca viaja al navegador.

## 7. Operación diaria

1. Entra a `/mesas` y abre una mesa o un pedido para llevar.
2. Agrega productos y modificadores desde la carta; al confirmar, la tanda se envía directamente a `/cocina`.
3. Si la mesa solicita más productos, pulsa **Agregar pedido**. Se crea una nueva tanda con código propio y queda en la cola de cocina sin modificar la anterior.
4. Cocina avanza cada producto hasta **Listo** y luego **Entregado**.
5. Atención pasa la cuenta a cobro; en `/caja` registra efectivo, Plin o transferencia. El total incluye todas las tandas de la mesa.
6. Para pagos digitales, toma la foto desde el celular: se carga a Cloudinary, queda pendiente de verificación y un cajero o administrador la aprueba.
7. Cuando el saldo sea cero y los pagos digitales estén verificados, cierra la venta. La mesa se libera y el movimiento de efectivo queda registrado.
8. `/gastos`, `/ventas`, `/reportes` y `/auditoria` muestran la operación persistida del local.

## 8. Verificación

```bash
pnpm lint
pnpm typecheck
pnpm build
```
