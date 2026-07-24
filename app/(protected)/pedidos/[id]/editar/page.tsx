import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OrderComposer } from "@/components/orders/order-composer";
import { requireRole } from "@/lib/auth/server";
import { getCatalog } from "@/lib/pos/data";
import type { CatalogProduct, OrderComposerItem } from "@/lib/pos/types";
import { createAdminClient } from "@/lib/supabase/admin";

type OrderRow = { id: string; order_type: "dine_in" | "takeaway"; table_id: string | null; status: string; notes: string | null };
type ItemRow = { id: string; product_id: string; variant_id: string | null; product_name_snapshot: string; variant_name_snapshot: string | null; quantity: number; unit_price: number; line_total: number; notes: string | null; priority: "normal" | "high"; status: string };
type ModifierRow = { order_item_id: string; modifier_group_id: string; option_name_snapshot: string; group_name_snapshot: string; quantity: number };

function isPlainBroth(product: CatalogProduct) {
  return ["caldo de cordero", "caldo de mote", "caldo combinado"].includes(product.name.trim().toLocaleLowerCase());
}

function isPerPlateGroup(product: CatalogProduct, groupId: string) {
  const group = product.modifierGroups.find((value) => value.id === groupId);
  const groupName = group?.name.trim().toLocaleLowerCase() ?? "";
  const productName = product.name.trim().toLocaleLowerCase();
  if (isPlainBroth(product)) return false;
  return groupName === "extras" || groupName.includes("sabores") || (groupName === "presa" && (productName === "caldo de gallina" || productName === "caldo acevichado")) || (groupName === "preferencias" && productName === "caldo acevichado");
}

function buildInitialItem(item: ItemRow, product: CatalogProduct, modifiers: ModifierRow[]): OrderComposerItem {
  const safeModifiers = isPlainBroth(product) ? [] : modifiers;
  const plateSelections = Array.from({ length: item.quantity }, () => ({} as Record<string, string[]>));
  const modifierIds = safeModifiers.map((modifier) => ({ groupId: modifier.modifier_group_id, optionId: "", quantity: modifier.quantity }));
  const labels: string[] = [];
  for (const modifier of safeModifiers) {
    const option = product.modifierGroups.flatMap((group) => group.options).find((value) => value.name === modifier.option_name_snapshot);
    const optionId = option?.id ?? "";
    const current = modifierIds.find((value) => value.groupId === modifier.modifier_group_id && value.optionId === optionId);
    if (current) current.optionId = optionId;
    if (isPerPlateGroup(product, modifier.modifier_group_id)) {
      let remaining = modifier.quantity;
      for (let plateIndex = 0; plateIndex < plateSelections.length && remaining > 0; plateIndex += 1) {
        const values = plateSelections[plateIndex][modifier.modifier_group_id] ?? [];
        if (!values.includes(optionId)) {
          plateSelections[plateIndex][modifier.modifier_group_id] = [...values, optionId];
          remaining -= 1;
        }
      }
      labels.push(`${modifier.group_name_snapshot}: ${modifier.option_name_snapshot} (${modifier.quantity} ${modifier.quantity === 1 ? "plato" : "platos"})`);
    } else {
      labels.push(modifier.option_name_snapshot);
    }
  }
  const validModifierIds = modifierIds.filter((modifier) => modifier.optionId);
  const perPlate = validModifierIds.filter((modifier) => isPerPlateGroup(product, modifier.groupId));
  const shared = validModifierIds.filter((modifier) => !isPerPlateGroup(product, modifier.groupId));
  const modifierTotal = Number(item.line_total) / item.quantity - Number(item.unit_price);
  return { localId: item.id, productId: item.product_id, variantId: item.variant_id, productName: item.product_name_snapshot, variantName: item.variant_name_snapshot, quantity: item.quantity, unitPrice: Number(item.unit_price), modifiersTotal: Number.isFinite(modifierTotal) ? modifierTotal : Number(item.line_total) / item.quantity - Number(item.unit_price), modifierLabels: labels, modifierIds: [...shared, ...perPlate], perPlateGroupIds: [...new Set(perPlate.map((modifier) => modifier.groupId))], plateSelections, notes: item.notes ?? "", priority: item.priority, hasPerPlateOptions: perPlate.length > 0 };
}

function mergeModifierIds(current: OrderComposerItem, next: OrderComposerItem) {
  const perPlateGroups = new Set(next.perPlateGroupIds);
  const merged = current.modifierIds.map((modifier) => ({ ...modifier }));
  for (const modifier of next.modifierIds) {
    const existing = merged.find((value) => value.groupId === modifier.groupId && value.optionId === modifier.optionId);
    if (existing && perPlateGroups.has(modifier.groupId)) existing.quantity += modifier.quantity;
    else if (!existing) merged.push({ ...modifier });
  }
  return merged;
}

function mergeInitialItems(items: OrderComposerItem[]) {
  const merged: OrderComposerItem[] = [];
  for (const item of items) {
    const key = JSON.stringify({ productId: item.productId, variantId: item.variantId, notes: item.notes.trim(), priority: item.priority, modifiers: [...item.modifierIds].sort((left, right) => `${left.groupId}:${left.optionId}`.localeCompare(`${right.groupId}:${right.optionId}`)) });
    const existing = merged.find((value) => JSON.stringify({ productId: value.productId, variantId: value.variantId, notes: value.notes.trim(), priority: value.priority, modifiers: [...value.modifierIds].sort((left, right) => `${left.groupId}:${left.optionId}`.localeCompare(`${right.groupId}:${right.optionId}`)) }) === key);
    if (!existing) merged.push(item);
    else {
      existing.quantity += item.quantity;
      existing.modifierIds = mergeModifierIds(existing, item);
      existing.plateSelections.push(...item.plateSelections);
      existing.modifierLabels = [...new Set([...existing.modifierLabels, ...item.modifierLabels])];
    }
  }
  return merged;
}

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireRole("admin", "waiter");
  const { id } = await params;
  const admin = createAdminClient();
  const [{ data: orderData }, { data: itemData }] = await Promise.all([
    admin.from("orders").select("id, order_type, table_id, status, notes").eq("id", id).eq("branch_id", context.profile.branchId).maybeSingle(),
    admin.from("order_items").select("id, product_id, variant_id, product_name_snapshot, variant_name_snapshot, quantity, unit_price, line_total, notes, priority, status").eq("order_id", id).neq("status", "cancelled").order("created_at"),
  ]);
  const order = orderData as OrderRow | null;
  if (!order || ["payment_pending", "paid", "cancelled"].includes(order.status)) return <div className="mx-auto max-w-3xl"><Card><CardContent className="py-16 text-center"><p className="font-semibold">Este pedido ya no puede editarse.</p><Button asChild variant="outline" className="mt-5"><Link href={`/pedidos/${id}`}>Volver al pedido</Link></Button></CardContent></Card></div>;
  const items = (itemData ?? []) as ItemRow[];
  const catalog = await getCatalog(context.profile.branchId);
  const itemIds = items.map((item) => item.id);
  const { data: modifierData } = itemIds.length ? await admin.from("order_item_modifiers").select("order_item_id, modifier_group_id, option_name_snapshot, group_name_snapshot, quantity").in("order_item_id", itemIds) : { data: [] };
  const modifiersByItem = new Map<string, ModifierRow[]>();
  for (const modifier of (modifierData ?? []) as ModifierRow[]) modifiersByItem.set(modifier.order_item_id, [...(modifiersByItem.get(modifier.order_item_id) ?? []), modifier]);
  const productsById = new Map(catalog.products.map((product) => [product.id, product]));
  const initialItems = mergeInitialItems(items.flatMap((item) => { const product = productsById.get(item.product_id); return product ? [buildInitialItem(item, product, modifiersByItem.get(item.id) ?? [])] : []; }));
  let table: { id: string; tableNumber: number; name: string | null } | null = null;
  if (order.table_id) {
    const { data: tableData } = await admin.from("tables").select("id, table_number, name").eq("id", order.table_id).eq("branch_id", context.profile.branchId).maybeSingle();
    const tableRow = tableData as { id: string; table_number: number; name: string | null } | null;
    if (tableRow) table = { id: tableRow.id, tableNumber: tableRow.table_number, name: tableRow.name };
  }
  return <OrderComposer catalog={catalog} table={table} initialOrderType={order.order_type} editingOrderId={id} initialCart={initialItems} initialNotes={order.notes ?? ""} editReasonRequired={!['draft', 'confirmed'].includes(order.status)} />;
}
