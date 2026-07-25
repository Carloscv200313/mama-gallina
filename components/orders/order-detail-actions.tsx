"use client";

import Link from "next/link";
import { ChefHat, Pencil, Plus, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendOrderToKitchen } from "@/app/actions/orders";
import { QuickChargeModal } from "@/components/cash/quick-charge-modal";
import type { RoleKey } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OrderDetailActions({ orderId, status, roles, canEdit, tableId, orderCode, total }: { orderId: string; status: string; roles: RoleKey[]; canEdit: boolean; tableId: string | null; orderCode: string; total: number }) {
  const router = useRouter(); const [pending, startTransition] = useTransition(); const [error, setError] = useState("");
  const canSend = (roles.includes("admin") || roles.includes("waiter")) && (status === "draft" || status === "confirmed");
  function run(action: () => Promise<{ ok: boolean; error?: string }>) { startTransition(async () => { const result = await action(); if (!result.ok) setError(result.error ?? "No se pudo completar la acción."); else router.refresh(); }); }
  const canAdd = (roles.includes("admin") || roles.includes("waiter")) && Boolean(tableId) && !["payment_pending", "paid", "cancelled"].includes(status);
  const canCharge = (roles.includes("admin") || roles.includes("waiter") || roles.includes("cashier")) && Boolean(tableId) && ["ready", "delivered", "payment_pending"].includes(status);
  return <Card><CardHeader><CardTitle>Acciones</CardTitle></CardHeader><CardContent className="space-y-3">{canAdd ? <Button asChild className="w-full"><Link href={`/pedidos/nuevo?tableId=${tableId}&parentOrderId=${orderId}`}><Plus className="size-4" /> Agregar pedido</Link></Button> : null}{canCharge ? <QuickChargeModal orderId={orderId} orderCode={orderCode} total={total} /> : null}{canEdit ? <Button asChild variant="outline" className="w-full"><Link href={`/pedidos/${orderId}/editar`}><Pencil className="size-4" /> Editar pedido</Link></Button> : null}{canSend ? <Button className="w-full" disabled={pending} onClick={() => run(() => sendOrderToKitchen(orderId))}><Send className="size-4" /> {pending ? "Enviando..." : "Enviar a cocina"}</Button> : null}{status === "sent_to_kitchen" || status === "preparing" || status === "partially_ready" ? <Button asChild variant="outline" className="w-full"><Link href="/cocina"><ChefHat className="size-4" /> Ver en cocina</Link></Button> : null}{canEdit && status !== "draft" && status !== "confirmed" ? <p className="text-xs text-brand-olive">La edición después de enviar a cocina requiere un motivo y queda registrada.</p> : null}{error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}</CardContent></Card>;
}
