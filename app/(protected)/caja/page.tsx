import { CircleDollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CashPanel } from "@/components/cash/cash-panel";

type CashOrder = { id: string; orderCode: string; total: number; paymentTotal: number; balanceDue: number; status: string };
type PendingPayment = { id: string; orderId: string; orderCode: string; amount: number; method: string; status: string; secureUrl: string | null; rejectionReason: string | null };

export default async function CashPage({ searchParams }: { searchParams: Promise<{ orderId?: string }> }) {
  const context = await requireRole("admin", "cashier");
  const admin = createAdminClient();
  const [{ data: sessionData }, { data: orderData }, { data: paymentData }] = await Promise.all([
    admin.from("cash_sessions").select("id, opening_amount, expected_amount, status, opened_at").eq("branch_id", context.profile.branchId).eq("status", "open").limit(1),
    admin.from("orders").select("id, order_code, total, payment_total, balance_due, status").eq("branch_id", context.profile.branchId).is("parent_order_id", null).in("status", ["payment_pending", "delivered", "ready"]).order("created_at", { ascending: false }).limit(50),
    admin.from("payments").select("id, order_id, amount, method, status, rejection_reason").eq("branch_id", context.profile.branchId).in("status", ["pending_evidence", "pending_verification", "rejected"]).order("created_at", { ascending: false }).limit(50),
  ]);
  const session = (sessionData?.[0] ?? null) as { id: string; opening_amount: number; expected_amount: number | null; status: string; opened_at: string } | null;
  const orders = (orderData ?? []) as Array<{ id: string; order_code: string; total: number; payment_total: number; balance_due: number; status: string }>;
  const payments = (paymentData ?? []) as Array<{ id: string; order_id: string; amount: number; method: string; status: string; rejection_reason: string | null }>;
  const orderMap = new Map(orders.map((order) => [order.id, order]));
  const evidenceIds = payments.map((payment) => payment.id);
  const { data: evidenceData } = evidenceIds.length ? await admin.from("payment_evidences").select("payment_id, secure_url").in("payment_id", evidenceIds) : { data: [] };
  const evidenceMap = new Map(((evidenceData ?? []) as Array<{ payment_id: string; secure_url: string }>).map((evidence) => [evidence.payment_id, evidence.secure_url]));
  const pendingPayments: PendingPayment[] = payments.map((payment) => ({ id: payment.id, orderId: payment.order_id, orderCode: orderMap.get(payment.order_id)?.order_code ?? "Pedido", amount: Number(payment.amount), method: payment.method, status: payment.status, secureUrl: evidenceMap.get(payment.id) ?? null, rejectionReason: payment.rejection_reason }));
  const query = await searchParams;
  return <div className="mx-auto max-w-7xl space-y-6"><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-olive">Control de dinero</p><h1 className="mt-2 font-display text-4xl font-bold">Caja</h1><p className="mt-2 text-brand-olive">Apertura, pagos, verificación y cierre de ventas.</p></div><Badge variant={session ? "success" : "warning"}><CircleDollarSign className="mr-1 size-3.5" /> {session ? "Caja abierta" : "Caja cerrada"}</Badge></div><CashPanel session={session} orders={orders.map((order): CashOrder => ({ id: order.id, orderCode: order.order_code, total: Number(order.total), paymentTotal: Number(order.payment_total), balanceDue: Number(order.balance_due), status: order.status }))} payments={pendingPayments} focusOrderId={query.orderId ?? null} /></div>;
}
