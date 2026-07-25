import { CookingPot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { KitchenBoard } from "@/components/kitchen/kitchen-board";

type KitchenItem = { id: string; orderId: string; orderCode: string; tableLabel: string; openedAt: string; elapsedMinutes: number; productName: string; variantName: string | null; modifierLabels: string[]; quantity: number; notes: string | null; priority: string; status: string };

export default async function KitchenPage() {
  const context = await requireRole("admin", "kitchen");
  const admin = createAdminClient();
  const { data: orderData } = await admin.from("orders").select("id, order_code, parent_order_id, table_id, opened_at, status").eq("branch_id", context.profile.branchId).in("status", ["sent_to_kitchen", "preparing", "partially_ready", "ready"]).order("opened_at");
  const orders = (orderData ?? []) as Array<{ id: string; order_code: string; parent_order_id: string | null; table_id: string | null; opened_at: string; status: string }>;
  const orderIds = orders.map((order) => order.id);
  const tableIds = orders.map((order) => order.table_id).filter(Boolean) as string[];
  const [{ data: itemData }, { data: tableData }] = await Promise.all([orderIds.length ? admin.from("order_items").select("id, order_id, product_name_snapshot, variant_name_snapshot, quantity, notes, priority, status").in("order_id", orderIds).neq("status", "cancelled").order("created_at") : Promise.resolve({ data: [] }), tableIds.length ? admin.from("tables").select("id, table_number").in("id", tableIds) : Promise.resolve({ data: [] })]);
  const itemIds = ((itemData ?? []) as Array<{ id: string }>).map((item) => item.id);
  const { data: modifierData } = itemIds.length ? await admin.from("order_item_modifiers").select("order_item_id, option_name_snapshot, quantity").in("order_item_id", itemIds) : { data: [] };
  const modifiersByItem = new Map<string, string[]>();
  for (const modifier of (modifierData ?? []) as Array<{ order_item_id: string; option_name_snapshot: string; quantity: number }>) modifiersByItem.set(modifier.order_item_id, [...(modifiersByItem.get(modifier.order_item_id) ?? []), `${modifier.option_name_snapshot}${modifier.quantity > 1 ? ` × ${modifier.quantity}` : ""}`]);
  const tableMap = new Map(((tableData ?? []) as Array<{ id: string; table_number: number }>).map((table) => [table.id, `Mesa ${table.table_number}`]));
  const orderMap = new Map(orders.map((order) => [order.id, order]));
  const items: KitchenItem[] = ((itemData ?? []) as Array<{ id: string; order_id: string; product_name_snapshot: string; variant_name_snapshot: string | null; quantity: number; notes: string | null; priority: string; status: string }>).map((item) => { const order = orderMap.get(item.order_id); const openedAt = order?.opened_at ?? new Date().toISOString(); return { id: item.id, orderId: item.order_id, orderCode: order?.parent_order_id ? `${order.order_code} · Nueva tanda` : order?.order_code ?? "Pedido", tableLabel: order?.table_id ? tableMap.get(order.table_id) ?? "Mesa" : "Para llevar", openedAt, elapsedMinutes: 0, productName: item.product_name_snapshot, variantName: item.variant_name_snapshot, modifierLabels: modifiersByItem.get(item.id) ?? [], quantity: item.quantity, notes: item.notes, priority: item.priority, status: item.status }; });
  return <div className="mx-auto max-w-7xl space-y-6"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-olive">Producción</p><div className="mt-2 flex items-center gap-3"><h1 className="font-display text-4xl font-bold">Cocina</h1><Badge variant="warning"><CookingPot className="mr-1 size-3.5" /> {items.length} productos</Badge></div><p className="mt-2 text-brand-olive">Actualiza cada producto para que atención vea el avance en tiempo real.</p></div><KitchenBoard items={items} branchId={context.profile.branchId} /></div>;
}
