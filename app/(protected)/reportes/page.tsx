import { BarChart3, CircleDollarSign, PackageSearch, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/pos/types";
import { ProductSalesDetails, type ProductSaleDetail } from "@/components/reports/product-sales-details";

export default async function ReportsPage() {
  const context = await requireRole("admin");
  const admin = createAdminClient(); const today = new Date(); today.setHours(0, 0, 0, 0);
  const [{ data: orders }, { data: expenses }, { data: items }] = await Promise.all([admin.from("orders").select("id, order_code, total, discount_total, paid_at, table_id, order_type").eq("branch_id", context.profile.branchId).eq("status", "paid").gte("paid_at", today.toISOString()), admin.from("expenses").select("amount").eq("branch_id", context.profile.branchId).eq("status", "active").eq("expense_date", today.toISOString().slice(0, 10)), admin.from("order_items").select("id, product_name_snapshot, variant_name_snapshot, quantity, estimated_cost_snapshot, line_total, order_id, notes, status").eq("branch_id", context.profile.branchId).neq("status", "cancelled").order("created_at", { ascending: false }).limit(1000)]);
  const paidOrders = (orders ?? []) as Array<{ id: string; order_code: string; total: number; discount_total: number; paid_at: string | null; table_id: string | null; order_type: string }>;
  const expenseRows = (expenses ?? []) as Array<{ amount: number }>;
  const itemRows = (items ?? []) as Array<{ id: string; product_name_snapshot: string; variant_name_snapshot: string | null; quantity: number; estimated_cost_snapshot: number; line_total: number; order_id: string; notes: string | null; status: string }>;
  const paidOrderIds = new Set(paidOrders.map((order) => order.id));
  const soldItems = itemRows.filter((item) => paidOrderIds.has(item.order_id));
  const soldItemIds = soldItems.map((item) => item.id);
  const tableIds = [...new Set(paidOrders.map((order) => order.table_id).filter((tableId): tableId is string => Boolean(tableId)))];
  const [modifierResult, tableResult] = await Promise.all([soldItemIds.length ? admin.from("order_item_modifiers").select("order_item_id, group_name_snapshot, option_name_snapshot, quantity").in("order_item_id", soldItemIds) : Promise.resolve({ data: [] }), tableIds.length ? admin.from("tables").select("id, table_number").in("id", tableIds) : Promise.resolve({ data: [] })]);
  const modifierData = modifierResult.data;
  const tableData = tableResult.data;
  const tableById = new Map(((tableData ?? []) as Array<{ id: string; table_number: number }>).map((table) => [table.id, `Mesa ${table.table_number}`]));
  const orderById = new Map(paidOrders.map((order) => [order.id, order]));
  const modifiersByItem = new Map<string, ProductSaleDetail["modifiers"]>();
  for (const modifier of (modifierData ?? []) as Array<{ order_item_id: string; group_name_snapshot: string; option_name_snapshot: string; quantity: number }>) {
    modifiersByItem.set(modifier.order_item_id, [...(modifiersByItem.get(modifier.order_item_id) ?? []), { group: modifier.group_name_snapshot, option: modifier.option_name_snapshot, quantity: Number(modifier.quantity) }]);
  }
  const detailsByProduct = new Map<string, ProductSaleDetail[]>();
  for (const item of soldItems) {
    const order = orderById.get(item.order_id);
    detailsByProduct.set(item.product_name_snapshot, [...(detailsByProduct.get(item.product_name_snapshot) ?? []), { quantity: Number(item.quantity), variant: item.variant_name_snapshot, modifiers: modifiersByItem.get(item.id) ?? [], notes: item.notes, soldAt: order?.paid_at ?? null, tableLabel: order?.table_id ? tableById.get(order.table_id) ?? "Mesa" : "Para llevar", orderCode: order?.order_code ?? "Pedido" }]);
  }
  const sales = paidOrders.reduce((sum, order) => sum + Number(order.total), 0); const cost = soldItems.reduce((sum, item) => sum + Number(item.estimated_cost_snapshot) * Number(item.quantity), 0); const expensesTotal = expenseRows.reduce((sum, expense) => sum + Number(expense.amount), 0); const gross = sales - cost; const net = gross - expensesTotal;
  const topProducts = Object.entries(soldItems.reduce<Record<string, number>>((result, item) => { result[item.product_name_snapshot] = (result[item.product_name_snapshot] ?? 0) + Number(item.quantity); return result; }, {})).sort(([, a], [, b]) => b - a).slice(0, 8);
  return <div className="mx-auto max-w-7xl space-y-6"><div className="flex items-end justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-olive">Lectura del negocio</p><h1 className="mt-2 font-display text-4xl font-bold">Reportes</h1><p className="mt-2 text-brand-olive">Resumen de hoy. El costo de producto es estimado hasta contar con recetas e inventario.</p></div><Badge variant="muted">Hoy</Badge></div><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric title="Ventas" value={formatCurrency(sales)} icon={CircleDollarSign} /><Metric title="Costo estimado" value={formatCurrency(cost)} icon={PackageSearch} /><Metric title="Ganancia bruta" value={formatCurrency(gross)} icon={BarChart3} /><Metric title="Ganancia neta" value={formatCurrency(net)} icon={Receipt} /></section><div className="grid gap-5 lg:grid-cols-[1fr_320px]"><Card><CardHeader><CardTitle>Productos más vendidos</CardTitle></CardHeader><CardContent className="space-y-3">{topProducts.length ? topProducts.map(([name, quantity], index) => <div key={name} className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-lg bg-brand-cream text-sm font-bold">{index + 1}</span><span className="min-w-0 flex-1 text-sm font-semibold">{name}</span><ProductSalesDetails productName={name} totalQuantity={quantity} details={detailsByProduct.get(name) ?? []} /><span className="text-sm text-brand-olive">{quantity} und.</span></div>) : <p className="py-8 text-center text-sm text-brand-olive">No hay ventas suficientes.</p>}</CardContent></Card><Card><CardHeader><CardTitle>Gastos de hoy</CardTitle></CardHeader><CardContent><p className="font-display text-3xl font-bold">{formatCurrency(expensesTotal)}</p><p className="mt-2 text-sm text-brand-olive">{expenseRows.length} registros activos</p></CardContent></Card></div></div>;
}

function Metric({ title, value, icon: Icon }: { title: string; value: string; icon: typeof CircleDollarSign }) { return <Card><CardContent className="pt-5"><Icon className="size-5 text-brand-gold" /><p className="mt-4 text-sm text-brand-olive">{title}</p><p className="mt-1 font-display text-2xl font-bold">{value}</p></CardContent></Card>; }
