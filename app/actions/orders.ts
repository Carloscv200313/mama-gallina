"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

const modifierSchema = z.object({ groupId: z.uuid(), optionId: z.uuid(), quantity: z.number().int().min(1).max(20) });
const orderItemSchema = z.object({
  productId: z.uuid(),
  variantId: z.uuid().nullable(),
  quantity: z.number().int().min(1).max(99),
  notes: z.string().trim().max(500),
  priority: z.enum(["normal", "high"]),
  modifiers: z.array(modifierSchema).max(50),
});
const createOrderSchema = z.object({
  orderType: z.enum(["dine_in", "takeaway"]),
  tableId: z.uuid().nullable(),
  peopleCount: z.number().int().min(1).max(100).nullable(),
  customerName: z.string().trim().max(120),
  notes: z.string().trim().max(500),
  idempotencyKey: z.uuid(),
  items: z.array(orderItemSchema).min(1).max(100),
});
const updateOrderSchema = z.object({
  orderId: z.uuid(),
  notes: z.string().trim().max(500),
  reason: z.string().trim().max(300),
  items: z.array(orderItemSchema).min(1).max(100),
});
const additionalOrderSchema = z.object({
  parentOrderId: z.uuid(),
  notes: z.string().trim().max(500),
  idempotencyKey: z.uuid(),
  items: z.array(orderItemSchema).min(1).max(100),
});

type DbRow = Record<string, unknown>;
const asRows = <T extends DbRow>(value: unknown[] | null) => (value ?? []) as T[];
const PLAIN_BROTH_NAMES = new Set(["caldo de cordero", "caldo de mote", "caldo combinado"]);

async function publishKitchenUpdate(admin: ReturnType<typeof createAdminClient>, branchId: string, reason: string) {
  try {
    const channel = admin.channel(`kitchen:${branchId}`);
    const subscribed = await Promise.race([new Promise<boolean>((resolve) => {
      channel.subscribe((status) => resolve(status === "SUBSCRIBED"));
    }), new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 2000))]);
    if (subscribed) await channel.send({ type: "broadcast", event: "kitchen:update", payload: { reason, at: new Date().toISOString() } });
    await admin.removeChannel(channel);
  } catch {
    // Realtime no debe bloquear el guardado del pedido.
  }
}

function isPlainBrothName(name: string) {
  return PLAIN_BROTH_NAMES.has(name.trim().toLocaleLowerCase());
}

type OrderItemInput = z.infer<typeof orderItemSchema>;
type PreparedOrderItems =
  | { ok: true; itemRows: Array<Record<string, unknown>>; modifierRows: Array<Record<string, unknown>>; subtotal: number }
  | { ok: false; error: string };

async function refreshOrderSessionTotals(admin: ReturnType<typeof createAdminClient>, branchId: string, rootOrderId: string, staffId: string, forcedStatus?: string) {
  const [{ data: rootOrder }, { data: childOrders }] = await Promise.all([
    admin.from("orders").select("id, status, discount_total").eq("id", rootOrderId).eq("branch_id", branchId).maybeSingle(),
    admin.from("orders").select("id, status").eq("parent_order_id", rootOrderId).eq("branch_id", branchId),
  ]);
  if (!rootOrder) return;
  const orderIds = [rootOrder.id, ...(childOrders ?? []).map((order) => String(order.id))];
  const [{ data: itemData }, { data: paymentData }] = await Promise.all([
    admin.from("order_items").select("line_total, status").in("order_id", orderIds),
    admin.from("payments").select("amount, status").eq("order_id", rootOrderId),
  ]);
  const subtotal = ((itemData ?? []) as Array<{ line_total: number; status: string }>)
    .filter((item) => item.status !== "cancelled")
    .reduce((sum, item) => sum + Number(item.line_total), 0);
  const discount = Number(rootOrder.discount_total ?? 0);
  const total = Math.max(subtotal - discount, 0);
  const paymentTotal = ((paymentData ?? []) as Array<{ amount: number; status: string }>)
    .filter((payment) => !["rejected", "refunded"].includes(payment.status))
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
  const activeStatuses = new Set(["draft", "confirmed", "sent_to_kitchen", "preparing", "partially_ready", "ready", "delivered"]);
  const shouldRecalculateStatus = !["payment_pending", "paid", "cancelled"].includes(rootOrder.status);
  let nextStatus = forcedStatus ?? rootOrder.status;
    if (!forcedStatus && shouldRecalculateStatus) {
      const statuses = ((itemData ?? []) as Array<{ line_total: number; status: string }>)
        .map((item) => item.status)
        .filter((status) => status !== "cancelled");
    if (statuses.length > 0) {
      nextStatus = statuses.every((status) => status === "delivered")
        ? "delivered"
        : statuses.every((status) => status === "ready" || status === "delivered")
          ? "ready"
          : statuses.some((status) => status === "ready" || status === "delivered")
            ? "partially_ready"
              : statuses.some((status) => status === "preparing")
                ? "preparing"
                : "sent_to_kitchen";
    } else nextStatus = "cancelled";
  }
  if (!activeStatuses.has(nextStatus) && !["payment_pending", "paid", "cancelled"].includes(nextStatus)) nextStatus = "sent_to_kitchen";
  const changedStatus = rootOrder.status !== nextStatus;
  await admin.from("orders").update({ subtotal, total, payment_total: paymentTotal, balance_due: Math.max(total - paymentTotal, 0), status: nextStatus, updated_by: staffId }).eq("id", rootOrderId).eq("branch_id", branchId);
  if (changedStatus) await admin.from("order_status_history").insert({ branch_id: branchId, order_id: rootOrderId, from_status: rootOrder.status, to_status: nextStatus, changed_by: staffId, reason: forcedStatus ? "Nueva tanda agregada a la mesa" : "Estado consolidado de la cuenta" });
}

async function prepareOrderItems(admin: ReturnType<typeof createAdminClient>, branchId: string, staffId: string, items: OrderItemInput[]): Promise<PreparedOrderItems> {
  const productIds = [...new Set(items.map((item) => item.productId))];
  const variantIds = [...new Set(items.flatMap((item) => item.variantId ? [item.variantId] : []))];
  const optionIds = [...new Set(items.flatMap((item) => item.modifiers.map((modifier) => modifier.optionId)))];
  const [{ data: productData }, { data: variantData }, { data: optionData }, { data: groupData }, { data: relationData }] = await Promise.all([
    admin.from("products").select("id, name, sale_price, estimated_cost, allows_modifiers, requires_kitchen").eq("branch_id", branchId).in("id", productIds).eq("is_active", true).eq("is_available", true),
    variantIds.length ? admin.from("product_variants").select("id, product_id, name, sale_price, estimated_cost, max_flavors").eq("branch_id", branchId).in("id", variantIds).eq("status", "active") : Promise.resolve({ data: [] }),
    optionIds.length ? admin.from("modifier_options").select("id, modifier_group_id, name, additional_price, status").eq("branch_id", branchId).in("id", optionIds).eq("status", "active") : Promise.resolve({ data: [] }),
    admin.from("modifier_groups").select("id, name, selection_mode, is_required, min_selections, max_selections").eq("branch_id", branchId).eq("status", "active"),
    productIds.length ? admin.from("product_modifier_groups").select("product_id, modifier_group_id").eq("branch_id", branchId).in("product_id", productIds) : Promise.resolve({ data: [] }),
  ]);
  const products = new Map(asRows<{ id: string; name: string; sale_price: number; estimated_cost: number; allows_modifiers: boolean; requires_kitchen: boolean }>(productData).map((row) => [row.id, row]));
  const variants = new Map(asRows<{ id: string; product_id: string; name: string; sale_price: number; estimated_cost: number; max_flavors: number | null }>(variantData).map((row) => [row.id, row]));
  const options = new Map(asRows<{ id: string; modifier_group_id: string; name: string; additional_price: number }>(optionData).map((row) => [row.id, row]));
  const groups = new Map(asRows<{ id: string; name: string; selection_mode: "single" | "multiple"; is_required: boolean; min_selections: number; max_selections: number | null }>(groupData).map((row) => [row.id, row]));
  const relations = asRows<{ product_id: string; modifier_group_id: string }>(relationData);
  const relationSet = new Set(relations.map((relation) => `${relation.product_id}:${relation.modifier_group_id}`));
  if (products.size !== productIds.length || variants.size !== variantIds.length || options.size !== optionIds.length) return { ok: false, error: "Uno de los productos o modificadores ya no está disponible." };

  const itemRows: Array<Record<string, unknown>> = [];
  const modifierRows: Array<Record<string, unknown>> = [];
  let subtotal = 0;
  for (const item of items) {
    const product = products.get(item.productId);
    if (!product) return { ok: false, error: "Producto no disponible." };
    const productName = product.name.trim().toLocaleLowerCase();
    if (item.modifiers.length > 0 && (!product.allows_modifiers || isPlainBrothName(productName))) return { ok: false, error: `${product.name} se vende únicamente como caldo, sin adicionales.` };
    const variant = item.variantId ? variants.get(item.variantId) : null;
    if (item.variantId && (!variant || variant.product_id !== product.id)) return { ok: false, error: `La variante de ${product.name} no es válida.` };
    const selectedByGroup = new Map<string, typeof item.modifiers>();
    for (const modifier of item.modifiers) {
      const option = options.get(modifier.optionId);
      const group = option ? groups.get(option.modifier_group_id) : null;
      if (!option || !group || modifier.groupId !== group.id || !relationSet.has(`${product.id}:${group.id}`)) return { ok: false, error: `Un modificador de ${product.name} no es válido.` };
      const isBrothExtras = productName.startsWith("caldo") && group.name.trim().toLocaleLowerCase() === "extras";
      if (isBrothExtras && option.name !== "Presa adicional" && option.name !== "Huevo adicional") return { ok: false, error: "Ese adicional no está disponible para los caldos." };
      selectedByGroup.set(group.id, [...(selectedByGroup.get(group.id) ?? []), modifier]);
    }
    const productGroupIds = [...new Set(relations.filter((relation) => relation.product_id === product.id).map((relation) => relation.modifier_group_id))];
    for (const modifierGroupId of productGroupIds) {
      const group = groups.get(modifierGroupId);
      const count = selectedByGroup.get(modifierGroupId)?.reduce((sum, modifier) => sum + modifier.quantity, 0) ?? 0;
      const groupName = group?.name.trim().toLocaleLowerCase() ?? "";
      const isFlavorGroup = groupName.includes("sabores");
      const isPresaGroup = groupName === "presa" && (productName === "caldo de gallina" || productName === "caldo acevichado");
      const isPreferencePerPlate = groupName === "preferencias" && productName === "caldo acevichado";
      const isPerPlateGroup = groupName === "extras" || isFlavorGroup || isPresaGroup || isPreferencePerPlate;
      const countMultiplier = isPerPlateGroup ? item.quantity : 1;
      const maxSelections = isFlavorGroup && variant?.max_flavors ? variant.max_flavors : group?.max_selections;
      if (group && ((group.is_required && count < Math.max(1, group.min_selections * countMultiplier)) || (maxSelections !== null && maxSelections !== undefined && count > maxSelections * countMultiplier) || (group.selection_mode === "single" && count > countMultiplier))) return { ok: false, error: `Revisa las opciones de ${group.name}.` };
    }
    const variantPrice = variant ? Number(variant.sale_price) : Number(product.sale_price);
    const variantCost = variant ? Number(variant.estimated_cost) : Number(product.estimated_cost);
    const isProductPerPlateGroup = (groupName: string) => groupName === "extras" || groupName.includes("sabores") || (groupName === "presa" && (productName === "caldo de gallina" || productName === "caldo acevichado")) || (groupName === "preferencias" && productName === "caldo acevichado");
    const sharedModifiersTotal = item.modifiers.reduce((sum, modifier) => { const option = options.get(modifier.optionId); const group = option ? groups.get(option.modifier_group_id) : null; const groupName = group?.name.trim().toLocaleLowerCase() ?? ""; return isProductPerPlateGroup(groupName) ? sum : sum + Number(option?.additional_price ?? 0) * modifier.quantity; }, 0);
    const perPlateModifiersTotal = item.modifiers.reduce((sum, modifier) => { const option = options.get(modifier.optionId); const group = option ? groups.get(option.modifier_group_id) : null; const groupName = group?.name.trim().toLocaleLowerCase() ?? ""; return isProductPerPlateGroup(groupName) ? sum + Number(option?.additional_price ?? 0) * modifier.quantity : sum; }, 0);
    const modifiersTotal = sharedModifiersTotal * item.quantity + perPlateModifiersTotal;
    const lineTotal = (variantPrice + sharedModifiersTotal) * item.quantity + perPlateModifiersTotal;
    const orderItemId = crypto.randomUUID();
    itemRows.push({ id: orderItemId, branch_id: branchId, order_id: null, product_id: product.id, variant_id: variant?.id ?? null, product_name_snapshot: product.name, variant_name_snapshot: variant?.name ?? null, unit_price: variantPrice, estimated_cost_snapshot: variantCost, quantity: item.quantity, modifiers_total: modifiersTotal, line_total: lineTotal, notes: item.notes || null, priority: item.priority, status: "pending", created_by: staffId, updated_by: staffId });
    for (const modifier of item.modifiers) {
      const option = options.get(modifier.optionId);
      const group = option ? groups.get(option.modifier_group_id) : null;
      if (option && group) modifierRows.push({ branch_id: branchId, order_item_id: orderItemId, modifier_group_id: group.id, modifier_option_id: option.id, group_name_snapshot: group.name, option_name_snapshot: option.name, additional_price: option.additional_price, quantity: modifier.quantity });
    }
    subtotal += lineTotal;
  }
  return { ok: true, itemRows, modifierRows, subtotal };
}

export type OrderActionResult = { ok: true; orderId: string; orderCode?: string; message?: string } | { ok: false; error: string };

export async function createOrder(input: unknown): Promise<OrderActionResult> {
  const context = await requireRole("admin", "waiter");
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisa el pedido." };
  const values = parsed.data;
  if (values.orderType === "dine_in" && !values.tableId) return { ok: false, error: "Selecciona una mesa." };
  if (values.orderType === "takeaway" && values.tableId) return { ok: false, error: "Un pedido para llevar no puede tener mesa." };

  const admin = createAdminClient();
  const { data: existing } = await admin.from("orders").select("id, order_code").eq("branch_id", context.profile.branchId).eq("idempotency_key", values.idempotencyKey).maybeSingle();
  if (existing) return { ok: true, orderId: String(existing.id), orderCode: String(existing.order_code) };

  if (values.tableId) {
    const { data: table } = await admin.from("tables").select("id, status, is_active").eq("id", values.tableId).eq("branch_id", context.profile.branchId).maybeSingle();
    if (!table || table.status !== "available" || !table.is_active) return { ok: false, error: "La mesa no está disponible." };
    const { data: occupied } = await admin.from("orders").select("id").eq("branch_id", context.profile.branchId).eq("table_id", values.tableId).in("status", ["draft", "confirmed", "sent_to_kitchen", "preparing", "partially_ready", "ready", "delivered", "payment_pending"]).limit(1);
    if (occupied && occupied.length > 0) return { ok: false, error: "La mesa ya tiene un pedido activo." };
  }

  const prepared = await prepareOrderItems(admin, context.profile.branchId, context.staffId, values.items);
  if (!prepared.ok) return prepared;
  const { itemRows, modifierRows, subtotal } = prepared;

  const now = new Date().toISOString();
  const { data: order, error: orderError } = await admin.from("orders").insert({ branch_id: context.profile.branchId, order_type: values.orderType, table_id: values.tableId, waiter_id: context.staffId, people_count: values.peopleCount, customer_name: values.customerName || null, notes: values.notes || null, status: "sent_to_kitchen", subtotal, total: subtotal, balance_due: subtotal, sent_to_kitchen_at: now, idempotency_key: values.idempotencyKey, created_by: context.staffId, updated_by: context.staffId }).select("id, order_code").single();
  if (orderError || !order) return { ok: false, error: orderError?.code === "23505" ? "Este pedido ya fue creado o la mesa se ocupó." : "No se pudo crear el pedido." };
  const orderId = String(order.id);
  const { error: itemError } = await admin.from("order_items").insert(itemRows.map((row) => ({ ...row, order_id: orderId, sent_to_kitchen_at: now })));
  if (itemError) {
    await admin.from("order_items").delete().eq("order_id", orderId);
    await admin.from("orders").delete().eq("id", orderId);
    return { ok: false, error: "No se pudieron guardar los productos del pedido." };
  }
  if (modifierRows.length) {
    const { error: modifierError } = await admin.from("order_item_modifiers").insert(modifierRows);
    if (modifierError) {
      await admin.from("order_item_modifiers").delete().in("order_item_id", itemRows.map((row) => String(row.id)));
      await admin.from("order_items").delete().eq("order_id", orderId);
      await admin.from("orders").delete().eq("id", orderId);
      return { ok: false, error: "No se pudieron guardar los modificadores." };
    }
  }
  await admin.from("order_status_history").insert({ branch_id: context.profile.branchId, order_id: orderId, from_status: null, to_status: "sent_to_kitchen", changed_by: context.staffId });
  await admin.from("audit_logs").insert({ branch_id: context.profile.branchId, actor_id: context.staffId, action: "order.created", entity: "orders", entity_id: orderId, after_data: { order_code: order.order_code, total: subtotal, status: "sent_to_kitchen" } });
  await publishKitchenUpdate(admin, context.profile.branchId, "order_created");
  revalidatePath("/mesas");
  revalidatePath("/pedidos");
  revalidatePath("/cocina");
  return { ok: true, orderId, orderCode: String(order.order_code) };
}

export async function createAdditionalOrder(input: unknown): Promise<OrderActionResult> {
  const context = await requireRole("admin", "waiter");
  const parsed = additionalOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisa la nueva tanda." };
  const values = parsed.data;
  const admin = createAdminClient();
  const { data: existing } = await admin.from("orders").select("id, order_code").eq("branch_id", context.profile.branchId).eq("idempotency_key", values.idempotencyKey).maybeSingle();
  if (existing) return { ok: true, orderId: String(existing.id), orderCode: String(existing.order_code) };

  const { data: selectedOrder } = await admin.from("orders").select("id, parent_order_id, branch_id, order_type, table_id, status, waiter_id").eq("id", values.parentOrderId).eq("branch_id", context.profile.branchId).maybeSingle();
  if (!selectedOrder) return { ok: false, error: "La cuenta de la mesa no fue encontrada." };
  const rootOrderId = selectedOrder.parent_order_id ? String(selectedOrder.parent_order_id) : String(selectedOrder.id);
  const { data: rootOrder } = await admin.from("orders").select("id, order_code, order_type, table_id, status, waiter_id, customer_name, people_count").eq("id", rootOrderId).eq("branch_id", context.profile.branchId).maybeSingle();
  if (!rootOrder || rootOrder.order_type !== "dine_in" || !rootOrder.table_id) return { ok: false, error: "Solo puedes agregar tandas a una mesa activa." };
  if (["paid", "cancelled"].includes(rootOrder.status)) return { ok: false, error: "La cuenta ya está cerrada y no admite nuevos productos." };
  if (selectedOrder.waiter_id !== context.staffId && rootOrder.waiter_id !== context.staffId && !context.roles.includes("admin")) return { ok: false, error: "Solo puedes agregar pedidos de tu mesa." };

  const prepared = await prepareOrderItems(admin, context.profile.branchId, context.staffId, values.items);
  if (!prepared.ok) return prepared;
  const now = new Date().toISOString();
  const { itemRows, modifierRows, subtotal } = prepared;
  const { data: order, error: orderError } = await admin.from("orders").insert({ branch_id: context.profile.branchId, parent_order_id: rootOrderId, order_type: rootOrder.order_type, table_id: rootOrder.table_id, waiter_id: context.staffId, people_count: rootOrder.people_count, customer_name: rootOrder.customer_name, notes: values.notes || null, status: "sent_to_kitchen", subtotal, total: subtotal, balance_due: subtotal, sent_to_kitchen_at: now, idempotency_key: values.idempotencyKey, created_by: context.staffId, updated_by: context.staffId }).select("id, order_code").single();
  if (orderError || !order) return { ok: false, error: orderError?.code === "23505" ? "Esta tanda ya fue creada." : "No se pudo crear el pedido adicional." };
  const orderId = String(order.id);
  const { error: itemError } = await admin.from("order_items").insert(itemRows.map((row) => ({ ...row, order_id: orderId, sent_to_kitchen_at: now })));
  if (itemError) {
    await admin.from("order_items").delete().eq("order_id", orderId);
    await admin.from("orders").delete().eq("id", orderId);
    return { ok: false, error: "No se pudieron guardar los productos adicionales." };
  }
  if (modifierRows.length) {
    const { error: modifierError } = await admin.from("order_item_modifiers").insert(modifierRows);
    if (modifierError) {
      await admin.from("order_item_modifiers").delete().in("order_item_id", itemRows.map((row) => String(row.id)));
      await admin.from("order_items").delete().eq("order_id", orderId);
      await admin.from("orders").delete().eq("id", orderId);
      return { ok: false, error: "No se pudieron guardar los modificadores adicionales." };
    }
  }
  await admin.from("order_status_history").insert({ branch_id: context.profile.branchId, order_id: orderId, from_status: null, to_status: "sent_to_kitchen", changed_by: context.staffId, reason: "Nueva tanda para la misma mesa" });
  await refreshOrderSessionTotals(admin, context.profile.branchId, rootOrderId, context.staffId, "sent_to_kitchen");
  await admin.from("audit_logs").insert({ branch_id: context.profile.branchId, actor_id: context.staffId, action: "order.additional_created", entity: "orders", entity_id: orderId, after_data: { order_code: order.order_code, parent_order_id: rootOrderId, root_order_code: rootOrder.order_code, total: subtotal } });
  await publishKitchenUpdate(admin, context.profile.branchId, "additional_order_created");
  revalidatePath("/mesas"); revalidatePath("/pedidos"); revalidatePath(`/pedidos/${rootOrderId}`); revalidatePath(`/pedidos/${orderId}`); revalidatePath("/cocina"); revalidatePath("/caja");
  return { ok: true, orderId, orderCode: String(order.order_code) };
}

export async function updateOrder(input: unknown): Promise<OrderActionResult> {
  const context = await requireRole("admin", "waiter");
  const parsed = updateOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisa el pedido." };
  const values = parsed.data;
  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("id, order_code, branch_id, status, waiter_id, total, payment_total").eq("id", values.orderId).eq("branch_id", context.profile.branchId).maybeSingle();
  if (!order) return { ok: false, error: "Pedido no encontrado." };
  const { data: additionalOrders } = await admin.from("orders").select("id").eq("parent_order_id", values.orderId).eq("branch_id", context.profile.branchId).limit(1);
  if (additionalOrders?.length) return { ok: false, error: "Este pedido tiene tandas adicionales. Usa “Agregar pedido” para añadir productos sin modificar lo anterior." };
  if (order.waiter_id !== context.staffId && !context.roles.includes("admin")) return { ok: false, error: "Solo puedes editar tus propios pedidos." };
  if (["payment_pending", "paid", "cancelled"].includes(order.status)) return { ok: false, error: "El pedido ya está en cobro, pagado o anulado y no puede editarse." };
  if (Number(order.payment_total) > 0) return { ok: false, error: "No se puede editar un pedido que ya tiene pagos registrados." };
  const sentEdit = !["draft", "confirmed"].includes(order.status);
  if (sentEdit && values.reason.length < 3) return { ok: false, error: "Indica el motivo de la edición." };

  const prepared = await prepareOrderItems(admin, context.profile.branchId, context.staffId, values.items);
  if (!prepared.ok) return prepared;
  const now = new Date().toISOString();
  const replacementReason = values.reason || "Edición antes de enviar a cocina";
  const { error: cancelledError } = await admin.from("order_items").update({ status: "cancelled", cancelled_at: now, cancellation_reason: replacementReason, updated_by: context.staffId }).eq("order_id", values.orderId).neq("status", "cancelled");
  if (cancelledError) return { ok: false, error: "No se pudieron conservar las líneas anteriores del pedido." };
  const itemRows = prepared.itemRows.map((row) => ({ ...row, order_id: values.orderId, sent_to_kitchen_at: sentEdit ? now : null }));
  const { error: itemError } = await admin.from("order_items").insert(itemRows);
  if (itemError) return { ok: false, error: "No se pudieron guardar los productos actualizados." };
  if (prepared.modifierRows.length) {
    const { error: modifierError } = await admin.from("order_item_modifiers").insert(prepared.modifierRows);
    if (modifierError) return { ok: false, error: "No se pudieron guardar los modificadores actualizados." };
  }
  const nextStatus = sentEdit ? "sent_to_kitchen" : order.status;
  const { error: orderError } = await admin.from("orders").update({ status: nextStatus, subtotal: prepared.subtotal, total: prepared.subtotal, balance_due: prepared.subtotal, notes: values.notes || null, sent_to_kitchen_at: sentEdit ? now : null, delivered_at: null, updated_by: context.staffId }).eq("id", values.orderId).eq("branch_id", context.profile.branchId);
  if (orderError) return { ok: false, error: "No se pudo actualizar el pedido." };
  await admin.from("order_status_history").insert({ branch_id: context.profile.branchId, order_id: values.orderId, from_status: order.status, to_status: nextStatus, changed_by: context.staffId, reason: replacementReason });
  await admin.from("audit_logs").insert({ branch_id: context.profile.branchId, actor_id: context.staffId, action: "order.edited", entity: "orders", entity_id: values.orderId, before_data: { status: order.status, total: order.total }, after_data: { status: nextStatus, total: prepared.subtotal, item_count: values.items.length }, reason: replacementReason });
  revalidatePath("/mesas"); revalidatePath("/pedidos"); revalidatePath(`/pedidos/${values.orderId}`); revalidatePath(`/pedidos/${values.orderId}/editar`); revalidatePath("/cocina");
  return { ok: true, orderId: values.orderId, orderCode: String(order.order_code) };
}

export async function cancelOrderItem(itemId: string): Promise<OrderActionResult> {
  const context = await requireRole("admin", "waiter");
  if (!z.uuid().safeParse(itemId).success) return { ok: false, error: "Producto inválido." };
  const admin = createAdminClient();
  const { data: item } = await admin.from("order_items").select("id, order_id, product_name_snapshot, quantity, status").eq("id", itemId).eq("branch_id", context.profile.branchId).maybeSingle();
  if (!item) return { ok: false, error: "Producto no encontrado." };
  if (item.status === "cancelled") return { ok: false, error: "Este producto ya fue quitado del pedido." };
  const { data: order } = await admin.from("orders").select("id, order_code, parent_order_id, status, waiter_id, table_id, order_type").eq("id", item.order_id).eq("branch_id", context.profile.branchId).maybeSingle();
  if (!order) return { ok: false, error: "Pedido no encontrado." };
  if (order.waiter_id !== context.staffId && !context.roles.includes("admin")) return { ok: false, error: "Solo puedes quitar productos de tus propios pedidos." };
  if (["payment_pending", "paid", "cancelled"].includes(order.status)) return { ok: false, error: "El pedido ya no permite quitar productos." };
  const now = new Date().toISOString();
  const cancellationReason = item.status === "pending" ? "Producto quitado antes de preparar" : "Producto quitado manualmente del pedido";
  const { data: cancelledItem, error: cancelError } = await admin.from("order_items").update({ status: "cancelled", cancelled_at: now, cancellation_reason: cancellationReason, updated_by: context.staffId }).eq("id", item.id).neq("status", "cancelled").select("id").maybeSingle();
  if (cancelError || !cancelledItem) return { ok: false, error: "El producto ya avanzó o no pudo quitarse." };
  const { data: remainingItems } = await admin.from("order_items").select("id").eq("order_id", item.order_id).neq("status", "cancelled").limit(1);
  if (!remainingItems?.length) await admin.from("orders").update({ status: "cancelled", updated_by: context.staffId }).eq("id", item.order_id).eq("branch_id", context.profile.branchId);
  const rootOrderId = order.parent_order_id ? String(order.parent_order_id) : String(order.id);
  await refreshOrderSessionTotals(admin, context.profile.branchId, rootOrderId, context.staffId);
  const { data: table } = order.table_id ? await admin.from("tables").select("table_number").eq("id", order.table_id).eq("branch_id", context.profile.branchId).maybeSingle() : { data: null };
  const location = order.order_type === "takeaway" ? "el pedido para llevar" : `la Mesa ${table?.table_number ?? ""}`;
  const message = `Se quitó ${item.quantity} × ${item.product_name_snapshot} de ${location}.`;
  await admin.from("audit_logs").insert({ branch_id: context.profile.branchId, actor_id: context.staffId, action: "order.item_cancelled", entity: "order_items", entity_id: item.id, before_data: { status: item.status, order_code: order.order_code }, after_data: { status: "cancelled", order_code: order.order_code }, reason: message });
  await publishKitchenUpdate(admin, context.profile.branchId, "item_cancelled");
  revalidatePath("/cocina"); revalidatePath("/mesas"); revalidatePath("/pedidos"); revalidatePath(`/pedidos/${rootOrderId}`); revalidatePath("/caja");
  return { ok: true, orderId: String(order.id), orderCode: String(order.order_code), message };
}

export async function sendOrderToKitchen(orderId: string): Promise<OrderActionResult> {
  const context = await requireRole("admin", "waiter");
  if (!z.uuid().safeParse(orderId).success) return { ok: false, error: "Pedido inválido." };
  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("id, branch_id, status, order_code, waiter_id").eq("id", orderId).eq("branch_id", context.profile.branchId).maybeSingle();
  if (!order) return { ok: false, error: "Pedido no encontrado." };
  if (order.waiter_id !== context.staffId && !context.roles.includes("admin")) return { ok: false, error: "Solo puedes enviar tus propios pedidos." };
  if (order.status === "sent_to_kitchen" || order.status === "preparing" || order.status === "ready" || order.status === "delivered" || order.status === "payment_pending" || order.status === "paid") return { ok: true, orderId };
  if (order.status !== "draft" && order.status !== "confirmed") return { ok: false, error: "El pedido no puede enviarse desde su estado actual." };
  const now = new Date().toISOString();
  const { error } = await admin.from("orders").update({ status: "sent_to_kitchen", sent_to_kitchen_at: now, updated_by: context.staffId }).eq("id", orderId).eq("status", order.status);
  if (error) return { ok: false, error: "No se pudo enviar el pedido." };
  await admin.from("order_items").update({ sent_to_kitchen_at: now, updated_by: context.staffId }).eq("order_id", orderId).eq("status", "pending");
  await admin.from("order_status_history").insert({ branch_id: context.profile.branchId, order_id: orderId, from_status: order.status, to_status: "sent_to_kitchen", changed_by: context.staffId });
  await admin.from("audit_logs").insert({ branch_id: context.profile.branchId, actor_id: context.staffId, action: "order.sent_to_kitchen", entity: "orders", entity_id: orderId, after_data: { status: "sent_to_kitchen" } });
  await publishKitchenUpdate(admin, context.profile.branchId, "order_sent_to_kitchen");
  revalidatePath("/mesas"); revalidatePath("/pedidos"); revalidatePath("/cocina");
  return { ok: true, orderId, orderCode: String(order.order_code) };
}

const kitchenStatusSchema = z.enum(["preparing", "ready", "delivered"]);
export async function updateKitchenItem(itemId: string, nextStatus: string): Promise<OrderActionResult> {
  const context = await requireRole("admin", "kitchen");
  if (!z.uuid().safeParse(itemId).success || !kitchenStatusSchema.safeParse(nextStatus).success) return { ok: false, error: "Cambio de estado inválido." };
  const status = nextStatus as z.infer<typeof kitchenStatusSchema>;
  const admin = createAdminClient();
  const { data: item } = await admin.from("order_items").select("id, order_id, status").eq("id", itemId).eq("branch_id", context.profile.branchId).maybeSingle();
  if (!item) return { ok: false, error: "Producto no encontrado." };
  const allowed: Record<string, string[]> = { pending: ["preparing"], preparing: ["ready"], ready: ["delivered"] };
  if (!allowed[item.status]?.includes(status)) return { ok: false, error: "El producto ya avanzó o no permite ese cambio." };
  const { error } = await admin.from("order_items").update({ status, updated_by: context.staffId }).eq("id", itemId).eq("status", item.status);
  if (error) return { ok: false, error: "No se pudo actualizar cocina." };
  const { data: allItems } = await admin.from("order_items").select("status").eq("order_id", item.order_id);
  const itemStatuses = asRows<{ status: string }>(allItems).map((row) => row.status).filter((value) => value !== "cancelled");
  const orderStatus = itemStatuses.every((value) => value === "delivered") ? "delivered" : itemStatuses.every((value) => value === "ready" || value === "delivered") ? "ready" : itemStatuses.some((value) => value === "ready" || value === "delivered") ? "partially_ready" : "preparing";
  const { data: order } = await admin.from("orders").select("status, order_code, parent_order_id").eq("id", item.order_id).maybeSingle();
  if (order && order.status !== orderStatus) {
    await admin.from("orders").update({ status: orderStatus, delivered_at: orderStatus === "delivered" ? new Date().toISOString() : null, updated_by: context.staffId }).eq("id", item.order_id);
    await admin.from("order_status_history").insert({ branch_id: context.profile.branchId, order_id: item.order_id, from_status: order.status, to_status: orderStatus, changed_by: context.staffId });
  }
  const rootOrderId = order?.parent_order_id ? String(order.parent_order_id) : String(item.order_id);
  await refreshOrderSessionTotals(admin, context.profile.branchId, rootOrderId, context.staffId);
  await admin.from("audit_logs").insert({ branch_id: context.profile.branchId, actor_id: context.staffId, action: "kitchen.item_status_changed", entity: "order_items", entity_id: itemId, after_data: { status } });
  await publishKitchenUpdate(admin, context.profile.branchId, `item_${status}`);
  revalidatePath("/cocina"); revalidatePath("/pedidos"); revalidatePath("/mesas"); revalidatePath(`/pedidos/${rootOrderId}`); revalidatePath("/caja");
  return { ok: true, orderId: String(item.order_id), orderCode: order ? String(order.order_code) : undefined };
}

export async function markOrderPaymentPending(orderId: string): Promise<OrderActionResult> {
  const context = await requireRole("admin", "waiter");
  if (!z.uuid().safeParse(orderId).success) return { ok: false, error: "Pedido inválido." };
  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("id, status").eq("id", orderId).eq("branch_id", context.profile.branchId).maybeSingle();
  if (!order || (order.status !== "ready" && order.status !== "delivered")) return { ok: false, error: "El pedido aún no está listo para cobrar." };
  await admin.from("orders").update({ status: "payment_pending", updated_by: context.staffId }).eq("id", orderId);
  await admin.from("order_status_history").insert({ branch_id: context.profile.branchId, order_id: orderId, from_status: order.status, to_status: "payment_pending", changed_by: context.staffId });
  revalidatePath("/pedidos"); revalidatePath("/caja"); revalidatePath("/mesas");
  return { ok: true, orderId };
}
