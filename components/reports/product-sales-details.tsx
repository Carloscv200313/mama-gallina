"use client";

import { CalendarClock, Eye, MapPin, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export type ProductSaleDetail = {
  quantity: number;
  variant: string | null;
  modifiers: Array<{ group: string; option: string; quantity: number }>;
  notes: string | null;
  soldAt: string | null;
  tableLabel: string;
  orderCode: string;
};

export function ProductSalesDetails({ productName, totalQuantity, details }: { productName: string; totalQuantity: number; details: ProductSaleDetail[] }) {
  const [open, setOpen] = useState(false);

  return <>
    <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label={`Ver detalle de ${productName}`} title={`Ver detalle de ${productName}`} onClick={() => setOpen(true)}>
      <Eye className="size-4" />
    </Button>
    {open ? <div className="fixed inset-0 z-50 grid place-items-center bg-brand-forest/40 p-4" role="dialog" aria-modal="true" aria-label={`Detalle de ${productName}`}>
      <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-brand-olive/10 p-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-olive">Detalle de ventas</p>
            <h2 className="mt-1 font-display text-2xl font-bold">{productName}</h2>
            <p className="mt-1 text-sm text-brand-olive">{totalQuantity} unidades vendidas hoy</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-brand-olive hover:bg-brand-cream" aria-label="Cerrar detalle"><X className="size-5" /></button>
        </div>
        <div className="max-h-[65vh] space-y-3 overflow-y-auto p-5">
          {details.map((detail, index) => <div key={`${productName}-${index}`} className="rounded-xl border border-brand-olive/10 bg-brand-cream/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div><p className="font-semibold">{detail.orderCode}</p></div>
              <span className="rounded-lg bg-white px-2 py-1 text-sm font-semibold">{detail.quantity} und.</span>
            </div>
            <div className="mt-3 grid gap-2 rounded-lg border border-brand-olive/10 bg-white p-3 text-sm sm:grid-cols-2"><p className="flex items-center gap-2"><CalendarClock className="size-4 shrink-0 text-brand-gold" /><span><span className="font-semibold text-brand-forest">Fecha y hora:</span> <span className="text-brand-olive">{formatSaleDate(detail.soldAt)}</span></span></p><p className="flex items-center gap-2"><MapPin className="size-4 shrink-0 text-brand-gold" /><span><span className="font-semibold text-brand-forest">Mesa:</span> <span className="text-brand-olive">{detail.tableLabel}</span></span></p></div>
            {detail.variant ? <p className="mt-2 text-sm"><span className="font-semibold">Variante:</span> {detail.variant}</p> : null}
            {detail.modifiers.length ? <div className="mt-2 text-sm"><p className="font-semibold">Personalización:</p><ul className="mt-1 space-y-1 text-brand-olive">{detail.modifiers.map((modifier, modifierIndex) => <li key={`${modifier.option}-${modifierIndex}`}>{modifier.group}: {modifier.option}{modifier.quantity > 1 ? ` × ${modifier.quantity}` : ""}</li>)}</ul></div> : null}
            {detail.notes ? <p className="mt-2 text-sm italic text-brand-brown"><span className="font-semibold not-italic">Nota:</span> {detail.notes}</p> : null}
            {!detail.variant && !detail.modifiers.length && !detail.notes ? <p className="mt-2 text-sm text-brand-olive">Sin personalización registrada.</p> : null}
          </div>)}
        </div>
      </div>
    </div> : null}
  </>;
}

function formatSaleDate(value: string | null) {
  if (!value) return "Fecha no disponible";
  return new Date(value).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" });
}
