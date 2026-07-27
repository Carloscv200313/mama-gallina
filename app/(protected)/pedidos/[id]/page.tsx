import Link from "next/link";
import { ArrowLeft, Utensils } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/server";
import { formatLimaDateTime } from "@/lib/pos/date";
import { formatCurrency, orderStatusClass, orderStatusLabel } from "@/lib/pos/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { OrderDetailActions } from "@/components/orders/order-detail-actions";
import { OrderItemRemoveButton } from "@/components/orders/order-item-remove-button";

type Order = { id: string; order_code: string; parent_order_id: string | null; status: string; total: number; subtotal: number; balance_due: number; payment_total: number; order_type: string; table_id: string | null; waiter_id: string; customer_name: string | null; notes: string | null; opened_at: string; sent_to_kitchen_at: string | null };
type Item = { id: string; order_id: string; product_name_snapshot: string; variant_name_snapshot: string | null; quantity: number; unit_price: number; modifiers_total: number; line_total: number; notes: string | null; priority: string; status: string };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireRole("admin", "waiter", "cashier", "kitchen");
  const { id } = await params;
  const admin = createAdminClient();
  const { data: orderData } = await admin.from("orders").select("id, order_code, parent_order_id, status, total, subtotal, balance_due, payment_total, order_type, table_id, waiter_id, customer_name, notes, opened_at, sent_to_kitchen_at").eq("id", id).eq("branch_id", context.profile.branchId).maybeSingle();
  const order = orderData as Order | null;
  if (!order) return <div className="mx-auto max-w-3xl"><Card><CardContent className="py-16 text-center"><p className="font-semibold">Pedido no encontrado</p><Button asChild variant="outline" className="mt-5"><Link href="/pedidos">Volver a pedidos</Link></Button></CardContent></Card></div>;

  const rootOrderId = order.parent_order_id ?? order.id;
  const [{ data: rootData }, { data: relatedOrderData }] = await Promise.all([
    rootOrderId === order.id ? Promise.resolve({ data: order }) : admin.from("orders").select("id, order_code, parent_order_id, status, total, subtotal, balance_due, payment_total, order_type, table_id, waiter_id, customer_name, notes, opened_at, sent_to_kitchen_at").eq("id", rootOrderId).eq("branch_id", context.profile.branchId).maybeSingle(),
    admin.from("orders").select("id, order_code, parent_order_id").eq("branch_id", context.profile.branchId).or(`id.eq.${rootOrderId},parent_order_id.eq.${rootOrderId}`).order("created_at"),
  ]);
  const displayOrder = (rootData ?? order) as Order;
  const relatedOrders = (relatedOrderData ?? []) as Array<{ id: string; order_code: string; parent_order_id: string | null }>;
  const sessionOrderIds = relatedOrders.length ? relatedOrders.map((related) => related.id) : [rootOrderId];
  const { data: itemData } = await admin.from("order_items").select("id, order_id, product_name_snapshot, variant_name_snapshot, quantity, unit_price, modifiers_total, line_total, notes, priority, status").in("order_id", sessionOrderIds).order("created_at");
  const items = (itemData ?? []) as Item[];
  const { data: modifierData } = items.length ? await admin.from("order_item_modifiers").select("order_item_id, option_name_snapshot, additional_price, quantity").in("order_item_id", items.map((item) => item.id)) : { data: [] };
  const modifiersByItem = new Map<string, Array<{ option_name_snapshot: string; additional_price: number; quantity: number }>>();
  for (const modifier of (modifierData ?? []) as Array<{ order_item_id: string; option_name_snapshot: string; additional_price: number; quantity: number }>) modifiersByItem.set(modifier.order_item_id, [...(modifiersByItem.get(modifier.order_item_id) ?? []), modifier]);
  const codeByOrder = new Map(relatedOrders.map((related) => [related.id, related.order_code]));
  const hasAdditionalOrders = relatedOrders.some((related) => related.parent_order_id === rootOrderId);
  const canEdit = (context.roles.includes("admin") || context.roles.includes("waiter")) && (displayOrder.waiter_id === context.staffId || context.roles.includes("admin")) && !hasAdditionalOrders && !["payment_pending", "paid", "cancelled"].includes(displayOrder.status);
  const canCancelPendingItem = (context.roles.includes("admin") || context.roles.includes("waiter")) && (displayOrder.waiter_id === context.staffId || context.roles.includes("admin")) && !["payment_pending", "paid", "cancelled"].includes(displayOrder.status);

  return <div className="mx-auto max-w-5xl space-y-6"><div className="flex items-start gap-3"><Button asChild variant="ghost" size="icon"><Link href="/pedidos"><ArrowLeft className="size-5" /></Link></Button><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-olive">Cuenta de la mesa</p><h1 className="mt-1 font-display text-4xl font-bold">{displayOrder.order_code}</h1><p className="mt-2 text-sm text-brand-olive">{displayOrder.order_type === "takeaway" ? "Para llevar" : "Pedido en mesa"} · {formatLimaDateTime(displayOrder.opened_at)}</p></div><Badge className={`ml-auto ${orderStatusClass(displayOrder.status)}`}>{orderStatusLabel(displayOrder.status)}</Badge></div><div className="grid gap-5 lg:grid-cols-[1fr_320px]"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Utensils className="size-5" /> Productos{hasAdditionalOrders ? <Badge variant="muted">{relatedOrders.length} tandas</Badge> : null}</CardTitle></CardHeader><CardContent className="space-y-3">{items.map((item) => <div key={item.id} className="rounded-xl border border-brand-olive/10 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{item.quantity} × {item.product_name_snapshot}</p>{item.order_id !== rootOrderId ? <p className="text-xs font-semibold text-brand-olive">Nueva tanda · {codeByOrder.get(item.order_id) ?? "Pedido adicional"}</p> : null}{item.variant_name_snapshot ? <p className="text-sm text-brand-olive">{item.variant_name_snapshot}</p> : null}{modifiersByItem.get(item.id)?.length ? <p className="mt-1 text-xs text-brand-olive">{modifiersByItem.get(item.id)?.map((modifier) => `${modifier.option_name_snapshot}${modifier.quantity > 1 ? ` × ${modifier.quantity}` : ""}`).join(" · ")}</p> : null}{item.notes ? <p className="mt-2 text-xs italic text-brand-brown">Nota: {item.notes}</p> : null}</div><div className="text-right"><Badge variant="muted">{item.status === "pending" ? "Pendiente" : item.status === "preparing" ? "En preparación" : item.status === "ready" ? "Listo" : item.status === "delivered" ? "Entregado" : "Anulado"}</Badge><p className="mt-2 font-semibold">{formatCurrency(Number(item.line_total))}</p>{canCancelPendingItem ? <div className="mt-2"><OrderItemRemoveButton itemId={item.id} productName={item.product_name_snapshot} quantity={item.quantity} canRemove={item.status !== "cancelled"} /></div> : null}</div></div></div>)}</CardContent></Card><div className="space-y-5"><Card><CardHeader><CardTitle>Resumen de pago</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex justify-between"><span className="text-brand-olive">Subtotal</span><span>{formatCurrency(Number(displayOrder.subtotal))}</span></div><div className="flex justify-between border-t border-brand-olive/10 pt-3 text-lg font-bold"><span>Total</span><span>{formatCurrency(Number(displayOrder.total))}</span></div><div className="flex justify-between"><span className="text-brand-olive">Pagado</span><span>{formatCurrency(Number(displayOrder.payment_total))}</span></div><div className="flex justify-between font-semibold text-red-700"><span>Saldo</span><span>{formatCurrency(Number(displayOrder.balance_due))}</span></div></CardContent></Card><OrderDetailActions orderId={rootOrderId} status={displayOrder.status} roles={context.roles} tableId={displayOrder.table_id} orderCode={displayOrder.order_code} total={Number(displayOrder.balance_due)} canEdit={canEdit} /></div></div></div>;
}
