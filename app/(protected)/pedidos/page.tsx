import Link from "next/link";
import { ClipboardList, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/server";
import { formatCurrency, orderStatusClass, orderStatusLabel } from "@/lib/pos/types";
import { createAdminClient } from "@/lib/supabase/admin";

type OrderRow = { id: string; order_code: string; parent_order_id: string | null; status: string; total: number; balance_due: number; order_type: string; opened_at: string; table_id: string | null; waiter_id: string };

export default async function OrdersPage() {
  const context = await requireRole("admin", "waiter", "cashier");
  const admin = createAdminClient();
  const { data: orderData, error } = await admin.from("orders").select("id, order_code, parent_order_id, status, total, balance_due, order_type, opened_at, table_id, waiter_id").eq("branch_id", context.profile.branchId).not("status", "eq", "cancelled").is("parent_order_id", null).order("created_at", { ascending: false }).limit(100);
  const orders = (orderData ?? []) as OrderRow[];
  const tableIds = [...new Set(orders.map((order) => order.table_id).filter(Boolean))] as string[];
  const waiterIds = [...new Set(orders.map((order) => order.waiter_id))];
  const [{ data: tableData }, { data: staffData }] = await Promise.all([tableIds.length ? admin.from("tables").select("id, table_number").in("id", tableIds) : Promise.resolve({ data: [] }), admin.from("staff_members").select("id, full_name").in("id", waiterIds)]);
  const tableMap = new Map(((tableData ?? []) as Array<{ id: string; table_number: number }>).map((table) => [table.id, table.table_number]));
  const staffMap = new Map(((staffData ?? []) as Array<{ id: string; full_name: string }>).map((staff) => [staff.id, staff.full_name]));
  return <div className="mx-auto max-w-7xl space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-olive">Operación</p><h1 className="mt-2 font-display text-4xl font-bold">Pedidos</h1><p className="mt-2 text-brand-olive">Seguimiento de pedidos abiertos y ventas por cobrar.</p></div>{context.roles.some((role) => role === "admin" || role === "waiter") ? <Button asChild><Link href="/pedidos/nuevo"><Plus className="size-4" /> Nuevo pedido</Link></Button> : null}</div>{error ? <Card><CardContent className="py-10 text-center text-red-700">No se pudieron cargar los pedidos.</CardContent></Card> : orders.length === 0 ? <Card><CardContent className="py-16 text-center"><ClipboardList className="mx-auto size-10 text-brand-olive/50" /><p className="mt-4 font-semibold">No hay pedidos todavía</p><p className="mt-1 text-sm text-brand-olive">Los pedidos nuevos aparecerán aquí.</p></CardContent></Card> : <Card><CardHeader><CardTitle className="flex items-center gap-2"><Search className="size-5" /> Últimos pedidos</CardTitle></CardHeader><CardContent className="space-y-3">{orders.map((order) => <Link key={order.id} href={`/pedidos/${order.id}`} className="flex flex-col gap-3 rounded-xl border border-brand-olive/10 p-4 transition hover:border-brand-olive/35 hover:bg-brand-cream sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{order.order_code}</span><Badge className={orderStatusClass(order.status)}>{orderStatusLabel(order.status)}</Badge></div><p className="mt-1 text-sm text-brand-olive">{order.order_type === "takeaway" ? "Para llevar" : `Mesa ${order.table_id ? tableMap.get(order.table_id) ?? "-" : "-"}`} · {staffMap.get(order.waiter_id) ?? "Sin asignar"} · {new Date(order.opened_at).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}</p></div><div className="text-left sm:text-right"><p className="font-display text-lg font-bold">{formatCurrency(Number(order.total))}</p>{Number(order.balance_due) > 0 ? <p className="text-xs text-red-700">Saldo: {formatCurrency(Number(order.balance_due))}</p> : null}</div></Link>)}</CardContent></Card>}</div>;
}
