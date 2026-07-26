"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
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
import type { RoleKey } from "@/lib/auth/roles";
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const visibleNavigation = navigation.filter((item) =>
    item.roles.some((role) => context.roles.includes(role)),
  );
  const primaryNavigation = visibleNavigation.slice(0, 5);

  return (
    <div className="min-h-screen bg-brand-cream text-brand-forest">
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-72 -translate-x-full flex-col overflow-y-auto border-r border-brand-olive/10 bg-white px-5 py-6 transition-[width,transform,padding] duration-200 lg:translate-x-0",
        sidebarCollapsed && "lg:w-20 lg:px-3",
        mobileOpen && "translate-x-0",
      )}>
        <div className={cn("mb-5 flex items-center px-2", sidebarCollapsed ? "justify-center" : "justify-between")}>
          <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setMobileOpen(false)} aria-label="Ir al dashboard">
            <span className="grid size-11 place-items-center rounded-2xl bg-brand-forest text-xl text-brand-gold">✦</span>
            <span className={cn(sidebarCollapsed && "lg:hidden")}>
              <span className="block font-display text-lg font-bold leading-none">Mamá Gallina</span>
              <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-olive">POS</span>
            </span>
          </Link>
          <button className="rounded-lg p-2 text-brand-olive lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú">
            <X className="size-5" />
          </button>
        </div>

        <div className={cn("mb-4 hidden px-2 lg:flex", sidebarCollapsed ? "justify-center" : "justify-start")}>
          <button type="button" onClick={() => setSidebarCollapsed((current) => !current)} className={cn("inline-flex items-center gap-2 rounded-xl border border-brand-olive/15 bg-white p-2 text-sm font-semibold text-brand-olive shadow-sm transition hover:bg-brand-cream hover:text-brand-forest", !sidebarCollapsed && "px-3")} aria-label={sidebarCollapsed ? "Expandir Sidebar" : "Reducir Sidebar"} title={sidebarCollapsed ? "Expandir Sidebar" : undefined}>
            {sidebarCollapsed ? <ChevronsRight className="size-5" /> : <ChevronsLeft className="size-5" />}
            <span className={cn(sidebarCollapsed && "hidden")}>{sidebarCollapsed ? "Expandir Sidebar" : "Reducir Sidebar"}</span>
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
                  sidebarCollapsed && "lg:justify-center lg:px-0",
                  active ? "bg-brand-forest text-white shadow-sm" : "text-brand-olive hover:bg-brand-sage/15 hover:text-brand-forest",
                )}
                aria-label={item.label}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className="size-5" />
                <span className={cn(sidebarCollapsed && "lg:hidden")}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={cn("mt-auto rounded-2xl bg-brand-cream p-4", sidebarCollapsed && "lg:p-2 lg:text-center")} title={sidebarCollapsed ? "Local activo: Mamá Gallina" : undefined}>
          {sidebarCollapsed ? <span className="hidden text-lg lg:block">✦</span> : null}
          <div className={cn(sidebarCollapsed && "lg:hidden")}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-olive">Local activo</p>
            <p className="mt-2 font-display font-semibold">Mamá Gallina</p>
            <p className="mt-1 text-xs text-brand-olive">Operación central</p>
          </div>
        </div>

        <form action={signOut} className="mt-4">
          <Button variant="outline" type="submit" className={cn("w-full justify-start gap-3", sidebarCollapsed && "lg:size-11 lg:justify-center lg:px-0")} aria-label="Cerrar sesión" title={sidebarCollapsed ? "Cerrar sesión" : undefined}>
            <LogOut className="size-4" />
            <span className={cn(sidebarCollapsed && "lg:hidden")}>Cerrar sesión</span>
          </Button>
        </form>
      </aside>

      {mobileOpen ? <button className="fixed inset-0 z-30 bg-brand-forest/35 lg:hidden" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} /> : null}

      <div className={cn("transition-[padding] duration-200 lg:pl-72", sidebarCollapsed && "lg:pl-20")}>
        <button className="fixed left-4 top-4 z-20 rounded-xl border border-brand-olive/15 bg-white p-2.5 shadow-sm lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menú">
          <Menu className="size-5" />
        </button>
        <main className="min-h-screen px-4 pb-24 pt-20 md:px-8 md:py-8 lg:pt-8">{children}</main>
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
