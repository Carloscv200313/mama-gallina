import Link from "next/link";
import { Activity, Banknote, ChefHat, CircleDollarSign, Clock3, LayoutGrid, Receipt, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth/server";
import { getLimaDayRange } from "@/lib/pos/date";
import { createAdminClient } from "@/lib/supabase/admin";

type Metric = { label: string; value: string; detail: string; icon: typeof TrendingUp; tone: string };

export default async function DashboardPage() {
  const context = await requireAuth();
  const metrics = await getDashboardMetrics(context.profile.branchId);
  const role = context.roles[0];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-olive">Resumen operativo</p><h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Dashboard</h1><p className="mt-2 text-brand-olive">Lo importante del turno, en una mirada.</p></div><Badge variant="success"><Activity className="mr-1 size-3.5" /> Datos conectados</Badge></div>
      {!context.profile.branchId ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Tu perfil todavía no tiene un local asignado. Un administrador debe completar esta asignación antes de operar.</div> : null}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}</section>
      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <Card><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Estado del turno</CardTitle><p className="mt-1 text-sm text-brand-olive">Indicadores reales de la operación actual.</p></div><Clock3 className="size-5 text-brand-gold" /></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-3"><StatusBox icon={LayoutGrid} label="Mesas ocupadas" value={metrics.find((item) => item.label === "Mesas ocupadas")?.value ?? "0"} /><StatusBox icon={ChefHat} label="En cocina" value={metrics.find((item) => item.label === "Pedidos activos")?.value ?? "0"} /><StatusBox icon={Banknote} label="Caja" value={metrics.find((item) => item.label === "Caja")?.value ?? "Cerrada"} /></div></CardContent></Card>
        <Card><CardHeader><CardTitle>Accesos rápidos</CardTitle></CardHeader><CardContent className="space-y-3"><QuickLink href="/mesas" icon={LayoutGrid} text="Abrir mapa de mesas" /><QuickLink href="/cocina" icon={ChefHat} text="Ver cocina" /><QuickLink href="/caja" icon={Banknote} text="Revisar caja" /></CardContent></Card>
      </section>
      <Card><CardHeader><CardTitle>Rol activo</CardTitle></CardHeader><CardContent><div className="flex flex-col gap-3 rounded-xl bg-brand-cream p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{role === "admin" ? "Administración completa" : role === "waiter" ? "Atención de mesas" : role === "kitchen" ? "Operación de cocina" : "Control de caja"}</p><p className="mt-1 text-sm text-brand-olive">Las opciones visibles se ajustan a tus permisos y a tu local asignado.</p></div><Badge variant="muted">{context.roles.length} rol{context.roles.length === 1 ? "" : "es"}</Badge></div></CardContent></Card>
    </div>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon;
  return <Card><CardContent className="flex items-start justify-between gap-3 pt-5"><div><p className="text-sm text-brand-olive">{metric.label}</p><p className="mt-2 font-display text-3xl font-bold">{metric.value}</p><p className="mt-2 text-xs text-brand-olive">{metric.detail}</p></div><span className={`grid size-10 place-items-center rounded-xl ${metric.tone}`}><Icon className="size-5" /></span></CardContent></Card>;
}

function StatusBox({ icon: Icon, label, value }: { icon: typeof LayoutGrid; label: string; value: string }) {
  return <div className="rounded-xl border border-brand-olive/10 p-4"><Icon className="size-5 text-brand-olive" /><p className="mt-4 text-xs text-brand-olive">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>;
}

function QuickLink({ href, icon: Icon, text }: { href: string; icon: typeof LayoutGrid; text: string }) {
  return <Link href={href} className="flex items-center gap-3 rounded-xl border border-brand-olive/10 p-3 text-sm font-semibold transition hover:border-brand-olive/30 hover:bg-brand-cream"><span className="grid size-9 place-items-center rounded-lg bg-brand-sage/20"><Icon className="size-4" /></span>{text}</Link>;
}

async function getDashboardMetrics(branchId: string | null): Promise<Metric[]> {
  const empty: Metric[] = [
    { label: "Ventas del día", value: "S/ 0.00", detail: "Sin ventas cerradas", icon: TrendingUp, tone: "bg-brand-sage/20 text-brand-forest" },
    { label: "Pedidos activos", value: "0", detail: "En operación", icon: Receipt, tone: "bg-brand-gold/20 text-brand-brown" },
    { label: "Mesas ocupadas", value: "0", detail: "De la sala", icon: LayoutGrid, tone: "bg-brand-sage/20 text-brand-forest" },
    { label: "Caja", value: "Cerrada", detail: "Sin sesión abierta", icon: CircleDollarSign, tone: "bg-brand-gold/20 text-brand-brown" },
  ];
  if (!branchId) return empty;
  const supabase = createAdminClient();
  const { start: limaDayStart, end: limaDayEnd } = getLimaDayRange();
  const [{ data: paidOrders }, { count: activeOrders }, { count: occupiedTables }, { data: openCash }] = await Promise.all([
    supabase.from("orders").select("total").eq("branch_id", branchId).eq("status", "paid").is("parent_order_id", null).gte("paid_at", limaDayStart.toISOString()).lt("paid_at", limaDayEnd.toISOString()),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("branch_id", branchId).in("status", ["confirmed", "sent_to_kitchen", "preparing", "partially_ready", "ready", "delivered", "payment_pending"]),
    supabase.from("orders").select("table_id", { count: "exact", head: true }).eq("branch_id", branchId).in("status", ["draft", "confirmed", "sent_to_kitchen", "preparing", "partially_ready", "ready", "delivered", "payment_pending"]),
    supabase.from("cash_sessions").select("id").eq("branch_id", branchId).eq("status", "open").limit(1),
  ]);
  const total = (paidOrders ?? []).reduce((sum, order) => sum + Number(order.total ?? 0), 0);
  return [
    { label: "Ventas del día", value: `S/ ${total.toFixed(2)}`, detail: "Ventas pagadas", icon: TrendingUp, tone: "bg-brand-sage/20 text-brand-forest" },
    { label: "Pedidos activos", value: String(activeOrders ?? 0), detail: "En operación", icon: Receipt, tone: "bg-brand-gold/20 text-brand-brown" },
    { label: "Mesas ocupadas", value: String(occupiedTables ?? 0), detail: "Con pedido activo", icon: LayoutGrid, tone: "bg-brand-sage/20 text-brand-forest" },
    { label: "Caja", value: openCash && openCash.length > 0 ? "Abierta" : "Cerrada", detail: openCash && openCash.length > 0 ? "Sesión activa" : "Sin sesión abierta", icon: CircleDollarSign, tone: "bg-brand-gold/20 text-brand-brown" },
  ];
}
