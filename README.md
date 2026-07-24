# Mamá Gallina POS

Sistema de pedidos, cocina, caja y control de ventas para el restaurante Mamá Gallina.

La primera fase incluye acceso interno por nombre + PIN, roles, RLS, estructura multi-local, seed inicial, firma Cloudinary por carpeta y el flujo operativo de mesas → pedido → cocina → caja → venta, además de carta, gastos, reportes, auditoría y configuración. Consulta [docs/architecture.md](docs/architecture.md) y [docs/bootstrap.md](docs/bootstrap.md) antes de conectar un entorno.

## Desarrollo

```bash
cp .env.example .env.local
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000). Para aplicar la base de datos, sigue el orden de [docs/bootstrap.md](docs/bootstrap.md).

El proyecto usa Next.js 16 App Router, TypeScript, Tailwind CSS v4, Supabase como base de datos, Zod, React Hook Form y primitives con patrón shadcn/ui.

## Calidad

```bash
pnpm lint
pnpm typecheck
pnpm build
```
