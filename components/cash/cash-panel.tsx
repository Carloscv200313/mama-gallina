"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banknote, CheckCircle2, History, LockKeyhole } from "lucide-react";
import { closeCashSession, closeSale, openCashSession, registerPayment, verifyPayment } from "@/app/actions/cash";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/pos/types";

type Session = { id: string; opening_amount: number; expected_amount: number | null; status: string; opened_at: string } | null;
type CashOrder = { id: string; orderCode: string; total: number; paymentTotal: number; balanceDue: number; status: string };
type PendingPayment = { id: string; orderId: string; orderCode: string; amount: number; method: string; status: string; secureUrl: string | null; rejectionReason: string | null };
type CashSessionHistory = { id: string; cashierName: string; openingAmount: number; expectedAmount: number | null; countedAmount: number | null; difference: number | null; status: string; openedAt: string; closedAt: string | null };

export function CashPanel({ session, history, orders, payments, focusOrderId }: { session: Session; history: CashSessionHistory[]; orders: CashOrder[]; payments: PendingPayment[]; focusOrderId: string | null }) {
  const router = useRouter(); const [pending, startTransition] = useTransition(); const [error, setError] = useState(""); const [success, setSuccess] = useState("");
  function run(action: () => Promise<{ ok: boolean; error?: string }>) { setError(""); setSuccess(""); startTransition(async () => { const result = await action(); if (!result.ok) setError(result.error ?? "No se pudo completar la acción."); else { setSuccess("Operación completada."); router.refresh(); } }); }
  if (!session) return <div className="space-y-5"><Card className="mx-auto max-w-xl"><CardHeader><CardTitle className="flex items-center gap-2"><Banknote className="size-5" /> Abrir caja</CardTitle></CardHeader><CardContent><CashOpeningForm pending={pending} onSubmit={(amount, note) => run(() => openCashSession({ openingAmount: amount, openingNote: note }))} error={error} /></CardContent></Card><CashSessionHistory rows={history} /></div>;
  const selectedOrder = orders.find((order) => order.id === focusOrderId) ?? orders[0];
  return <div className="space-y-5">{error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}{success ? <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div> : null}<div className="grid gap-5 lg:grid-cols-[1fr_360px]"><div className="space-y-5"><Card><CardHeader><CardTitle>Cuentas por cobrar</CardTitle></CardHeader><CardContent className="space-y-3">{orders.length === 0 ? <p className="py-6 text-center text-sm text-brand-olive">No hay pedidos pendientes de cobro.</p> : orders.map((order) => <div key={order.id} className={`rounded-xl border p-4 ${order.id === selectedOrder?.id ? "border-brand-olive/50 bg-brand-cream" : "border-brand-olive/10"}`}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{order.orderCode}</p><p className="text-xs text-brand-olive">Total {formatCurrency(order.total)} · Pagado {formatCurrency(order.paymentTotal)}</p></div><Badge variant={order.balanceDue > 0 ? "warning" : "success"}>{formatCurrency(order.balanceDue)}</Badge></div><div className="mt-3"><PaymentForm order={order} pending={pending} onDone={() => router.refresh()} /></div>{order.balanceDue <= 0.005 ? <Button className="mt-3 w-full" size="sm" disabled={pending} onClick={() => run(() => closeSale(order.id))}><CheckCircle2 className="size-4" /> Cerrar venta</Button> : null}</div>)}</CardContent></Card><Card><CardHeader><CardTitle>Pagos digitales pendientes</CardTitle></CardHeader><CardContent className="space-y-3">{payments.length === 0 ? <p className="py-6 text-center text-sm text-brand-olive">No hay pagos digitales por revisar.</p> : payments.map((payment) => <PaymentReview key={payment.id} payment={payment} pending={pending} onAction={(approved, reason) => run(() => verifyPayment(payment.id, approved, reason))} />)}</CardContent></Card></div><div className="space-y-5"><Card><CardHeader><CardTitle className="flex items-center gap-2"><LockKeyhole className="size-5" /> Sesión actual</CardTitle></CardHeader><CardContent><div className="grid gap-3 text-sm"><div className="flex justify-between"><span className="text-brand-olive">Apertura</span><span className="font-semibold">{formatCurrency(Number(session.opening_amount))}</span></div><div className="flex justify-between"><span className="text-brand-olive">Inicio</span><span>{formatCashDate(session.opened_at)}</span></div></div><CashClosingForm pending={pending} onSubmit={(countedAmount, note) => run(() => closeCashSession({ sessionId: session.id, countedAmount, closingNote: note }))} /></CardContent></Card></div></div><CashSessionHistory rows={history} /></div>;
}

function CashOpeningForm({ pending, onSubmit, error }: { pending: boolean; onSubmit: (amount: number, note: string) => void; error: string }) { const [amount, setAmount] = useState("0"); const [note, setNote] = useState(""); return <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); onSubmit(Number(amount), note); }}><label className="block text-sm font-semibold">Monto inicial<Input className="mt-2" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><textarea className="min-h-20 w-full rounded-xl border border-brand-olive/20 p-3 text-sm" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Observación (opcional)" />{error ? <p className="text-sm text-red-700">{error}</p> : null}<Button className="w-full" disabled={pending}>Abrir caja</Button></form>; }

function CashClosingForm({ pending, onSubmit }: { pending: boolean; onSubmit: (amount: number, note: string) => void }) { const [amount, setAmount] = useState(""); const [note, setNote] = useState(""); return <form className="mt-5 space-y-3 border-t border-brand-olive/10 pt-5" onSubmit={(event) => { event.preventDefault(); onSubmit(Number(amount), note); }}><p className="text-sm font-semibold">Cerrar sesión</p><Input type="number" min="0" step="0.01" required placeholder="Efectivo contado" value={amount} onChange={(event) => setAmount(event.target.value)} /><textarea className="min-h-16 w-full rounded-xl border border-brand-olive/20 p-3 text-sm" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Observación de cierre" /><Button variant="outline" className="w-full" disabled={pending}>Cerrar caja</Button></form>; }

function CashSessionHistory({ rows }: { rows: CashSessionHistory[] }) {
  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><History className="size-5" /> Historial de cierres</CardTitle></CardHeader><CardContent className="space-y-3">{rows.length === 0 ? <p className="py-6 text-center text-sm text-brand-olive">Todavía no hay sesiones de caja registradas.</p> : rows.map((row) => <div key={row.id} className="rounded-xl border border-brand-olive/10 p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-semibold">{formatCashDate(row.openedAt)} · {row.cashierName}</p><p className="mt-1 text-xs text-brand-olive">Apertura {formatCurrency(row.openingAmount)} · {row.closedAt ? `Cierre ${formatCashDate(row.closedAt)}` : "Sesión activa"}</p></div><Badge variant={row.status === "open" ? "success" : row.status === "closed_with_difference" ? "danger" : "muted"}>{row.status === "open" ? "Abierta" : row.status === "closed_with_difference" ? "Cerrada con diferencia" : "Cerrada"}</Badge></div>{row.status !== "open" ? <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3"><div><p className="text-xs text-brand-olive">Esperado</p><p className="font-semibold">{formatCurrency(row.expectedAmount ?? 0)}</p></div><div><p className="text-xs text-brand-olive">Contado</p><p className="font-semibold">{formatCurrency(row.countedAmount ?? 0)}</p></div><div><p className="text-xs text-brand-olive">Diferencia</p><p className={`font-semibold ${(row.difference ?? 0) === 0 ? "text-emerald-700" : "text-red-700"}`}>{formatSignedCurrency(row.difference ?? 0)}</p></div></div> : null}</div>)}</CardContent></Card>;
}

function formatCashDate(value: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.day}/${values.month}/${values.year}, ${values.hour}:${values.minute} ${values.dayPeriod === "AM" ? "a. m." : "p. m."}`;
}
function formatSignedCurrency(value: number) { return `${value >= 0 ? "+" : "-"} ${formatCurrency(Math.abs(value))}`; }

function PaymentForm({ order, pending, onDone }: { order: CashOrder; pending: boolean; onDone: () => void }) {
  const [method, setMethod] = useState<"cash" | "plin" | "bank_transfer">("cash");
  const [amount, setAmount] = useState(order.balanceDue.toFixed(2));
  const [received, setReceived] = useState("");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const isDigital = method !== "cash";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setUploading(true);
    const payment = await registerPayment({ orderId: order.id, method, amount: Number(amount), receivedAmount: method === "cash" ? Number(received || amount) : null, notes: "", idempotencyKey: crypto.randomUUID() });
    if (payment.ok === false || !payment.id) {
      setMessage(payment.ok === false ? payment.error : "No se pudo registrar el pago.");
      setUploading(false);
      return;
    }
    setMessage("Pago registrado correctamente.");
    setUploading(false);
    onDone();
  }

  return <form className="mt-3 grid gap-2 sm:grid-cols-[150px_110px_1fr_auto]" onSubmit={submit}><select className="min-h-10 rounded-xl border border-brand-olive/20 px-2 text-sm" value={method} onChange={(event) => setMethod(event.target.value as typeof method)}><option value="cash">Efectivo</option><option value="plin">Plin</option><option value="bank_transfer">Transferencia</option></select><Input type="number" min="0.01" max={order.balanceDue} step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} />{isDigital ? <p className="flex min-h-10 items-center rounded-xl bg-brand-cream px-3 text-xs text-brand-olive sm:col-span-1">Sin foto</p> : <Input type="number" min="0" step="0.01" required placeholder="Recibido" value={received} onChange={(event) => setReceived(event.target.value)} />}{!isDigital ? <Button size="sm" disabled={pending || uploading}><Banknote className="size-4" /> Registrar</Button> : <Button size="sm" disabled={pending || uploading}>{uploading ? "Registrando..." : "Registrar"}</Button>}{message ? <p className={`text-xs sm:col-span-4 ${message.includes("correctamente") ? "text-emerald-700" : "text-red-700"}`}>{message}</p> : null}</form>;
}

function PaymentReview({ payment, pending, onAction }: { payment: PendingPayment; pending: boolean; onAction: (approved: boolean, reason: string) => void }) { const [reason, setReason] = useState(""); return <div className="rounded-xl border border-brand-olive/10 p-3"><div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{payment.orderCode} · {formatCurrency(payment.amount)}</p><p className="text-xs text-brand-olive">{payment.method === "plin" ? "Plin" : "Transferencia"}</p></div><Badge variant={payment.status === "rejected" ? "danger" : "warning"}>{payment.status === "pending_verification" ? "Por verificar" : payment.status === "rejected" ? "Rechazado" : "Pendiente"}</Badge></div>{payment.secureUrl ? <img src={payment.secureUrl} alt="Evidencia del pago" className="mt-3 max-h-48 w-full rounded-xl object-contain" /> : <p className="mt-3 text-xs text-red-700">Sin evidencia cargada.</p>}<div className="mt-3 flex gap-2"><Button size="sm" disabled={pending || payment.status !== "pending_verification"} onClick={() => onAction(true, "")}>Aprobar</Button><Input className="min-h-9" placeholder="Motivo de rechazo" value={reason} onChange={(event) => setReason(event.target.value)} /><Button size="sm" variant="danger" disabled={pending} onClick={() => onAction(false, reason)}>Rechazar</Button></div></div>; }
