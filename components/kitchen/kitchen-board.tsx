"use client";

import { Check, ChefHat, Clock3, Play } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateKitchenItem } from "@/app/actions/orders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { orderStatusClass } from "@/lib/pos/types";
import { createBrowserClient } from "@/lib/supabase/browser";

type KitchenItem = { id: string; orderId: string; orderCode: string; tableLabel: string; openedAt: string; elapsedMinutes: number; productName: string; variantName: string | null; modifierLabels: string[]; quantity: number; notes: string | null; priority: string; status: string };

type KitchenRealtimePayload = { payload?: { reason?: string } };

const kitchenBellPath = "/mixkit-melodic-classic-door-bell-111.wav";
const activeKitchenSounds = new Set<HTMLAudioElement>();
const kitchenSpeechDelay = 5600;

function playKitchenBell() {
  const audio = new Audio(kitchenBellPath);
  audio.preload = "auto";
  audio.volume = 1;
  activeKitchenSounds.add(audio);
  let repeatTimer: number | undefined;
  const cleanup = () => {
    if (repeatTimer) window.clearTimeout(repeatTimer);
    activeKitchenSounds.delete(audio);
    audio.onended = null;
  };
  audio.onended = cleanup;
  void audio.play().then(() => {
    repeatTimer = window.setTimeout(() => {
      audio.currentTime = 0;
      void audio.play().catch(cleanup);
    }, 2800);
  }).catch(cleanup);
}

function getKitchenSpeechText(items: KitchenItem[]) {
  const firstItem = items[0];
  if (!firstItem) return "";
  const destination = firstItem.tableLabel === "Para llevar" ? "el pedido para llevar" : firstItem.tableLabel;
  const prefix = firstItem.orderCode.includes("Nueva tanda") ? "Nueva tanda para" : "Nuevo pedido para";
  const products = items.map((item) => {
    const details = [item.variantName, ...item.modifierLabels].filter(Boolean).join(", ");
    const note = item.notes ? `. Observación: ${item.notes}` : "";
    return `${item.quantity} ${item.productName}${details ? `, ${details}` : ""}${note}`;
  }).join(". ");
  return `${prefix} ${destination}. ${products}.`;
}

function speakKitchenOrder(text: string) {
  if (!("speechSynthesis" in window) || !text) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-PE";
  utterance.rate = 0.92;
  utterance.pitch = 1;
  utterance.volume = 1;
  const spanishVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("es"));
  if (spanishVoice) utterance.voice = spanishVoice;
  window.speechSynthesis.speak(utterance);
}

export function KitchenBoard({ items, branchId }: { items: KitchenItem[]; branchId: string }) {
  const router = useRouter(); const [optimisticStatuses, setOptimisticStatuses] = useState<Record<string, string>>({}); const [pending, startTransition] = useTransition(); const [error, setError] = useState(""); const audioRef = useRef<HTMLAudioElement | null>(null); const knownOrderIdsRef = useRef<Set<string> | null>(null); const pendingSpeechRef = useRef(false); const speechQueueRef = useRef<string[]>([]); const speechUnlockedRef = useRef(false);
  const currentItems = items.map((item) => optimisticStatuses[item.id] ? { ...item, status: optimisticStatuses[item.id] } : item);
  useEffect(() => {
    const currentOrderIds = new Set(items.map((item) => item.orderId));
    if (!knownOrderIdsRef.current) {
      knownOrderIdsRef.current = currentOrderIds;
      return;
    }
    if (pendingSpeechRef.current) {
      const newItemsByOrder = new Map<string, KitchenItem[]>();
      items.forEach((item) => {
        if (!knownOrderIdsRef.current?.has(item.orderId)) {
          const orderItems = newItemsByOrder.get(item.orderId) ?? [];
          orderItems.push(item);
          newItemsByOrder.set(item.orderId, orderItems);
        }
      });
      if (newItemsByOrder.size) {
        pendingSpeechRef.current = false;
        newItemsByOrder.forEach((orderItems) => {
          const text = getKitchenSpeechText(orderItems);
          window.setTimeout(() => {
            if (speechUnlockedRef.current) speakKitchenOrder(text);
            else speechQueueRef.current.push(text);
          }, kitchenSpeechDelay);
        });
      }
    }
    knownOrderIdsRef.current = currentOrderIds;
  }, [items]);
  useEffect(() => {
    const supabase = createBrowserClient();
    const channel = supabase.channel(`kitchen:${branchId}`);
    channel.on("broadcast", { event: "kitchen:update" }, (event: KitchenRealtimePayload) => {
      const reason = event.payload?.reason;
      if (reason === "order_created" || reason === "additional_order_created" || reason === "order_sent_to_kitchen") {
        pendingSpeechRef.current = true;
        playKitchenBell();
      }
      router.refresh();
    });
    channel.subscribe();
    const audio = audioRef.current ?? new Audio(kitchenBellPath);
    audio.preload = "auto";
    audio.volume = 1;
    audioRef.current = audio;
    const unlockAudio = () => {
      void audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
      }).catch(() => undefined);
      speechUnlockedRef.current = true;
      const queuedMessages = speechQueueRef.current.splice(0);
      queuedMessages.forEach((message) => speakKitchenOrder(message));
    };
    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
    const timer = window.setInterval(() => router.refresh(), 30000);
    return () => { window.clearInterval(timer); window.removeEventListener("pointerdown", unlockAudio); window.removeEventListener("keydown", unlockAudio); audio.onended = null; audio.pause(); window.speechSynthesis?.cancel(); void supabase.removeChannel(channel); };
  }, [branchId, router]);
  const columns = [{ key: "pending", label: "Pendientes" }, { key: "preparing", label: "En preparación" }, { key: "ready", label: "Listos" }];
  function readKitchenItem(item: KitchenItem) {
    const text = getKitchenSpeechText([item]).replace("Nuevo pedido", "Pedido");
    window.speechSynthesis?.cancel();
    speakKitchenOrder(text);
  }
  function move(item: KitchenItem, next: "preparing" | "ready" | "delivered") { setError(""); startTransition(async () => { const result = await updateKitchenItem(item.id, next); if (!result.ok) { setError(result.error ?? "No se pudo actualizar."); return; } setOptimisticStatuses((current) => ({ ...current, [item.id]: next })); }); }
  return <>{error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-brand-red">{error}</div> : null}<div className="grid gap-5 lg:grid-cols-3">{columns.map((column) => { const columnItems = currentItems.filter((item) => item.status === column.key); return <section key={column.key} className="space-y-3"><div className="flex items-center justify-between"><h2 className="font-display text-xl font-bold">{column.label}</h2><Badge variant="muted">{columnItems.length}</Badge></div>{columnItems.length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-brand-olive">Sin productos</CardContent></Card> : columnItems.map((item) => <KitchenTicket key={item.id} item={item} pending={pending} onMove={move} onRead={readKitchenItem} />)}</section>; })}</div></>;
}

function KitchenTicket({ item, pending, onMove, onRead }: { item: KitchenItem; pending: boolean; onMove: (item: KitchenItem, next: "preparing" | "ready" | "delivered") => void; onRead: (item: KitchenItem) => void }) {
  const [elapsed, setElapsed] = useState(item.elapsedMinutes);
  useEffect(() => { const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(item.openedAt).getTime()) / 60000))); update(); const timer = window.setInterval(update, 30000); return () => window.clearInterval(timer); }, [item.openedAt]);
  return <Card className={`${item.priority === "high" ? "border-red-300" : ""} cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md`} onClick={(event) => { if (event.target instanceof HTMLElement && event.target.closest("button")) return; onRead(item); }}><CardHeader className="flex-row items-start justify-between pb-3"><div><CardTitle className="text-base">{item.tableLabel}</CardTitle><p className="mt-1 text-xs text-brand-olive">{item.orderCode}</p></div><Badge className={elapsed >= 20 ? "bg-red-100 text-red-800" : orderStatusClass(item.status)}><Clock3 className="mr-1 size-3" /> {elapsed} min</Badge></CardHeader><CardContent><div className="rounded-xl bg-brand-cream p-3"><p className="font-semibold">{item.quantity} × {item.productName}</p>{item.variantName ? <p className="text-sm text-brand-olive">{item.variantName}</p> : null}{item.modifierLabels.length ? <p className="mt-1 text-xs text-brand-olive">{item.modifierLabels.join(" · ")}</p> : null}{item.notes ? <p className="mt-2 text-xs italic text-brand-brown">{item.notes}</p> : null}</div>{item.status === "pending" ? <Button className="mt-3 w-full" size="sm" disabled={pending} onClick={() => onMove(item, "preparing")}><Play className="size-4" /> Preparar</Button> : item.status === "preparing" ? <Button className="mt-3 w-full" size="sm" disabled={pending} onClick={() => onMove(item, "ready")}><Check className="size-4" /> Pedido listo</Button> : <Button className="mt-3 w-full" size="sm" variant="outline" disabled={pending} onClick={() => onMove(item, "delivered")}><ChefHat className="size-4" /> Entregado</Button>}</CardContent></Card>;
}
