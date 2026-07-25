import Link from "next/link";
import { ArrowRight, LayoutGrid, Plus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/server";
import { getTablesWithOrders } from "@/lib/pos/data";
import { formatCurrency, orderStatusClass, orderStatusLabel } from "@/lib/pos/types";
import { QuickChargeModal } from "@/components/cash/quick-charge-modal";

export default async function TablesPage() {
  const context = await requireRole("admin", "waiter");
  const tables = await getTablesWithOrders(context.profile.branchId);
  const occupied = tables.filter((table) => table.order).length;
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-olive">Sala y atención</p><h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Mapa de mesas</h1><p className="mt-2 text-brand-olive">Abre pedidos y revisa el estado de cada mesa.</p></div>
        <div className="flex gap-2"><Badge variant="muted"><LayoutGrid className="mr-1 size-3.5" /> {occupied} ocupadas</Badge><Button asChild><Link href="/pedidos/nuevo?type=takeaway"><Plus className="size-4" /> Pedido para llevar</Link></Button></div>
      </div>
      {tables.length === 0 ? <Card><CardContent className="py-16 text-center"><LayoutGrid className="mx-auto size-10 text-brand-olive/50" /><p className="mt-4 font-semibold">No hay mesas configuradas</p><p className="mt-1 text-sm text-brand-olive">Un administrador debe agregar mesas al local.</p></CardContent></Card> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{tables.map((table) => <TableCard key={table.id} table={table} />)}</div>}
    </div>
  );
}

function TableCard({ table }: { table: Awaited<ReturnType<typeof getTablesWithOrders>>[number] }) {
  const active = Boolean(table.order);
  return <Card className={active ? "border-brand-olive/30" : ""}>
    <CardHeader className="flex-row items-start justify-between"><div><CardTitle>Mesa {table.tableNumber}</CardTitle><p className="mt-1 text-sm text-brand-olive">{table.name ?? "Mesa de salón"} · {table.capacity} personas</p></div><span className={`size-3 rounded-full ${table.status === "out_of_service" ? "bg-red-500" : active ? "bg-amber-500" : "bg-emerald-500"}`} /></CardHeader>
    <CardContent className="space-y-4">
      {table.status === "out_of_service" ? <Badge variant="danger">Fuera de servicio</Badge> : table.order ? <><div className="flex items-center justify-between"><Badge className={orderStatusClass(table.order.status)}>{orderStatusLabel(table.order.status)}</Badge><span className="font-semibold">{formatCurrency(table.order.total)}</span></div><div className="flex items-center gap-2 text-xs text-brand-olive"><Users className="size-3.5" /> {table.order.waiterName} · {table.order.orderCode}</div><div className="grid gap-2 sm:grid-cols-2"><Button asChild variant="outline" className="w-full"><Link href={`/pedidos/${table.order.id}`}>Ver pedido <ArrowRight className="size-4" /></Link></Button><Button asChild className="w-full"><Link href={`/pedidos/nuevo?tableId=${table.id}&parentOrderId=${table.order.id}`}><Plus className="size-4" /> Agregar pedido</Link></Button>{["ready", "delivered", "payment_pending"].includes(table.order.status) ? <QuickChargeModal orderId={table.order.id} orderCode={table.order.orderCode} total={table.order.total} /> : null}</div></> : <Button asChild className="w-full"><Link href={`/pedidos/nuevo?tableId=${table.id}`}><Plus className="size-4" /> Abrir pedido</Link></Button>}
    </CardContent>
  </Card>;
}
