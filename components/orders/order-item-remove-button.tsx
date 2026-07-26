"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { cancelOrderItem } from "@/app/actions/orders";
import { Button } from "@/components/ui/button";

export function OrderItemRemoveButton({ itemId, productName, quantity, canRemove }: { itemId: string; productName: string; quantity: number; canRemove: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function removeItem() {
    if (!canRemove) return;
    if (!window.confirm(`¿Quieres quitar ${quantity} × ${productName} de este pedido?`)) return;
    startTransition(async () => {
      const result = await cancelOrderItem(itemId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "El producto fue quitado del pedido.");
      router.refresh();
    });
  }

  return <Button type="button" variant="outline" size="sm" disabled={pending || !canRemove} onClick={removeItem} title={canRemove ? "Quitar producto" : "No se puede quitar un pedido pagado o cerrado"}><Trash2 className="size-4" /> {pending ? "Quitando…" : "Quitar"}</Button>;
}
