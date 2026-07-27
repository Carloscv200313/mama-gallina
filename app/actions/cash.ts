"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

const money = z.coerce.number().finite().min(0).max(999999.99);
const uuid = z.uuid();

export type CashActionResult = { ok: true; id?: string } | { ok: false; error: string };
export type CashSessionSalesResult =
  | { ok: true; total: number; products: Array<{ name: string; quantity: number; amount: number }> }
  | { ok: false; error: string };
const evidenceInputSchema = z.object({ secureUrl: z.string().url().max(1000), publicId: z.string().min(1).max(300), fileSha256: z.string().regex(/^[a-f0-9]{64}$/), width: z.number().int().positive(), height: z.number().int().positive(), format: z.string().min(1).max(20), bytes: z.number().int().positive().max(10000000) });

export async function getCashSessionSales(sessionId: string): Promise<CashSessionSalesResult> {
  const context = await requireRole("admin", "cashier");
  if (!uuid.safeParse(sessionId).success) return { ok: false, error: "Sesión de caja inválida." };
  const admin = createAdminClient();
  const { data: session } = await admin.from("cash_sessions").select("id, branch_id, opened_at, closed_at").eq("id", sessionId).eq("branch_id", context.profile.branchId).maybeSingle();
  if (!session) return { ok: false, error: "No se encontró la sesión de caja." };
  const end = session.closed_at ?? new Date().toISOString();
  const { data: rootOrders, error: orderError } = await admin.from("orders").select("id, total, paid_at").eq("branch_id", context.profile.branchId).is("parent_order_id", null).eq("status", "paid").gte("paid_at", session.opened_at).lte("paid_at", end);
  if (orderError) return { ok: false, error: "No se pudieron cargar las ventas de la sesión." };
  const roots = (rootOrders ?? []) as Array<{ id: string; total: number; paid_at: string | null }>;
  if (!roots.length) return { ok: true, total: 0, products: [] };
  const rootIds = roots.map((order) => order.id);
  const { data: childOrders, error: childError } = await admin.from("orders").select("id").eq("branch_id", context.profile.branchId).in("parent_order_id", rootIds);
  if (childError) return { ok: false, error: "No se pudieron cargar las tandas de la sesión." };
  const orderIds = [...rootIds, ...((childOrders ?? []) as Array<{ id: string }>).map((order) => order.id)];
  const { data: itemData, error: itemError } = await admin.from("order_items").select("product_name_snapshot, quantity, line_total").eq("branch_id", context.profile.branchId).in("order_id", orderIds).neq("status", "cancelled");
  if (itemError) return { ok: false, error: "No se pudieron cargar los productos vendidos." };
  const productMap = new Map<string, { quantity: number; amount: number }>();
  for (const item of (itemData ?? []) as Array<{ product_name_snapshot: string; quantity: number; line_total: number }>) {
    const current = productMap.get(item.product_name_snapshot) ?? { quantity: 0, amount: 0 };
    productMap.set(item.product_name_snapshot, { quantity: current.quantity + Number(item.quantity), amount: current.amount + Number(item.line_total) });
  }
  return { ok: true, total: roots.reduce((sum, order) => sum + Number(order.total), 0), products: [...productMap.entries()].map(([name, values]) => ({ name, quantity: values.quantity, amount: values.amount })).sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name)) };
}

export async function openCashSession(input: { openingAmount: number; openingNote: string }): Promise<CashActionResult> {
  const context = await requireRole("admin", "cashier");
  const parsed = z.object({ openingAmount: money, openingNote: z.string().trim().max(500) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ingresa un monto inicial válido." };
  const admin = createAdminClient();
  const { data: existing } = await admin.from("cash_sessions").select("id").eq("branch_id", context.profile.branchId).eq("status", "open").limit(1);
  if (existing && existing.length > 0) return { ok: false, error: "Ya existe una caja abierta en este local." };
  const { data, error } = await admin.from("cash_sessions").insert({ branch_id: context.profile.branchId, cashier_id: context.staffId, opening_amount: parsed.data.openingAmount, opening_note: parsed.data.openingNote || null, status: "open", created_by: context.staffId, updated_by: context.staffId }).select("id").single();
  if (error || !data) return { ok: false, error: error?.code === "23505" ? "Ya existe una caja abierta." : "No se pudo abrir la caja." };
  await admin.from("audit_logs").insert({ branch_id: context.profile.branchId, actor_id: context.staffId, action: "cash.opened", entity: "cash_sessions", entity_id: data.id, after_data: { opening_amount: parsed.data.openingAmount } });
  revalidatePath("/caja"); revalidatePath("/dashboard");
  return { ok: true, id: String(data.id) };
}

export async function closeCashSession(input: { sessionId: string; countedAmount: number; closingNote: string }): Promise<CashActionResult> {
  const context = await requireRole("admin", "cashier");
  const parsed = z.object({ sessionId: uuid, countedAmount: money, closingNote: z.string().trim().max(500) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ingresa el efectivo contado correctamente." };
  const admin = createAdminClient();
  const { data: session } = await admin.from("cash_sessions").select("id, cashier_id, opening_amount, status").eq("id", parsed.data.sessionId).eq("branch_id", context.profile.branchId).maybeSingle();
  if (!session || session.status !== "open") return { ok: false, error: "La sesión no está abierta." };
  if (session.cashier_id !== context.staffId && !context.roles.includes("admin")) return { ok: false, error: "Solo el cajero responsable o un administrador puede cerrar esta caja." };
  const { data: movementData } = await admin.from("cash_movements").select("type, amount").eq("cash_session_id", session.id);
  const movements = (movementData ?? []) as Array<{ type: string; amount: number }>;
  const positive = new Set(["cash_sale", "manual_entry", "adjustment"]);
  const expected = Number(session.opening_amount) + movements.reduce((sum, movement) => sum + (positive.has(movement.type) ? Number(movement.amount) : -Number(movement.amount)), 0);
  const difference = Number((parsed.data.countedAmount - expected).toFixed(2));
  const { error } = await admin.from("cash_sessions").update({ expected_amount: expected, counted_amount: parsed.data.countedAmount, difference, closing_note: parsed.data.closingNote || null, status: difference === 0 ? "closed" : "closed_with_difference", closed_at: new Date().toISOString(), updated_by: context.staffId }).eq("id", session.id).eq("status", "open");
  if (error) return { ok: false, error: "No se pudo cerrar la caja." };
  await admin.from("audit_logs").insert({ branch_id: context.profile.branchId, actor_id: context.staffId, action: "cash.closed", entity: "cash_sessions", entity_id: session.id, after_data: { expected_amount: expected, counted_amount: parsed.data.countedAmount, difference } });
  revalidatePath("/caja"); revalidatePath("/dashboard");
  return { ok: true, id: session.id };
}

const paymentSchema = z.object({ orderId: uuid, method: z.enum(["cash", "plin", "bank_transfer"]), amount: z.coerce.number().finite().positive().max(999999.99), receivedAmount: z.coerce.number().finite().positive().max(999999.99).nullable(), notes: z.string().trim().max(500), idempotencyKey: uuid });
export async function registerPayment(input: unknown): Promise<CashActionResult> {
  const context = await requireRole("admin", "cashier");
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisa los datos del pago." };
  const values = parsed.data;
  if (values.method === "cash" && (!values.receivedAmount || values.receivedAmount < values.amount)) return { ok: false, error: "El efectivo recibido no puede ser menor al importe." };
  const admin = createAdminClient();
  const { data: existing } = await admin.from("payments").select("id").eq("branch_id", context.profile.branchId).eq("idempotency_key", values.idempotencyKey).maybeSingle();
  if (existing) return { ok: true, id: String(existing.id) };
  const { data: order } = await admin.from("orders").select("id, parent_order_id, total, payment_total, balance_due, status").eq("id", values.orderId).eq("branch_id", context.profile.branchId).maybeSingle();
  if (!order) return { ok: false, error: "El pedido no está disponible para cobro." };
  const rootOrderId = order.parent_order_id ? String(order.parent_order_id) : String(order.id);
  const { data: rootOrder } = order.parent_order_id ? await admin.from("orders").select("id, total, payment_total, balance_due, status").eq("id", rootOrderId).eq("branch_id", context.profile.branchId).maybeSingle() : { data: order };
  if (!rootOrder || ["paid", "cancelled"].includes(rootOrder.status)) return { ok: false, error: "El pedido no está disponible para cobro." };
  const balance = Number(rootOrder.balance_due);
  if (values.amount > balance + 0.005) return { ok: false, error: "El importe supera el saldo pendiente." };
  let cashSessionId: string | null = null;
  if (values.method === "cash") {
    const { data: sessions } = await admin.from("cash_sessions").select("id").eq("branch_id", context.profile.branchId).eq("status", "open").limit(1);
    if (!sessions?.[0]) return { ok: false, error: "Abre la caja antes de registrar efectivo." };
    cashSessionId = String(sessions[0].id);
  }
  const isCash = values.method === "cash";
  const { data: payment, error } = await admin.from("payments").insert({ branch_id: context.profile.branchId, order_id: rootOrderId, cash_session_id: cashSessionId, method: values.method, amount: values.amount, received_amount: isCash ? values.receivedAmount : null, change_amount: isCash ? Math.max(0, Number(values.receivedAmount) - values.amount) : 0, operation_number: null, idempotency_key: values.idempotencyKey, status: isCash ? "verified" : "pending_evidence", notes: values.notes || null, registered_by: context.staffId, verified_by: isCash ? context.staffId : null, verified_at: isCash ? new Date().toISOString() : null }).select("id").single();
  if (error || !payment) return { ok: false, error: error?.code === "23505" ? "Este pago ya fue registrado." : "No se pudo registrar el pago." };
  await refreshOrderTotals(rootOrderId, context.profile.branchId, context.staffId);
  await admin.from("audit_logs").insert({ branch_id: context.profile.branchId, actor_id: context.staffId, action: "payment.registered", entity: "payments", entity_id: payment.id, after_data: { method: values.method, amount: values.amount } });
  revalidatePath("/caja"); revalidatePath(`/pedidos/${rootOrderId}`); revalidatePath("/ventas");
  return { ok: true, id: String(payment.id) };
}

export async function attachPaymentEvidence(input: { paymentId: string; secureUrl: string; publicId: string; fileSha256: string; width: number; height: number; format: string; bytes: number }): Promise<CashActionResult> {
  const context = await requireRole("admin", "cashier");
  const parsed = z.object({ paymentId: uuid, secureUrl: z.string().url().max(1000), publicId: z.string().min(1).max(300), fileSha256: z.string().regex(/^[a-f0-9]{64}$/), width: z.number().int().positive(), height: z.number().int().positive(), format: z.string().min(1).max(20), bytes: z.number().int().positive().max(10000000) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "La evidencia no tiene un formato válido." };
  const admin = createAdminClient();
  const { data: payment } = await admin.from("payments").select("id, order_id, method, status").eq("id", parsed.data.paymentId).eq("branch_id", context.profile.branchId).maybeSingle();
  if (!payment || payment.method === "cash") return { ok: false, error: "El pago no admite evidencia digital." };
  const { error } = await admin.from("payment_evidences").insert({ branch_id: context.profile.branchId, payment_id: payment.id, secure_url: parsed.data.secureUrl, public_id: parsed.data.publicId, file_sha256: parsed.data.fileSha256, width: parsed.data.width, height: parsed.data.height, format: parsed.data.format, bytes: parsed.data.bytes, created_by: context.staffId });
  if (error) return { ok: false, error: error.code === "23505" ? "Esta evidencia ya fue usada." : "No se pudo guardar la evidencia." };
  await admin.from("payments").update({ status: "pending_verification" }).eq("id", payment.id).eq("status", "pending_evidence");
  await admin.from("audit_logs").insert({ branch_id: context.profile.branchId, actor_id: context.staffId, action: "payment.evidence_uploaded", entity: "payments", entity_id: payment.id, after_data: { public_id: parsed.data.publicId } });
  revalidatePath("/caja"); revalidatePath(`/pedidos/${payment.order_id}`);
  return { ok: true, id: String(payment.id) };
}

export async function verifyPayment(paymentId: string, approved: boolean, reason: string): Promise<CashActionResult> {
  const context = await requireRole("admin", "cashier");
  if (!uuid.safeParse(paymentId).success) return { ok: false, error: "Pago inválido." };
  const admin = createAdminClient();
  const { data: payment } = await admin.from("payments").select("id, order_id, method, status, amount").eq("id", paymentId).eq("branch_id", context.profile.branchId).maybeSingle();
  if (!payment || payment.method === "cash") return { ok: false, error: "Pago no disponible para verificación." };
  if (approved && payment.status !== "pending_verification") return { ok: false, error: "El pago todavía no tiene evidencia pendiente." };
  if (!approved && reason.trim().length < 3) return { ok: false, error: "Indica el motivo del rechazo." };
  const nextStatus = approved ? "verified" : "rejected";
  const { error } = await admin.from("payments").update({ status: nextStatus, verified_by: context.staffId, verified_at: new Date().toISOString(), rejection_reason: approved ? null : reason.trim() }).eq("id", payment.id);
  if (error) return { ok: false, error: "No se pudo actualizar el pago." };
  await refreshOrderTotals(payment.order_id, context.profile.branchId, context.staffId);
  await admin.from("audit_logs").insert({ branch_id: context.profile.branchId, actor_id: context.staffId, action: approved ? "payment.approved" : "payment.rejected", entity: "payments", entity_id: payment.id, after_data: { status: nextStatus }, reason: approved ? null : reason.trim() });
  revalidatePath("/caja"); revalidatePath(`/pedidos/${payment.order_id}`); revalidatePath("/ventas");
  return { ok: true, id: String(payment.id) };
}

export async function closeSale(orderId: string): Promise<CashActionResult> {
  const context = await requireRole("admin", "cashier");
  if (!uuid.safeParse(orderId).success) return { ok: false, error: "Pedido inválido." };
  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("id, parent_order_id, status, total, balance_due").eq("id", orderId).eq("branch_id", context.profile.branchId).maybeSingle();
  if (!order) return { ok: false, error: "Pedido no disponible." };
  const rootOrderId = order.parent_order_id ? String(order.parent_order_id) : String(order.id);
  await refreshOrderTotals(rootOrderId, context.profile.branchId, context.staffId);
  const { data: fresh } = await admin.from("orders").select("id, status, total, balance_due").eq("id", rootOrderId).eq("branch_id", context.profile.branchId).maybeSingle();
  const { data: paymentData } = await admin.from("payments").select("id, method, amount, status, cash_session_id").eq("order_id", rootOrderId).not("status", "in", "(rejected,refunded)");
  const payments = (paymentData ?? []) as Array<{ id: string; method: string; amount: number; status: string; cash_session_id: string | null }>;
  if (!fresh || Number(fresh.balance_due) > 0.005) return { ok: false, error: "El pedido todavía tiene saldo pendiente." };
  if (payments.some((payment) => payment.method !== "cash" && payment.status !== "verified")) return { ok: false, error: "Hay pagos digitales sin verificar." };
  if (fresh.status === "paid") return { ok: true, id: rootOrderId };
  const { error } = await admin.from("orders").update({ status: "paid", paid_at: new Date().toISOString(), updated_by: context.staffId }).eq("id", rootOrderId).not("status", "eq", "paid");
  if (error) return { ok: false, error: "No se pudo cerrar la venta." };
  const cashPayments = payments.filter((payment) => payment.method === "cash" && payment.cash_session_id);
  for (const payment of cashPayments) await admin.from("cash_movements").insert({ branch_id: context.profile.branchId, cash_session_id: payment.cash_session_id, payment_id: payment.id, type: "cash_sale", amount: payment.amount, created_by: context.staffId });
  await admin.from("order_status_history").insert({ branch_id: context.profile.branchId, order_id: rootOrderId, from_status: fresh.status, to_status: "paid", changed_by: context.staffId });
  await admin.from("audit_logs").insert({ branch_id: context.profile.branchId, actor_id: context.staffId, action: "sale.closed", entity: "orders", entity_id: rootOrderId, after_data: { status: "paid" } });
  revalidatePath("/caja"); revalidatePath("/mesas"); revalidatePath(`/pedidos/${rootOrderId}`); revalidatePath("/ventas"); revalidatePath("/dashboard");
  return { ok: true, id: rootOrderId };
}

const quickChargeSchema = z.object({ orderId: uuid, method: z.enum(["cash", "yape", "plin"]), amount: money, receivedAmount: money, idempotencyKey: uuid, evidence: evidenceInputSchema.nullable() });

export async function completeOrderPayment(input: unknown): Promise<CashActionResult> {
  const context = await requireRole("admin", "waiter", "cashier");
  const parsed = quickChargeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa los datos del cobro." };
  const values = parsed.data;
  const isCash = values.method === "cash";
  if (isCash && values.receivedAmount < values.amount) return { ok: false, error: "El efectivo recibido no puede ser menor al total." };
  const admin = createAdminClient();
  const { data: existing } = await admin.from("payments").select("id, order_id").eq("branch_id", context.profile.branchId).eq("idempotency_key", values.idempotencyKey).maybeSingle();
  if (existing) return { ok: true, id: String(existing.order_id) };
  const { data: selectedOrder } = await admin.from("orders").select("id, parent_order_id, status").eq("id", values.orderId).eq("branch_id", context.profile.branchId).maybeSingle();
  if (!selectedOrder) return { ok: false, error: "El pedido no fue encontrado." };
  const rootOrderId = selectedOrder.parent_order_id ? String(selectedOrder.parent_order_id) : String(selectedOrder.id);
  await refreshOrderTotals(rootOrderId, context.profile.branchId, context.staffId);
  const { data: order } = await admin.from("orders").select("id, order_code, status, total, balance_due").eq("id", rootOrderId).eq("branch_id", context.profile.branchId).maybeSingle();
  if (!order || ["paid", "cancelled"].includes(order.status)) return { ok: false, error: "La mesa ya fue cobrada o está anulada." };
  if (!["ready", "delivered", "payment_pending"].includes(order.status)) return { ok: false, error: "El pedido todavía no está completado." };
  const balance = Number(order.balance_due);
  if (Math.abs(values.amount - balance) > 0.005) return { ok: false, error: "El monto debe coincidir con el saldo de la mesa." };
  let cashSessionId: string | null = null;
  if (isCash) {
    const { data: sessions } = await admin.from("cash_sessions").select("id").eq("branch_id", context.profile.branchId).eq("status", "open").limit(1);
    if (!sessions?.[0]) return { ok: false, error: "La caja de hoy no está abierta." };
    cashSessionId = String(sessions[0].id);
  }
  const now = new Date().toISOString();
  const { data: payment, error: paymentError } = await admin.from("payments").insert({ branch_id: context.profile.branchId, order_id: rootOrderId, cash_session_id: cashSessionId, method: values.method, amount: values.amount, received_amount: isCash ? values.receivedAmount : null, change_amount: isCash ? Math.max(0, values.receivedAmount - values.amount) : 0, operation_number: null, idempotency_key: values.idempotencyKey, status: "verified", notes: null, registered_by: context.staffId, verified_by: context.staffId, verified_at: now }).select("id").single();
  if (paymentError || !payment) return { ok: false, error: paymentError?.code === "23505" ? "Este cobro ya fue registrado." : "No se pudo registrar el cobro." };
  const paymentId = String(payment.id);
  if (!isCash && values.evidence) {
    const { error: evidenceError } = await admin.from("payment_evidences").insert({ branch_id: context.profile.branchId, payment_id: paymentId, secure_url: values.evidence.secureUrl, public_id: values.evidence.publicId, file_sha256: values.evidence.fileSha256, width: values.evidence.width, height: values.evidence.height, format: values.evidence.format, bytes: values.evidence.bytes, created_by: context.staffId });
    if (evidenceError) {
      await admin.from("payments").delete().eq("id", paymentId);
      return { ok: false, error: evidenceError.code === "23505" ? "Esta evidencia ya fue utilizada." : "No se pudo guardar la evidencia." };
    }
    const { error: verifyError } = await admin.from("payments").update({ status: "verified", verified_by: context.staffId, verified_at: now }).eq("id", paymentId).eq("status", "pending_evidence");
    if (verifyError) {
      await admin.from("payment_evidences").delete().eq("payment_id", paymentId);
      await admin.from("payments").delete().eq("id", paymentId);
      return { ok: false, error: "No se pudo confirmar el pago digital." };
    }
  }
  if (isCash && cashSessionId) {
    const { error: movementError } = await admin.from("cash_movements").insert({ branch_id: context.profile.branchId, cash_session_id: cashSessionId, payment_id: paymentId, type: "cash_sale", amount: values.amount, created_by: context.staffId });
    if (movementError) {
      await admin.from("payments").delete().eq("id", paymentId);
      return { ok: false, error: "No se pudo registrar el efectivo en la caja." };
    }
  }
  await refreshOrderTotals(rootOrderId, context.profile.branchId, context.staffId);
  const { data: relatedOrders } = await admin.from("orders").select("id, status").eq("branch_id", context.profile.branchId).or(`id.eq.${rootOrderId},parent_order_id.eq.${rootOrderId}`);
  const orderIds = (relatedOrders ?? []).map((related) => String(related.id));
  if (!orderIds.includes(rootOrderId)) orderIds.push(rootOrderId);
  await admin.from("orders").update({ status: "paid", paid_at: now, updated_by: context.staffId }).in("id", orderIds).eq("branch_id", context.profile.branchId).not("status", "eq", "paid");
  await admin.from("order_status_history").insert(orderIds.map((relatedId) => ({ branch_id: context.profile.branchId, order_id: relatedId, from_status: (relatedOrders ?? []).find((related) => String(related.id) === relatedId)?.status ?? order.status, to_status: "paid", changed_by: context.staffId, reason: "Cobro rápido desde la mesa" })));
  await admin.from("audit_logs").insert({ branch_id: context.profile.branchId, actor_id: context.staffId, action: "sale.quickly_closed", entity: "orders", entity_id: rootOrderId, after_data: { method: values.method, amount: values.amount, payment_id: paymentId } });
  revalidatePath("/mesas"); revalidatePath("/caja"); revalidatePath("/pedidos"); revalidatePath(`/pedidos/${rootOrderId}`); revalidatePath("/ventas"); revalidatePath("/dashboard");
  return { ok: true, id: rootOrderId };
}

async function refreshOrderTotals(orderId: string, branchId: string, staffId: string) {
  const admin = createAdminClient();
  const [{ data: order }, { data: childOrders }] = await Promise.all([admin.from("orders").select("id, discount_total").eq("id", orderId).eq("branch_id", branchId).maybeSingle(), admin.from("orders").select("id").eq("parent_order_id", orderId).eq("branch_id", branchId)]);
  if (!order) return;
  const orderIds = [order.id, ...(childOrders ?? []).map((child) => String(child.id))];
  const [{ data: itemData }, { data: paymentData }] = await Promise.all([admin.from("order_items").select("line_total, status").in("order_id", orderIds), admin.from("payments").select("amount, status").eq("order_id", orderId)]);
  const subtotal = ((itemData ?? []) as Array<{ line_total: number; status: string }>).filter((item) => item.status !== "cancelled").reduce((sum, item) => sum + Number(item.line_total), 0);
  const total = Math.max(subtotal - Number(order.discount_total ?? 0), 0);
  const paymentTotal = ((paymentData ?? []) as Array<{ amount: number; status: string }>).filter((payment) => !["rejected", "refunded"].includes(payment.status)).reduce((sum, payment) => sum + Number(payment.amount), 0);
  await admin.from("orders").update({ subtotal, total, payment_total: paymentTotal, balance_due: Math.max(total - paymentTotal, 0), updated_by: staffId }).eq("id", orderId);
}
