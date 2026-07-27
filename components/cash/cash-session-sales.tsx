"use client";

import { useState, useTransition } from "react";
import { Eye, Loader2, X } from "lucide-react";
import { getCashSessionSales, type CashSessionSalesResult } from "@/app/actions/cash";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/pos/types";

export function CashSessionSalesButton({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<CashSessionSalesResult | null>(null);
  const [pending, startTransition] = useTransition();

  function openSales() {
    setOpen(true);
    startTransition(async () => setResult(await getCashSessionSales(sessionId)));
  }

  return <>
    <Button type="button" size="sm" variant="outline" onClick={openSales} disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />} Ver ventas
    </Button>
    {open ? <div className="fixed inset-0 z-50 grid place-items-center bg-brand-forest/40 p-4" role="dialog" aria-modal="true" aria-label="Ventas de la sesión de caja" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-brand-olive/10 p-5">
          <div><p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-olive">Resumen de caja</p><h2 className="mt-1 font-display text-2xl font-bold">Ventas de la sesión</h2></div>
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-brand-olive hover:bg-brand-cream" aria-label="Cerrar resumen"><X className="size-5" /></button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto p-5">
          {pending ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-brand-olive"><Loader2 className="size-5 animate-spin" /> Cargando ventas...</div> : null}
          {!pending && result?.ok === false ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{result.error}</p> : null}
          {!pending && result?.ok === true ? <div className="space-y-4"><div className="rounded-xl bg-brand-cream p-4"><p className="text-sm text-brand-olive">Total vendido</p><p className="mt-1 font-display text-3xl font-bold">{formatCurrency(result.total)}</p></div><div className="space-y-2"><h3 className="font-semibold">Productos vendidos</h3>{result.products.length ? result.products.map((product) => <div key={product.name} className="flex items-center justify-between gap-3 rounded-xl border border-brand-olive/10 p-3"><div><p className="font-semibold">{product.name}</p><p className="text-xs text-brand-olive">{product.quantity} und.</p></div><span className="font-semibold">{formatCurrency(product.amount)}</span></div>) : <p className="rounded-xl border border-brand-olive/10 p-4 text-sm text-brand-olive">No hay productos vendidos en esta sesión.</p>}</div></div> : null}
        </div>
      </div>
    </div> : null}
  </>;
}
