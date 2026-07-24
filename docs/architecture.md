# Mamá Gallina POS — arquitectura inicial

## Alcance de esta entrega

Esta primera fase entrega los cimientos para un POS multi-local preparado para:

- acceso interno por nombre + PIN;
- sesiones HttpOnly y roles por local;
- protección optimista de rutas con `proxy.ts` de Next.js 16;
- RLS por `branch_id` y autorización explícita en servidor;
- catálogo, mesas, pedidos, cocina, pagos, caja, gastos y auditoría a nivel de esquema;
- landing, acceso, layout responsive y dashboard conectado a datos reales.

No se crean credenciales de demostración ni se presentan datos ficticios como ventas reales.

## Mapa de módulos

```text
Acceso interno
├── staff_members + PIN cifrado
├── sesiones HttpOnly
└── proxy + autorización en servidor

Operación
├── mesas y mapa visual
├── pedidos y modificadores
└── cocina en tiempo real

Finanzas
├── pagos y evidencias Cloudinary
├── sesiones y movimientos de caja
├── gastos
└── ventas, ganancias y reportes

Gobierno
├── configuración por local
├── auditoría inmutable desde UI
└── roles y permisos
```

## Flujo de acceso

1. El trabajador selecciona su nombre e ingresa un PIN de 4–6 dígitos.
2. El backend verifica el hash scrypt y aplica bloqueo después de intentos fallidos.
3. Se crea un token aleatorio; solo su hash se almacena en `staff_sessions`.
4. El token se entrega en cookie `HttpOnly`, `Secure` en producción y `SameSite=Lax`.
5. El layout protegido consulta la sesión, el local y el rol antes de renderizar.
6. Cada Server Action/Route Handler vuelve a autorizar la operación; el proxy solo hace una comprobación optimista.

No hay registro público, correos ni recuperación de contraseña. El administrador agrega personal mediante `staff_members`; el PIN jamás se guarda en texto plano.

## Seguridad

El frontend filtra la navegación para mejorar la experiencia. La seguridad real está en dos capas:

- las tablas de personal y sesiones no tienen acceso para `anon` ni `authenticated`;
- el backend usa `service_role` exclusivamente en módulos `server-only` y comprueba sesión, rol, local y estado.

`service_role` nunca se importa en componentes cliente.

## Realtime

La pantalla de cocina se suscribirá a cambios de `orders`, `order_items` y `order_status_history` filtrados por `branch_id`. Realtime solo notifica cambios; la transición válida se ejecuta en el servidor o en una función SQL con bloqueo y auditoría.

## Cloudinary

El cliente comprime y previsualiza la imagen. El backend valida MIME, tamaño y huella SHA-256, firma el upload con `CLOUDINARY_API_SECRET` y organiza la carga mediante `CLOUDINARY_FOLDER`. Una evidencia subida conserva estado pendiente hasta que cajero o administrador la verifique.

## Próximas fases

1. Operación de mesas y pedidos con transiciones idempotentes.
2. Cocina Realtime y edición controlada/auditoría.
3. Pagos mixtos, Cloudinary, caja y gastos.
4. Catálogo administrativo, reportes y exportaciones.
5. pruebas unitarias/E2E, hardening, PWA offline-safe y despliegue.

