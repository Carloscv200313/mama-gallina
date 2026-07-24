"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  BarChart3,
  ClipboardList,
  CookingPot,
  FileClock,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  Settings2,
  ShoppingBasket,
  Store,
  WalletCards,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { signOut } from "@/app/actions/auth";
import { ROLE_LABELS, type RoleKey } from "@/lib/auth/roles";
import type { AuthContext } from "@/lib/auth/server";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type AppShellProps = {
  context: AuthContext;
  children: React.ReactNode;
};

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "waiter", "kitchen", "cashier"] },
  { href: "/mesas", label: "Mesas", icon: Store, roles: ["admin", "waiter"] },
  { href: "/pedidos", label: "Pedidos", icon: ClipboardList, roles: ["admin", "waiter", "cashier"] },
  { href: "/cocina", label: "Cocina", icon: CookingPot, roles: ["admin", "kitchen"] },
  { href: "/caja", label: "Caja", icon: Banknote, roles: ["admin", "cashier"] },
  { href: "/ventas", label: "Ventas", icon: ReceiptText, roles: ["admin", "cashier"] },
  { href: "/productos", label: "Carta", icon: ShoppingBasket, roles: ["admin"] },
  { href: "/gastos", label: "Gastos", icon: WalletCards, roles: ["admin"] },
  { href: "/reportes", label: "Reportes", icon: BarChart3, roles: ["admin"] },
  { href: "/auditoria", label: "Auditoría", icon: FileClock, roles: ["admin"] },
  { href: "/usuarios", label: "Usuarios", icon: Users, roles: ["admin"] },
  { href: "/configuracion", label: "Configuración", icon: Settings2, roles: ["admin"] },
] satisfies Array<{ href: string; label: string; icon: typeof LayoutDashboard; roles: RoleKey[] }>;

export function AppShell({ context, children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleNavigation = navigation.filter((item) =>
    item.roles.some((role) => context.roles.includes(role)),
  );
  const primaryNavigation = visibleNavigation.slice(0, 5);

  return (
    <div className="min-h-screen bg-brand-cream text-brand-forest">
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-72 -translate-x-full flex-col border-r border-brand-olive/10 bg-white px-5 py-6 transition-transform lg:translate-x-0",
        mobileOpen && "translate-x-0",
      )}>
        <div className="mb-9 flex items-center justify-between px-2">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
            <span className="grid size-11 place-items-center rounded-2xl bg-brand-forest text-xl text-brand-gold">✦</span>
            <span>
              <span className="block font-display text-lg font-bold leading-none">Mamá Gallina</span>
              <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-olive">POS</span>
            </span>
          </Link>
          <button className="rounded-lg p-2 text-brand-olive lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú">
            <X className="size-5" />
          </button>
        </div>

        <nav className="space-y-1" aria-label="Navegación principal">
          {visibleNavigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-colors",
                  active ? "bg-brand-forest text-white shadow-sm" : "text-brand-olive hover:bg-brand-sage/15 hover:text-brand-forest",
                )}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl bg-brand-cream p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-olive">Local activo</p>
          <p className="mt-2 font-display font-semibold">Mamá Gallina</p>
          <p className="mt-1 text-xs text-brand-olive">Operación central</p>
        </div>
      </aside>

      {mobileOpen ? <button className="fixed inset-0 z-30 bg-brand-forest/35 lg:hidden" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} /> : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex min-h-18 items-center justify-between border-b border-brand-olive/10 bg-brand-cream/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded-xl border border-brand-olive/15 bg-white p-2.5 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menú">
              <Menu className="size-5" />
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-olive">Sistema de operación</p>
              <p className="font-display text-lg font-semibold">Hola, {context.profile.fullName.split(" ")[0]}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{ROLE_LABELS[context.roles[0]] ?? "Usuario"}</p>
              <p className="text-xs text-brand-olive">Sesión interna protegida</p>
            </div>
            <form action={signOut}>
              <Button variant="outline" size="icon" type="submit" aria-label="Cerrar sesión">
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        </header>
        <main className="min-h-[calc(100vh-4.5rem)] px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-20 grid grid-cols-5 rounded-2xl border border-brand-olive/10 bg-white/95 p-2 shadow-xl backdrop-blur lg:hidden" aria-label="Navegación móvil">
        {primaryNavigation.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} className={cn("flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold", active ? "bg-brand-forest text-white" : "text-brand-olive")}>
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
