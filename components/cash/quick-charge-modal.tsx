"use client";

import { useState } from "react";
import { Banknote, CheckCircle2, Smartphone, X } from "lucide-react";
import { completeOrderPayment } from "@/app/actions/cash";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/pos/types";
import { useRouter } from "next/navigation";

type Method = "cash" | "yape" | "plin";

export function QuickChargeModal({ orderId, orderCode, total }: { orderId: string; orderCode: string; total: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<Method>("cash");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const digital = method !== "cash";

  function selectMethod(nextMethod: Method) {
    setMethod(nextMethod);
    setMessage("");
  }

  function close() {
    if (saving) return;
    setOpen(false);
    setMessage("");
  }

  async function charge() {
    setMessage("");
    setSaving(true);
    try {
      const result = await completeOrderPayment({ orderId, method, amount: total, receivedAmount: total, idempotencyKey: crypto.randomUUID(), evidence: null });
      if (!result.ok) throw new Error(result.error);
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "No se pudo completar el cobro.");
    } finally {
      setSaving(false);
    }
  }

  return <>
    <Button type="button" className="w-full" onClick={() => { setOpen(true); setMessage(""); }}><CheckCircle2 className="size-4" /> Cobrar pedido</Button>
    {open ? <div className="fixed inset-0 z-50 grid place-items-center bg-brand-forest/40 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-olive">Cobro rápido</p><h2 className="mt-1 font-display text-2xl font-bold">{orderCode}</h2><p className="mt-1 text-sm text-brand-olive">Total a cobrar</p></div><button type="button" onClick={close} className="rounded-lg p-1 text-brand-olive hover:bg-brand-cream" aria-label="Cerrar"><X className="size-5" /></button></div><div className="mt-5 rounded-xl bg-brand-cream p-4 text-center"><p className="text-sm text-brand-olive">Monto</p><p className="mt-1 font-display text-3xl font-bold">{formatCurrency(total)}</p></div><p className="mt-5 text-sm font-semibold">Selecciona el tipo de pago</p><div className="mt-2 grid grid-cols-3 gap-2"><PaymentMethodButton active={method === "cash"} onClick={() => selectMethod("cash")} icon={<Banknote className="size-5" />} label="Efectivo" /><PaymentMethodButton active={method === "yape"} onClick={() => selectMethod("yape")} icon={<Smartphone className="size-5" />} label="Yape" /><PaymentMethodButton active={method === "plin"} onClick={() => selectMethod("plin")} icon={<Smartphone className="size-5" />} label="Plin" /></div>{digital ? <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">El pago digital se registrará sin foto de comprobante.</p> : <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">El efectivo se registrará en la caja abierta de hoy.</p>}{message ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p> : null}<Button type="button" className="mt-5 w-full" size="lg" disabled={saving} onClick={charge}>{saving ? "Procesando..." : "Cobrado"}</Button></div></div> : null}
  </>;
}

function PaymentMethodButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return <button type="button" onClick={onClick} className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border p-2 text-xs font-semibold transition ${active ? "border-brand-forest bg-brand-forest text-white" : "border-brand-olive/15 text-brand-forest hover:bg-brand-cream"}`}>{icon}<span>{label}</span></button>;
}
