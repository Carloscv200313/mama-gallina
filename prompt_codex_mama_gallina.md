# Prompt maestro para Codex — Sistema de pedidos “Mamá Gallina”

## Rol que debes asumir

Actúa como un **arquitecto de software senior, diseñador UX/UI y desarrollador Full Stack especializado en sistemas POS para restaurantes**.

Tu tarea es analizar, diseñar y construir un sistema web moderno para un restaurante de caldería llamado **Mamá Gallina**.

No debes limitarte a generar pantallas visuales. Debes crear una solución funcional, modular, segura, escalable y preparada para producción.

Antes de programar, revisa todos los requisitos, identifica dependencias, define el modelo de datos y organiza el desarrollo por fases.

---

# 1. Objetivo general

Construir un sistema web para gestionar:

- Carta de productos.
- Categorías.
- Productos y precios.
- Pedidos por mesa.
- Personalización de platos.
- Modificadores y extras.
- Mapa visual de mesas.
- Envío de pedidos a cocina.
- Seguimiento del estado de cada pedido.
- Edición controlada de pedidos.
- Métodos de pago.
- Pagos con efectivo, Plin y transferencia.
- Evidencias de pago mediante Cloudinary.
- Apertura y cierre de caja.
- Registro de gastos.
- Cálculo de ventas y ganancias.
- Historial de ventas.
- Reportes.
- Auditoría de acciones críticas.
- Gestión de usuarios y roles.

El sistema debe funcionar correctamente desde:

- Computadoras.
- Laptops.
- Tablets.
- Celulares.

Debe ser responsive y tener experiencia tipo PWA.

---

# 2. Nombre del sistema

**Mamá Gallina POS**

Subtítulo sugerido:

> Sistema de pedidos, cocina, caja y control de ventas.

---

# 3. Tecnologías obligatorias

Utiliza la siguiente arquitectura:

## Frontend

- Next.js con App Router.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- React Hook Form.
- Zod.
- Framer Motion únicamente para animaciones ligeras.
- TanStack Table para tablas administrativas.
- Lucide React para iconos.
- Sonner para notificaciones.
- Recharts para gráficos.

## Backend y base de datos

- Supabase.
- PostgreSQL.
- Supabase Auth.
- Supabase Realtime.
- Row Level Security.
- Server Actions o Route Handlers de Next.js.
- Supabase Storage únicamente si fuera necesario para archivos internos.
- Cloudinary para evidencias de pago e imágenes públicas.

## Despliegue

- Vercel.
- Supabase.
- Cloudinary.

## Reglas técnicas

- No utilizar datos mock como solución final.
- No guardar información crítica únicamente en el frontend.
- No exponer claves privadas.
- No incluir secretos dentro del repositorio.
- Utilizar variables de entorno.
- Aplicar validaciones tanto en frontend como en backend.
- Implementar control de permisos por rol.
- Evitar registros duplicados.
- Evitar doble envío de formularios.
- Manejar estados de carga y errores.
- Utilizar transacciones o funciones SQL cuando una operación implique varios registros relacionados.

---

# 4. Alcance inicial

La primera versión será para:

- Atención en mesas.
- Pedidos para llevar.

La estructura deberá quedar preparada para agregar posteriormente:

- Delivery.
- Reservas.
- Facturación electrónica.
- Inventario de ingredientes.
- Recetas.
- Múltiples locales.

Desde el inicio, cada tabla principal debe considerar un campo `branch_id`, aunque inicialmente exista un solo local.

---

# 5. Roles del sistema

Implementa los siguientes roles:

## 5.1. Administrador

Puede:

- Ver todas las áreas.
- Gestionar productos.
- Gestionar categorías.
- Gestionar modificadores.
- Gestionar mesas.
- Gestionar usuarios.
- Gestionar precios.
- Ver ventas.
- Ver ganancias.
- Ver gastos.
- Ver auditoría.
- Anular pedidos.
- Verificar pagos.
- Abrir y cerrar caja.
- Consultar reportes.

## 5.2. Mozo

Puede:

- Ver el mapa de mesas.
- Abrir pedidos.
- Agregar productos.
- Personalizar productos.
- Enviar pedidos a cocina.
- Ver el estado de sus pedidos.
- Solicitar la cuenta.
- Agregar nuevos productos a pedidos abiertos.
- Editar pedidos antes de enviarlos a cocina.

No puede:

- Eliminar ventas cerradas.
- Cambiar precios.
- Ver reportes financieros.
- Aprobar pagos digitales.

## 5.3. Cocina

Puede:

- Ver pedidos enviados.
- Ver productos, cantidades y observaciones.
- Cambiar estados de preparación.
- Marcar productos como listos.
- Marcar pedidos como listos.
- Ver alertas de pedidos atrasados.

No puede:

- Ver ganancias.
- Modificar precios.
- Cobrar pedidos.

## 5.4. Cajero

Puede:

- Ver cuentas pendientes.
- Registrar pagos.
- Subir evidencia de pagos digitales.
- Aprobar o rechazar pagos.
- Abrir caja.
- Cerrar caja.
- Ver movimientos de caja.
- Imprimir o descargar comprobantes internos.

---

# 6. Módulos del sistema

## 6.1. Autenticación

Crear:

- Inicio de sesión.
- Recuperación de contraseña.
- Cierre de sesión.
- Protección de rutas.
- Redirección según rol.
- Control de sesiones activas.

Campos:

- Correo.
- Contraseña.

Registrar:

- Último acceso.
- Fecha de creación.
- Estado del usuario.
- Rol.
- Local asignado.

---

## 6.2. Panel principal

Mostrar indicadores según rol.

### Administrador

- Ventas del día.
- Ganancia bruta.
- Gastos del día.
- Ganancia neta.
- Pedidos activos.
- Mesas ocupadas.
- Pagos pendientes de verificación.
- Caja abierta o cerrada.
- Producto más vendido.
- Ticket promedio.

### Mozo

- Mesas libres.
- Mesas ocupadas.
- Pedidos pendientes.
- Pedidos listos.
- Pedidos por cobrar.

### Cocina

- Pedidos pendientes.
- Pedidos en preparación.
- Pedidos listos.
- Tiempo promedio de preparación.

### Cajero

- Ventas del turno.
- Efectivo esperado.
- Pagos digitales.
- Pagos pendientes.
- Diferencia de caja.

---

# 7. Carta de productos

La carta debe estar organizada por categorías.

## Categorías iniciales

- Caldos.
- Alitas.
- Bebidas.
- Extras.

## Productos iniciales

### Caldos

- Caldo de gallina — S/ 14.00
- Caldo de cordero — S/ 15.00
- Caldo de mote — S/ 15.00
- Caldo acevichado — S/ 17.00

### Alitas

Las alitas se manejan mediante variantes:

| Cantidad | Sabores permitidos | Precio |
|---:|---:|---:|
| 4 | 1 | S/ 12.00 |
| 6 | 1 | S/ 17.00 |
| 8 | 2 | S/ 22.00 |
| 10 | 2 | S/ 27.00 |
| 12 | 3 | S/ 32.00 |

Sabores:

- BBQ.
- Crispy.
- Búfalo.
- Maracuyá.
- Acevichadas.

El sistema debe validar que el cliente no seleccione más sabores de los permitidos.

### Bebidas

- Vaso de chicha — S/ 2.50
- 1/2 litro de chicha — S/ 5.00
- 1 litro de chicha — S/ 9.00
- Gaseosa personal — S/ 4.00
- Gordita — S/ 5.00
- 1 litro de Coca-Cola o Inca Kola — S/ 7.00
- 1.5 litros de Coca-Cola o Inca Kola — S/ 9.00
- 3 litros de Coca-Cola o Inca Kola — S/ 13.00

### Extras

- Salchipapa — S/ 8.00
- Salchialitas — S/ 14.00
- Yuquitas — S/ 5.00

Cada producto debe tener:

- Nombre.
- Descripción.
- Categoría.
- Imagen.
- Precio de venta.
- Costo estimado.
- Estado activo o inactivo.
- Disponibilidad.
- Tiempo estimado de preparación.
- Código interno.
- Orden de aparición.
- Si permite modificadores.
- Si requiere preparación en cocina.
- Si controla stock.
- Local asignado.

---

# 8. Modificadores y opciones

Crear un sistema flexible de modificadores.

No programar opciones específicas directamente dentro de cada producto.

## Ejemplo de grupos de modificadores

### Acompañamiento

- Con arroz.
- Sin arroz.
- Arroz separado.

### Tipo de plato

- Normal.
- Combinado.

### Preferencias

- Con cebolla.
- Sin cebolla.
- Poco picante.
- Sin picante.
- Limón adicional.

### Extras con precio

- Arroz adicional.
- Presa adicional.
- Huevo adicional.
- Mote adicional.
- Yuca adicional.

Cada grupo debe permitir configurar:

- Nombre.
- Descripción.
- Obligatorio o no.
- Selección única o múltiple.
- Cantidad mínima.
- Cantidad máxima.
- Productos asociados.
- Opciones disponibles.
- Precio adicional por opción.
- Estado activo o inactivo.

---

# 9. Mapa visual de mesas

Crear una pantalla visual de mesas.

Cada mesa debe mostrar:

- Número.
- Nombre opcional.
- Estado.
- Total consumido.
- Tiempo ocupada.
- Mozo responsable.
- Cantidad de personas.
- Estado del pedido.

## Estados visuales de mesa

- Libre.
- Ocupada.
- Pedido en borrador.
- Pedido enviado.
- En preparación.
- Pedido listo.
- Cuenta solicitada.
- Pago pendiente.
- Pagada.
- Fuera de servicio.

Permitir:

- Crear mesas.
- Editar mesas.
- Reordenar mesas.
- Activar o desactivar mesas.
- Mover un pedido de una mesa a otra.
- Unir mesas.
- Separar mesas.
- Dividir cuenta.
- Liberar mesa después del pago.

---

# 10. Flujo de pedido

## Paso 1: seleccionar mesa

El mozo selecciona una mesa libre.

Registrar:

- Mesa.
- Mozo.
- Cantidad de personas.
- Nombre del cliente opcional.
- Observación general.
- Fecha y hora de apertura.

## Paso 2: agregar productos

Permitir:

- Buscar productos.
- Filtrar por categoría.
- Agregar cantidades.
- Seleccionar variantes.
- Seleccionar modificadores.
- Agregar observaciones.
- Indicar prioridad.
- Indicar si es para llevar.

## Paso 3: pedido en borrador

Mientras esté en borrador:

- Se puede editar.
- Se puede eliminar un producto.
- Se puede cambiar cantidad.
- Se pueden cambiar modificadores.
- No debe aparecer todavía en cocina.

## Paso 4: enviar a cocina

Cuando se envíe:

- Cambiar estado del pedido.
- Registrar fecha y hora.
- Registrar usuario.
- Crear historial.
- Mostrarlo en cocina en tiempo real.
- Evitar doble envío.
- Bloquear cambios silenciosos.

## Paso 5: preparación

Estados por producto:

- Pendiente.
- En preparación.
- Listo.
- Entregado.
- Anulado.

Estados generales del pedido:

- Borrador.
- Confirmado.
- Enviado a cocina.
- En preparación.
- Parcialmente listo.
- Listo.
- Entregado.
- Cuenta solicitada.
- Pendiente de pago.
- Pagado.
- Anulado.

## Paso 6: solicitar cuenta

Calcular:

- Subtotal.
- Extras.
- Descuento.
- Total.
- Pagos realizados.
- Saldo pendiente.

## Paso 7: registrar pago

Permitir:

- Efectivo.
- Plin.
- Transferencia.
- Pago mixto.

## Paso 8: cerrar venta

Solo cerrar cuando:

- El total pagado sea igual al total del pedido.
- Los pagos digitales estén verificados.
- No existan pagos rechazados pendientes.
- No existan productos sin precio.
- El pedido no esté anulado.

Al cerrar:

- Cambiar estado a pagado.
- Registrar fecha y hora.
- Liberar mesa.
- Registrar movimiento de caja.
- Actualizar reportes.
- Generar comprobante interno.
- Bloquear edición directa.

---

# 11. Edición de pedidos

## Antes de enviar a cocina

Permitir edición libre.

## Después de enviar a cocina

Cualquier cambio debe:

- Solicitar motivo.
- Registrar usuario.
- Registrar fecha y hora.
- Guardar valor anterior.
- Guardar valor nuevo.
- Notificar a cocina.
- Crear evento de auditoría.

No eliminar físicamente productos enviados.

Utilizar estados como:

- Activo.
- Anulado.
- Reemplazado.

Registrar motivos como:

- Error del mozo.
- Cambio solicitado por el cliente.
- Producto agotado.
- Error de cocina.
- Cortesía.
- Otro.

---

# 12. Pantalla de cocina

Crear una vista Kanban o tarjetas.

Columnas sugeridas:

- Pendientes.
- En preparación.
- Listos.

Cada tarjeta debe mostrar:

- Mesa.
- Número de pedido.
- Hora.
- Tiempo transcurrido.
- Mozo.
- Productos.
- Cantidades.
- Modificadores.
- Observaciones.
- Prioridad.
- Tipo de pedido.
- Estado.

Permitir:

- Iniciar preparación.
- Marcar un producto como listo.
- Marcar todo el pedido como listo.
- Marcar como entregado.
- Visualizar cambios realizados por el mozo.

Implementar alertas por tiempo:

- Normal.
- Próximo a retrasarse.
- Retrasado.

Los tiempos deben poder configurarse.

---

# 13. Métodos de pago

Crear los siguientes métodos:

- Efectivo.
- Plin.
- Transferencia.
- Mixto.

Cada pago debe registrar:

- Pedido.
- Método.
- Importe.
- Moneda.
- Número de operación.
- Evidencia.
- Estado.
- Usuario que registró.
- Usuario que verificó.
- Fecha de registro.
- Fecha de verificación.
- Observaciones.
- Local.
- Sesión de caja.

---

# 14. Evidencias con Cloudinary

Cuando el método sea Plin o transferencia:

- La imagen debe ser obligatoria.
- El número de operación debe ser obligatorio cuando corresponda.
- Permitir tomar foto desde el celular.
- Permitir seleccionar una imagen.
- Comprimir la imagen antes de subirla.
- Validar formato.
- Validar tamaño.
- Mostrar vista previa.
- Subir la imagen a Cloudinary.
- Guardar `secure_url`.
- Guardar `public_id`.
- Guardar ancho, alto y formato.
- Asociarla al pago.

Organización sugerida:

```text
mama-gallina/
  pagos/
    {branch_id}/
      {year}/
        {month}/
          {order_code}/
```

Estados del pago:

- Pendiente de evidencia.
- Evidencia subida.
- Pendiente de verificación.
- Verificado.
- Rechazado.
- Reembolsado.

Reglas:

- Subir una imagen no significa que el pago está aprobado.
- Solo cajero o administrador pueden verificar.
- Un pago rechazado debe incluir motivo.
- No permitir repetir el mismo número de operación.
- Crear una huella digital del archivo para detectar evidencias duplicadas.
- No permitir usar la misma evidencia en dos pagos.
- Registrar auditoría.

---

# 15. Pago mixto

Permitir dividir el total entre distintos métodos.

Ejemplo:

```text
Total: S/ 50.00
Efectivo: S/ 20.00
Plin: S/ 30.00
```

Validaciones:

- La suma de pagos no puede ser menor al total al cerrar la venta.
- La suma no puede superar el total, salvo que se registre vuelto.
- El vuelto solo puede corresponder a pagos en efectivo.
- Los pagos digitales deben estar verificados.
- Mostrar saldo pendiente en tiempo real.

---

# 16. Caja

## Apertura de caja

Registrar:

- Cajero.
- Fecha y hora.
- Monto inicial.
- Observación.
- Local.

## Movimientos

Tipos:

- Venta en efectivo.
- Entrada manual.
- Salida manual.
- Gasto.
- Devolución.
- Ajuste.
- Retiro.

## Cierre de caja

Calcular:

```text
efectivo_esperado =
monto_inicial
+ ventas_efectivo
+ entradas
- salidas
- gastos_efectivo
- devoluciones
```

Registrar:

- Efectivo contado.
- Efectivo esperado.
- Diferencia.
- Observación.
- Usuario.
- Fecha y hora.

Estados:

- Abierta.
- Cerrada.
- Cerrada con diferencia.

No permitir:

- Registrar ventas en efectivo sin caja abierta.
- Tener dos cajas abiertas para el mismo cajero y local, salvo configuración expresa.
- Editar un cierre sin autorización del administrador.

---

# 17. Gastos

Crear un módulo de gastos.

Campos:

- Categoría.
- Descripción.
- Importe.
- Método de pago.
- Fecha.
- Responsable.
- Comprobante.
- Observación.
- Local.
- Caja relacionada.
- Estado.

Categorías iniciales:

- Ingredientes.
- Gas.
- Agua.
- Electricidad.
- Limpieza.
- Mantenimiento.
- Sueldos.
- Delivery.
- Transporte.
- Otros.

---

# 18. Ganancias

Para el MVP, cada producto debe tener:

- Precio de venta.
- Costo estimado.

Calcular:

```text
ganancia_bruta = ventas - costo_estimado_de_productos_vendidos
```

Calcular:

```text
ganancia_neta = ganancia_bruta - gastos
```

No confundir:

- Ingreso.
- Venta.
- Ganancia.
- Efectivo disponible.
- Dinero en caja.

Mostrar claramente que el costo es estimado mientras no exista un módulo de recetas e inventario.

---

# 19. Reportes

Crear reportes con filtros por:

- Hoy.
- Ayer.
- Semana.
- Mes.
- Año.
- Rango personalizado.
- Local.
- Mozo.
- Método de pago.
- Categoría.
- Producto.

Reportes:

- Ventas totales.
- Ganancia bruta.
- Ganancia neta.
- Gastos.
- Ticket promedio.
- Cantidad de pedidos.
- Ventas por método de pago.
- Productos más vendidos.
- Productos menos vendidos.
- Categorías más vendidas.
- Ventas por mozo.
- Anulaciones.
- Descuentos.
- Mesas con mayor consumo.
- Horarios con mayor demanda.
- Tiempo promedio de preparación.
- Diferencias de caja.
- Pagos digitales pendientes.
- Pagos rechazados.

Permitir:

- Ver gráficos.
- Ver tablas.
- Exportar CSV.
- Exportar Excel.
- Generar PDF.

---

# 20. Historial y auditoría

Registrar acciones críticas:

- Inicio de sesión.
- Creación de pedido.
- Envío a cocina.
- Cambio de cantidad.
- Cambio de precio.
- Anulación de producto.
- Anulación de pedido.
- Descuento.
- Cambio de mesa.
- División de cuenta.
- Registro de pago.
- Aprobación de pago.
- Rechazo de pago.
- Apertura de caja.
- Cierre de caja.
- Creación de gasto.
- Modificación de producto.
- Cambio de rol.

Guardar:

- Usuario.
- Acción.
- Entidad.
- ID de entidad.
- Datos anteriores.
- Datos nuevos.
- Motivo.
- Fecha y hora.
- IP cuando sea posible.
- Dispositivo o navegador cuando sea posible.

La auditoría no debe poder ser eliminada desde la interfaz.

---

# 21. Prevención de duplicados

Implementar medidas contra duplicación:

- Deshabilitar botones mientras se procesa una acción.
- Utilizar identificadores de idempotencia.
- Crear restricciones únicas en base de datos.
- Validar estado antes de modificar.
- Evitar doble envío a cocina.
- Evitar doble registro de pago.
- Evitar doble cierre de venta.
- Evitar doble movimiento de caja.
- Evitar reutilización de evidencias.
- Evitar números de operación duplicados.
- Utilizar transacciones en operaciones críticas.

Ejemplos de claves únicas:

- Código de pedido.
- Número de operación de pago, cuando exista.
- Idempotency key.
- Un cierre por sesión de caja.
- Una mesa no puede tener dos pedidos activos incompatibles.

---

# 22. Seguridad

Implementar:

- Supabase Auth.
- Row Level Security.
- Políticas por rol.
- Validación de permisos en servidor.
- Protección de rutas.
- Sanitización de entradas.
- Validación con Zod.
- Rate limiting en acciones sensibles.
- No exponer claves privadas de Cloudinary.
- Firmar cargas de Cloudinary desde backend.
- URLs seguras.
- Manejo de sesiones.
- Registro de errores.
- No mostrar información financiera a roles no autorizados.

---

# 23. Diseño visual

Crear una identidad visual inspirada en:

- Cocina tradicional.
- Calidez.
- Ambiente familiar.
- Verde oliva.
- Verde oscuro.
- Crema.
- Blanco.
- Toques dorados suaves.

## Paleta sugerida

```text
Verde oscuro: #31452F
Verde oliva: #66785A
Verde suave: #A7B49A
Crema: #F6F1E7
Marrón cálido: #8B6846
Dorado suave: #C8A96B
Rojo de alerta: #C94B4B
```

## Estilo

- Diseño limpio.
- Tarjetas redondeadas.
- Buena separación visual.
- Botones grandes para tablets y celulares.
- Tipografía legible.
- Contraste adecuado.
- Iconos claros.
- Estados por color.
- Interfaces rápidas.
- Evitar formularios saturados.
- Utilizar drawers o modales para acciones rápidas.
- Mostrar skeletons durante carga.
- Mostrar toasts para resultados.
- Confirmar acciones destructivas.

---

# 24. Navegación

## Administrador

- Dashboard.
- Mesas.
- Pedidos.
- Cocina.
- Caja.
- Ventas.
- Pagos.
- Productos.
- Categorías.
- Modificadores.
- Gastos.
- Reportes.
- Usuarios.
- Auditoría.
- Configuración.

## Mozo

- Mesas.
- Mis pedidos.
- Pedidos listos.
- Cuenta pendiente.

## Cocina

- Cocina.
- Historial del día.

## Cajero

- Caja.
- Cuentas pendientes.
- Pagos.
- Historial de ventas.

---

# 25. Modelo de datos esperado

Diseña una base de datos normalizada.

Como mínimo, considera las siguientes tablas:

```text
branches
profiles
roles
user_roles
tables
categories
products
product_variants
modifier_groups
modifier_options
product_modifier_groups
orders
order_items
order_item_modifiers
order_status_history
payments
payment_evidences
cash_sessions
cash_movements
expense_categories
expenses
audit_logs
settings
```

Cada tabla debe tener, según corresponda:

- `id`
- `branch_id`
- `created_at`
- `updated_at`
- `created_by`
- `updated_by`
- `status`

Utilizar:

- UUID.
- Foreign keys.
- Índices.
- Constraints.
- Check constraints.
- Unique constraints.
- Soft delete cuando corresponda.
- Timestamps.
- Triggers únicamente cuando sean realmente necesarios.

---

# 26. Estados y máquinas de estado

No permitir cambios arbitrarios.

Crear transiciones válidas.

Ejemplo de pedido:

```text
draft
→ confirmed
→ sent_to_kitchen
→ preparing
→ ready
→ delivered
→ payment_pending
→ paid
```

También:

```text
draft → cancelled
confirmed → cancelled
sent_to_kitchen → partially_cancelled
payment_pending → paid
```

No permitir:

```text
paid → draft
cancelled → preparing
```

Cualquier reversión debe requerir permisos y auditoría.

---

# 27. Componentes principales

Crear componentes reutilizables:

- `TableMap`
- `TableCard`
- `ProductCard`
- `CategoryTabs`
- `OrderDrawer`
- `OrderItemEditor`
- `ModifierSelector`
- `KitchenTicket`
- `OrderStatusBadge`
- `PaymentModal`
- `PaymentEvidenceUploader`
- `CashOpeningDialog`
- `CashClosingDialog`
- `ExpenseForm`
- `ReportFilters`
- `AuditTimeline`
- `ConfirmActionDialog`
- `ResponsiveDataTable`
- `EmptyState`
- `LoadingSkeleton`
- `ErrorState`

---

# 28. Experiencia móvil

En celular:

- Usar navegación inferior para mozo.
- Mostrar botones grandes.
- Facilitar toma de foto.
- Evitar tablas horizontales.
- Utilizar tarjetas.
- Mantener el total visible.
- Permitir agregar productos rápidamente.
- Mostrar resumen del pedido fijo en la parte inferior.
- Tener confirmación clara antes de enviar a cocina.

---

# 29. Datos iniciales

Crear un archivo de seed con:

- Un local principal.
- Roles.
- Categorías.
- Productos iniciales.
- Variantes de alitas.
- Sabores.
- Modificadores.
- Métodos de pago.
- Categorías de gasto.
- Mesas del 1 al 12.
- Configuración inicial.

No insertar credenciales reales.

---

# 30. Variables de entorno

Crear `.env.example`.

Debe incluir:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

NEXT_PUBLIC_APP_URL=
```

No mostrar valores reales.

---

# 31. Entregables obligatorios

Entrega el proyecto por fases.

## Fase 1: análisis

Genera:

- Resumen funcional.
- Mapa de módulos.
- Flujos.
- Roles.
- Reglas de negocio.
- Riesgos.
- Decisiones técnicas.

## Fase 2: arquitectura

Genera:

- Estructura de carpetas.
- Arquitectura frontend.
- Arquitectura backend.
- Modelo de datos.
- Relaciones.
- Estrategia de permisos.
- Estrategia Realtime.
- Estrategia Cloudinary.

## Fase 3: base de datos

Genera:

- Migraciones SQL.
- Tablas.
- Índices.
- Constraints.
- RLS.
- Funciones SQL necesarias.
- Seeds.

## Fase 4: implementación

Genera:

- Autenticación.
- Layouts.
- Navegación.
- Módulo de mesas.
- Carta.
- Pedidos.
- Cocina.
- Pagos.
- Caja.
- Gastos.
- Reportes.
- Auditoría.

## Fase 5: calidad

Genera:

- Validaciones.
- Manejo de errores.
- Pruebas.
- Control de duplicados.
- Revisión de seguridad.
- Revisión responsive.
- Documentación.

---

# 32. Forma de trabajo

Trabaja de la siguiente manera:

1. Analiza antes de programar.
2. Divide el trabajo en tareas pequeñas.
3. Explica qué archivos crearás.
4. No elimines código funcional sin justificarlo.
5. No inventes librerías innecesarias.
6. No generes archivos vacíos.
7. No dejes funciones incompletas.
8. No uses `any` salvo justificación.
9. Evita componentes gigantes.
10. Mantén separación entre UI, lógica de negocio y acceso a datos.
11. Mantén nombres claros.
12. Utiliza español en la interfaz.
13. Utiliza inglés en nombres técnicos, tablas, variables y archivos.
14. Documenta decisiones relevantes.
15. Al terminar cada módulo, explica cómo probarlo.

---

# 33. Pruebas mínimas

Crear pruebas para:

- Crear pedido.
- Agregar producto.
- Agregar modificador.
- Enviar a cocina.
- Evitar doble envío.
- Cambiar estado en cocina.
- Registrar pago en efectivo.
- Registrar pago por Plin.
- Subir evidencia.
- Rechazar evidencia.
- Aprobar evidencia.
- Registrar pago mixto.
- Evitar monto incorrecto.
- Cerrar venta.
- Liberar mesa.
- Abrir caja.
- Cerrar caja.
- Detectar diferencia.
- Registrar gasto.
- Calcular ganancia.
- Anular producto con auditoría.
- Validar permisos por rol.

---

# 34. Criterios de aceptación

El sistema se considera funcional cuando:

- Un mozo puede abrir una mesa.
- Puede crear un pedido.
- Puede personalizar productos.
- Puede enviarlo a cocina.
- Cocina lo recibe en tiempo real.
- Cocina puede actualizar estados.
- El mozo puede ver que está listo.
- El cajero puede cobrar.
- Plin y transferencia exigen evidencia.
- La evidencia se almacena en Cloudinary.
- El pago digital puede aprobarse o rechazarse.
- No se puede cerrar una venta con saldo pendiente.
- La mesa se libera después del pago.
- La caja registra el efectivo.
- El administrador puede ver ventas y ganancias.
- Las acciones críticas quedan auditadas.
- El sistema evita duplicados.
- La interfaz funciona en computadora y celular.

---

# 35. Primera instrucción de ejecución

Antes de escribir código, responde con:

1. Tu comprensión del sistema.
2. Los módulos que vas a construir.
3. El flujo principal.
4. El modelo de datos propuesto.
5. Las decisiones técnicas.
6. Las dudas o riesgos que detectes.
7. El plan de implementación por fases.

Después de presentar ese análisis, comienza con:

- Inicialización del proyecto.
- Dependencias.
- Estructura de carpetas.
- Variables de entorno.
- Esquema inicial de Supabase.
- Sistema de autenticación.
- Roles y permisos.

No avances desordenadamente y no intentes desarrollar todo en un único archivo.
