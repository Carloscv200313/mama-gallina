"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { Banknote, CheckCircle2, ImagePlus, Smartphone, X } from "lucide-react";
import { completeOrderPayment } from "@/app/actions/cash";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/pos/types";
import { useRouter } from "next/navigation";

type Method = "cash" | "yape" | "plin";
type Evidence = { secureUrl: string; publicId: string; fileSha256: string; width: number; height: number; format: string; bytes: number };

export function QuickChargeModal({ orderId, orderCode, total }: { orderId: string; orderCode: string; total: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<Method>("cash");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const digital = method !== "cash";

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function clearFile() {
    setFile(null);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function selectMethod(nextMethod: Method) {
    setMethod(nextMethod);
    setMessage("");
    if (nextMethod === "cash") clearFile();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    if (!nextFile) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(nextFile.type)) { clearFile(); setMessage("Selecciona una imagen JPG, PNG o WebP."); return; }
    if (nextFile.size > 10_000_000) { clearFile(); setMessage("La imagen no puede superar los 10 MB."); return; }
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
    setMessage("");
  }

  function close() {
    if (saving) return;
    setOpen(false);
    setMessage("");
    clearFile();
  }

  async function charge() {
    setMessage("");
    if (digital && !file) { setMessage("Toma o selecciona la foto del comprobante."); return; }
    setSaving(true);
    try {
      let evidence: Evidence | null = null;
      if (digital && file) {
        const signResponse = await fetch("/api/cloudinary/signature", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderCode }) });
        const signature = await signResponse.json();
        if (!signResponse.ok) throw new Error(signature.error ?? "No se pudo preparar la foto.");
        const body = new FormData();
        body.append("file", file);
        body.append("api_key", signature.apiKey);
        body.append("timestamp", String(signature.timestamp));
        body.append("signature", signature.signature);
        body.append("folder", signature.folder);
        const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, { method: "POST", body });
        const upload = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(upload.error?.message ?? "No se pudo subir la foto.");
        const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
        const fileSha256 = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
        const dimensions = await getImageDimensions(file);
        evidence = { secureUrl: upload.secure_url, publicId: upload.public_id, fileSha256, width: dimensions.width, height: dimensions.height, format: upload.format ?? file.type.split("/")[1] ?? "jpg", bytes: file.size };
      }
      const result = await completeOrderPayment({ orderId, method, amount: total, receivedAmount: total, idempotencyKey: crypto.randomUUID(), evidence });
      if (!result.ok) throw new Error(result.error);
      setOpen(false);
      clearFile();
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "No se pudo completar el cobro.");
    } finally {
      setSaving(false);
    }
  }

  return <>
    <Button type="button" className="w-full" onClick={() => { setOpen(true); setMessage(""); }}><CheckCircle2 className="size-4" /> Cobrar pedido</Button>
    {open ? <div className="fixed inset-0 z-50 grid place-items-center bg-brand-forest/40 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-olive">Cobro rápido</p><h2 className="mt-1 font-display text-2xl font-bold">{orderCode}</h2><p className="mt-1 text-sm text-brand-olive">Total a cobrar</p></div><button type="button" onClick={close} className="rounded-lg p-1 text-brand-olive hover:bg-brand-cream" aria-label="Cerrar"><X className="size-5" /></button></div><div className="mt-5 rounded-xl bg-brand-cream p-4 text-center"><p className="text-sm text-brand-olive">Monto</p><p className="mt-1 font-display text-3xl font-bold">{formatCurrency(total)}</p></div><p className="mt-5 text-sm font-semibold">Selecciona el tipo de pago</p><div className="mt-2 grid grid-cols-3 gap-2"><PaymentMethodButton active={method === "cash"} onClick={() => selectMethod("cash")} icon={<Banknote className="size-5" />} label="Efectivo" /><PaymentMethodButton active={method === "yape"} onClick={() => selectMethod("yape")} icon={<Smartphone className="size-5" />} label="Yape" /><PaymentMethodButton active={method === "plin"} onClick={() => selectMethod("plin")} icon={<Smartphone className="size-5" />} label="Plin" /></div>{digital ? <div className="mt-4 space-y-3"><label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-brand-olive/30 px-3 text-sm font-semibold text-brand-forest hover:bg-brand-cream"><ImagePlus className="size-5" />{file ? "Cambiar foto" : "Tomar foto o seleccionar"}<input ref={inputRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleFileChange} /></label>{previewUrl ? <div className="relative rounded-xl border border-brand-olive/15 bg-brand-cream p-2"><img src={previewUrl} alt="Previsualización del comprobante" className="max-h-56 w-full rounded-lg object-contain" /><div className="mt-2 flex items-center justify-between gap-2 text-xs text-brand-olive"><span className="truncate">{file?.name}</span><button type="button" onClick={clearFile} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-red-700 hover:bg-red-50"><X className="size-3.5" /> Quitar</button></div></div> : null}</div> : <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">El efectivo se registrará en la caja abierta de hoy.</p>}{message ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p> : null}<Button type="button" className="mt-5 w-full" size="lg" disabled={saving} onClick={charge}>{saving ? "Procesando..." : "Cobrado"}</Button></div></div> : null}
  </>;
}

function PaymentMethodButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return <button type="button" onClick={onClick} className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border p-2 text-xs font-semibold transition ${active ? "border-brand-forest bg-brand-forest text-white" : "border-brand-olive/15 text-brand-forest hover:bg-brand-cream"}`}>{icon}<span>{label}</span></button>;
}

async function getImageDimensions(file: File) {
  const url = URL.createObjectURL(file);
  try { return await new Promise<{ width: number; height: number }>((resolve, reject) => { const image = new Image(); image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight }); image.onerror = () => reject(new Error("No se pudo leer la imagen.")); image.src = url; }); }
  finally { URL.revokeObjectURL(url); }
}
