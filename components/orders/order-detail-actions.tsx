"use client";

import Link from "next/link";
import { ChefHat, CreditCard, Pencil, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markOrderPaymentPending, sendOrderToKitchen } from "@/app/actions/orders";
import type { RoleKey } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OrderDetailActions({ orderId, status, roles, canEdit }: { orderId: string; status: string; roles: RoleKey[]; canEdit: boolean }) {
  const router = useRouter(); const [pending, startTransition] = useTransition(); const [error, setError] = useState("");
  const canSend = (roles.includes("admin") || roles.includes("waiter")) && (status === "draft" || status === "confirmed");
  const canRequestPayment = (roles.includes("admin") || roles.includes("waiter")) && (status === "ready" || status === "delivered");
  function run(action: () => Promise<{ ok: boolean; error?: string }>) { startTransition(async () => { const result = await action(); if (!result.ok) setError(result.error ?? "No se pudo completar la acción."); else router.refresh(); }); }
  return <Card><CardHeader><CardTitle>Acciones</CardTitle></CardHeader><CardContent className="space-y-3">{canEdit ? <Button asChild variant="outline" className="w-full"><Link href={`/pedidos/${orderId}/editar`}><Pencil className="size-4" /> Editar pedido</Link></Button> : null}{canSend ? <Button className="w-full" disabled={pending} onClick={() => run(() => sendOrderToKitchen(orderId))}><Send className="size-4" /> {pending ? "Enviando..." : "Enviar a cocina"}</Button> : null}{status === "sent_to_kitchen" || status === "preparing" || status === "partially_ready" ? <Button asChild variant="outline" className="w-full"><Link href="/cocina"><ChefHat className="size-4" /> Ver en cocina</Link></Button> : null}{canRequestPayment ? <Button className="w-full" disabled={pending} onClick={() => run(() => markOrderPaymentPending(orderId))}><CreditCard className="size-4" /> Pasar a cobro</Button> : null}{status === "payment_pending" ? <Button asChild className="w-full"><Link href={`/caja?orderId=${orderId}`}><CreditCard className="size-4" /> Registrar pago</Link></Button> : null}{canEdit && status !== "draft" && status !== "confirmed" ? <p className="text-xs text-brand-olive">La edición después de enviar a cocina requiere un motivo y queda registrada.</p> : null}{error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}</CardContent></Card>;
}
