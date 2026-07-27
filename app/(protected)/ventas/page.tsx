import { BarChart3, ReceiptText, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatLimaDateTime } from "@/lib/pos/date";
import { formatCurrency } from "@/lib/pos/types";

export default async function SalesPage() {
  const context = await requireRole("admin", "cashier");
  const admin = createAdminClient();
  const { data: openSession } = await admin.from("cash_sessions").select("id, opened_at").eq("branch_id", context.profile.branchId).eq("status", "open").order("opened_at", { ascending: false }).limit(1).maybeSingle();
  if (!openSession) return <NoOpenCashSales />;
  const { data: orderData } = await admin.from("orders").select("id, order_code, total, payment_total, order_type, paid_at, waiter_id").eq("branch_id", context.profile.branchId).eq("status", "paid").is("parent_order_id", null).gte("paid_at", openSession.opened_at).lt("paid_at", new Date().toISOString()).order("paid_at", { ascending: false }).limit(200);
  const orders = (orderData ?? []) as Array<{ id: string; order_code: string; total: number; payment_total: number; order_type: string; paid_at: string; waiter_id: string }>;
  const orderIds = orders.map((order) => order.id);
  const [{ data: paymentData }, { data: staffData }] = await Promise.all([orderIds.length ? admin.from("payments").select("order_id, method, amount, status").in("order_id", orderIds) : Promise.resolve({ data: [] }), admin.from("staff_members").select("id, full_name").in("id", [...new Set(orders.map((order) => order.waiter_id))])]);
  const payments = (paymentData ?? []) as Array<{ order_id: string; method: string; amount: number; status: string }>;
  const staffMap = new Map(((staffData ?? []) as Array<{ id: string; full_name: string }>).map((staff) => [staff.id, staff.full_name]));
  const total = orders.reduce((sum, order) => sum + Number(order.total), 0); const average = orders.length ? total / orders.length : 0;
  const byMethod = payments.reduce<Record<string, number>>((result, payment) => { if (!result[payment.method]) result[payment.method] = 0; result[payment.method] += Number(payment.amount); return result; }, {});
  return <div className="mx-auto max-w-7xl space-y-6"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-olive">Historial financiero</p><h1 className="mt-2 font-display text-4xl font-bold">Ventas</h1><p className="mt-2 text-brand-olive">Ventas pagadas de la caja abierta y distribución por método.</p></div><section className="grid gap-4 sm:grid-cols-3"><Metric title="Ventas de la caja" value={formatCurrency(total)} icon={TrendingUp} /><Metric title="Pedidos cerrados" value={String(orders.length)} icon={ReceiptText} /><Metric title="Ticket promedio" value={formatCurrency(average)} icon={BarChart3} /></section><div className="grid gap-5 lg:grid-cols-[280px_1fr]"><Card><CardHeader><CardTitle>Por método</CardTitle></CardHeader><CardContent className="space-y-3">{Object.entries(byMethod).length ? Object.entries(byMethod).map(([method, amount]) => <div key={method} className="flex justify-between text-sm"><span>{method === "cash" ? "Efectivo" : method === "yape" ? "Yape" : method === "plin" ? "Plin" : "Transferencia"}</span><span className="font-semibold">{formatCurrency(amount)}</span></div>) : <p className="text-sm text-brand-olive">Sin pagos registrados.</p>}</CardContent></Card><Card><CardHeader><CardTitle>Ventas de la sesión abierta</CardTitle></CardHeader><CardContent className="space-y-3">{orders.length === 0 ? <p className="py-8 text-center text-sm text-brand-olive">No hay ventas en la caja abierta.</p> : orders.map((order) => <div key={order.id} className="flex flex-col gap-2 rounded-xl border border-brand-olive/10 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{order.order_code}</p><p className="text-xs text-brand-olive">{order.order_type === "takeaway" ? "Para llevar" : "Mesa"} · {staffMap.get(order.waiter_id) ?? "Sin asignar"} · {formatLimaDateTime(order.paid_at)}</p></div><span className="font-display font-bold">{formatCurrency(Number(order.total))}</span></div>)}</CardContent></Card></div></div>;
}

function NoOpenCashSales() {
  return <div className="mx-auto max-w-7xl space-y-6"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-olive">Historial financiero</p><h1 className="mt-2 font-display text-4xl font-bold">Ventas</h1><p className="mt-2 text-brand-olive">Las ventas se muestran únicamente mientras existe una caja abierta.</p></div><Card><CardContent className="py-16 text-center"><TrendingUp className="mx-auto size-10 text-brand-gold" /><h2 className="mt-4 font-display text-2xl font-bold">No hay una caja abierta</h2><p className="mx-auto mt-2 max-w-md text-sm text-brand-olive">Abre una caja para consultar sus ventas. Las cajas cerradas y sus productos están disponibles desde el historial de caja.</p></CardContent></Card></div>;
}

function Metric({ title, value, icon: Icon }: { title: string; value: string; icon: typeof TrendingUp }) { return <Card><CardContent className="flex items-center justify-between pt-5"><div><p className="text-sm text-brand-olive">{title}</p><p className="mt-2 font-display text-2xl font-bold">{value}</p></div><Icon className="size-6 text-brand-gold" /></CardContent></Card>; }
