"use client";

import Link from "next/link";
import { ArrowLeft, Minus, Pencil, Plus, Search, ShoppingBasket, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOrder, updateOrder } from "@/app/actions/orders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MultiCheckboxSelect } from "@/components/orders/multi-checkbox-select";
import type { CatalogCategory, CatalogModifierGroup, CatalogProduct, OrderComposerItem } from "@/lib/pos/types";
import { formatCurrency } from "@/lib/pos/types";

type Props = { catalog: { categories: CatalogCategory[]; products: CatalogProduct[] }; table: { id: string; tableNumber: number; name: string | null } | null; initialOrderType: "dine_in" | "takeaway"; editingOrderId?: string; initialCart?: OrderComposerItem[]; initialNotes?: string; editReasonRequired?: boolean };
type UnitSelections = Record<number, Record<string, string[]>>;

function cartItemFingerprint(item: OrderComposerItem) {
  const modifiers = [...item.modifierIds].sort((left, right) => `${left.groupId}:${left.optionId}`.localeCompare(`${right.groupId}:${right.optionId}`));
  return JSON.stringify({ productId: item.productId, variantId: item.variantId, notes: item.notes.trim(), priority: item.priority, modifiers });
}

function mergeModifierIds(current: OrderComposerItem, next: OrderComposerItem) {
  const perPlateGroups = new Set(next.perPlateGroupIds);
  const merged = current.modifierIds.map((modifier) => ({ ...modifier }));
  for (const modifier of next.modifierIds) {
    const existing = merged.find((value) => value.groupId === modifier.groupId && value.optionId === modifier.optionId);
    if (existing && perPlateGroups.has(modifier.groupId)) existing.quantity += modifier.quantity;
    else if (!existing) merged.push({ ...modifier });
  }
  return merged;
}

function mergeCartItem(current: OrderComposerItem[], next: OrderComposerItem) {
  const matchingIndex = current.findIndex((item) => cartItemFingerprint(item) === cartItemFingerprint(next));
  if (matchingIndex < 0) return [...current, next];
  return current.map((item, index) => index === matchingIndex ? { ...item, quantity: item.quantity + next.quantity, modifierIds: mergeModifierIds(item, next), plateSelections: [...item.plateSelections, ...next.plateSelections] } : item);
}

function isPerPlateGroup(group: CatalogModifierGroup) {
  const name = group.name.trim().toLocaleLowerCase();
  return name === "extras" || name.includes("sabores");
}

function isChickenBroth(product: CatalogProduct) {
  return product.name.trim().toLocaleLowerCase() === "caldo de gallina";
}

function isAceVichadoBroth(product: CatalogProduct) {
  return product.name.trim().toLocaleLowerCase() === "caldo acevichado";
}

function isBroth(product: CatalogProduct) {
  return product.name.trim().toLocaleLowerCase().startsWith("caldo");
}

function isPlainBroth(product: CatalogProduct) {
  return ["caldo de cordero", "caldo de mote", "caldo combinado"].includes(product.name.trim().toLocaleLowerCase());
}

function getProductGroupOptions(product: CatalogProduct, group: CatalogModifierGroup) {
  if (isBroth(product) && group.name.trim().toLocaleLowerCase() === "extras") return group.options.filter((option) => option.name === "Presa adicional" || option.name === "Huevo adicional");
  return group.options;
}

function getPerPlateGroups(product: CatalogProduct) {
  if (isPlainBroth(product)) return [];
  return product.modifierGroups.filter((group) => {
    const name = group.name.trim().toLocaleLowerCase();
    if (name === "extras" || name.includes("sabores")) return true;
    if ((isChickenBroth(product) || isAceVichadoBroth(product)) && name === "presa") return true;
    return isAceVichadoBroth(product) && name === "preferencias";
  });
}

function getRegularGroups(product: CatalogProduct) {
  if (isPlainBroth(product)) return [];
  return product.modifierGroups.filter((group) => !isPerPlateGroup(group) && !isChickenBroth(product) && !isAceVichadoBroth(product));
}

function groupDisplayName(group: CatalogModifierGroup) {
  const name = group.name.trim().toLocaleLowerCase();
  if (name.includes("sabores")) return "Sabores";
  if (name === "presa") return "Presa";
  if (name === "preferencias") return "Preferencias";
  return "Adicionales";
}

function groupPlaceholder(group: CatalogModifierGroup) {
  const name = group.name.trim().toLocaleLowerCase();
  if (name.includes("sabores")) return "Elegir sabores";
  if (name === "presa") return "Elegir presa";
  if (name === "preferencias") return "Elegir preferencias";
  return "Elegir adicionales";
}

export function OrderComposer({ catalog, table, initialOrderType, editingOrderId, initialCart, initialNotes = "", editReasonRequired = false }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [orderType] = useState(initialOrderType);
  const [categoryId, setCategoryId] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CatalogProduct | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [unitSelections, setUnitSelections] = useState<UnitSelections>({});
  const [editingLocalId, setEditingLocalId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [itemNotes, setItemNotes] = useState("");
  const [cart, setCart] = useState<OrderComposerItem[]>(initialCart ?? []);
  const [notes, setNotes] = useState(initialNotes);
  const [editReason, setEditReason] = useState("");
  const [error, setError] = useState("");
  const products = useMemo(() => catalog.products.filter((product) => (categoryId === "all" || product.categoryId === categoryId) && product.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())), [catalog.products, categoryId, search]);
  const total = cart.reduce((sum, item) => sum + (item.unitPrice + item.modifiersTotal) * item.quantity, 0);

  function openProduct(product: CatalogProduct) {
    setSelected(product);
    setEditingLocalId(null);
    setVariantId(product.variants[0]?.id ?? null);
    setSelectedOptions({});
    setUnitSelections({});
    setQuantity(1);
    setItemNotes("");
    setError("");
  }

  function editCartItem(item: OrderComposerItem) {
    const product = catalog.products.find((value) => value.id === item.productId);
    if (!product) return;
    const perPlateGroupIds = new Set(getPerPlateGroups(product).map((group) => group.id));
    const nextSelectedOptions: Record<string, string[]> = {};
    for (const modifier of item.modifierIds) if (!perPlateGroupIds.has(modifier.groupId)) nextSelectedOptions[modifier.groupId] = [...(nextSelectedOptions[modifier.groupId] ?? []), modifier.optionId];
    const plates = item.plateSelections.length ? item.plateSelections : Array.from({ length: item.quantity }, () => ({}));
    setSelected(product);
    setEditingLocalId(item.localId);
    setVariantId(item.variantId);
    setSelectedOptions(nextSelectedOptions);
    setUnitSelections(Object.fromEntries(plates.map((plate, index) => [index, plate])));
    setQuantity(item.quantity);
    setItemNotes(item.notes);
    setError("");
  }

  function toggleOption(group: CatalogModifierGroup, optionId: string) {
    setSelectedOptions((current) => {
      const values = current[group.id] ?? [];
      if (group.selectionMode === "single") return { ...current, [group.id]: [optionId] };
      return { ...current, [group.id]: values.includes(optionId) ? values.filter((value) => value !== optionId) : [...values, optionId] };
    });
  }

  function toggleUnitOption(plateIndex: number, group: CatalogModifierGroup, optionId: string) {
    setUnitSelections((current) => {
      const plate = current[plateIndex] ?? {};
      const values = plate[group.id] ?? [];
      const nextValues = group.selectionMode === "single" ? [optionId] : values.includes(optionId) ? values.filter((value) => value !== optionId) : [...values, optionId];
      return { ...current, [plateIndex]: { ...plate, [group.id]: nextValues } };
    });
  }

  function changeQuantity(nextQuantity: number) {
    const safeQuantity = Math.min(99, Math.max(1, nextQuantity || 1));
    setQuantity(safeQuantity);
    setUnitSelections((current) => Object.fromEntries(Object.entries(current).filter(([plateIndex]) => Number(plateIndex) < safeQuantity)));
  }

  function addSelected() {
    if (!selected) return;
    const variant = selected.variants.find((item) => item.id === variantId);
    const perPlateGroups = getPerPlateGroups(selected);
    const regularGroups = getRegularGroups(selected);

    for (const group of regularGroups) {
      const count = selectedOptions[group.id]?.length ?? 0;
      const min = group.isRequired ? Math.max(1, group.minSelections) : group.minSelections;
      if (count < min || (group.maxSelections !== null && count > group.maxSelections)) { setError(`Revisa las opciones de ${group.name}.`); return; }
    }

    for (let plateIndex = 0; plateIndex < quantity; plateIndex += 1) {
      for (const group of perPlateGroups) {
        const count = unitSelections[plateIndex]?.[group.id]?.length ?? 0;
        const isFlavorGroup = group.name.trim().toLocaleLowerCase().includes("sabores");
        const maxSelections = isFlavorGroup && variant?.maxFlavors ? variant.maxFlavors : group.maxSelections;
        const min = group.isRequired ? Math.max(1, group.minSelections) : group.minSelections;
        if (count < min || (maxSelections !== null && count > maxSelections)) { setError(`Revisa ${group.name.toLocaleLowerCase()} del plato ${plateIndex + 1}.`); return; }
      }
    }

    const modifierIds = regularGroups.flatMap((group) => (selectedOptions[group.id] ?? []).map((optionId) => ({ groupId: group.id, optionId, quantity: 1 })));
    const modifierLabels = regularGroups.flatMap((group) => (selectedOptions[group.id] ?? []).map((optionId) => group.options.find((option) => option.id === optionId)?.name ?? ""));
    const perPlateCounts = new Map<string, { groupId: string; optionId: string; quantity: number; label: string }>();
    for (let plateIndex = 0; plateIndex < quantity; plateIndex += 1) {
      for (const group of perPlateGroups) {
        for (const optionId of unitSelections[plateIndex]?.[group.id] ?? []) {
          const option = getProductGroupOptions(selected, group).find((item) => item.id === optionId);
          if (!option) continue;
          const key = `${group.id}:${option.id}`;
          const current = perPlateCounts.get(key);
          perPlateCounts.set(key, { groupId: group.id, optionId: option.id, quantity: (current?.quantity ?? 0) + 1, label: `${group.name}: ${option.name}` });
        }
      }
    }
    for (const item of perPlateCounts.values()) {
      modifierIds.push({ groupId: item.groupId, optionId: item.optionId, quantity: item.quantity });
      modifierLabels.push(`${item.label} (${item.quantity} ${item.quantity === 1 ? "plato" : "platos"})`);
    }

    const sharedModifiersTotal = modifierIds.reduce((sum, modifier) => {
      const group = selected.modifierGroups.find((item) => item.id === modifier.groupId);
      const optionPrice = Number(group ? getProductGroupOptions(selected, group).find((option) => option.id === modifier.optionId)?.additionalPrice ?? 0 : 0);
      return group && getPerPlateGroups(selected).some((item) => item.id === group.id) ? sum : sum + optionPrice * modifier.quantity;
    }, 0);
    const perPlateModifiersTotal = modifierIds.reduce((sum, modifier) => {
      const group = selected.modifierGroups.find((item) => item.id === modifier.groupId);
      const optionPrice = Number(group ? getProductGroupOptions(selected, group).find((option) => option.id === modifier.optionId)?.additionalPrice ?? 0 : 0);
      return group && getPerPlateGroups(selected).some((item) => item.id === group.id) ? sum + optionPrice * modifier.quantity : sum;
    }, 0);
    const modifiersTotal = sharedModifiersTotal + perPlateModifiersTotal / quantity;
    const nextItem: OrderComposerItem = { localId: editingLocalId ?? crypto.randomUUID(), productId: selected.id, variantId, productName: selected.name, variantName: variant?.name ?? null, quantity, unitPrice: variant?.salePrice ?? selected.salePrice, modifiersTotal, modifierLabels: modifierLabels.filter(Boolean), modifierIds, perPlateGroupIds: perPlateGroups.map((group) => group.id), plateSelections: Array.from({ length: quantity }, (_, index) => unitSelections[index] ?? {}), notes: itemNotes, priority: "normal", hasPerPlateOptions: perPlateGroups.length > 0 };
    setCart((current) => mergeCartItem(current.filter((item) => item.localId !== editingLocalId), nextItem));
    setEditingLocalId(null);
    setSelected(null);
    setError("");
  }

  function submitOrder() {
    setError("");
    if (!cart.length) { setError("Agrega al menos un producto."); return; }
    startTransition(async () => {
      const items = cart.map((item) => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity, notes: item.notes, priority: item.priority, modifiers: item.modifierIds }));
      const result = editingOrderId ? await updateOrder({ orderId: editingOrderId, notes, reason: editReason, items }) : await createOrder({ orderType, tableId: orderType === "dine_in" ? table?.id ?? null : null, peopleCount: orderType === "dine_in" ? 2 : null, customerName: "", notes, idempotencyKey: crypto.randomUUID(), items });
      if (!result.ok) { setError(result.error); return; }
      router.push(`/pedidos/${result.orderId}`);
    });
  }

  return <div className="mx-auto max-w-7xl space-y-5 pb-24">
    <div className="flex items-center gap-3"><Button asChild variant="ghost" size="icon"><Link href={editingOrderId ? `/pedidos/${editingOrderId}` : "/mesas"}><ArrowLeft className="size-5" /></Link></Button><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-olive">{editingOrderId ? "Editar pedido" : "Nuevo pedido"}</p><h1 className="font-display text-3xl font-bold">{table ? `Mesa ${table.tableNumber}` : editingOrderId ? "Pedido solicitado" : "Pedido para llevar"}</h1></div><Badge className="ml-auto">{formatCurrency(total)}</Badge></div>
    <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <div className="space-y-5"><Card><CardContent className="space-y-4 pt-5"><div className="relative"><Search className="absolute left-3 top-3.5 size-4 text-brand-olive" /><Input className="pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar en la carta..." /></div><div className="flex gap-2 overflow-x-auto pb-1"><Button type="button" size="sm" variant={categoryId === "all" ? "default" : "outline"} onClick={() => setCategoryId("all")}>Todo</Button>{catalog.categories.map((category) => <Button type="button" size="sm" variant={categoryId === category.id ? "default" : "outline"} key={category.id} onClick={() => setCategoryId(category.id)}>{category.name}</Button>)}</div><div className="grid gap-3 sm:grid-cols-2">{products.map((product) => <button type="button" key={product.id} onClick={() => openProduct(product)} className="rounded-2xl border border-brand-olive/10 p-4 text-left transition hover:border-brand-olive/40 hover:bg-brand-cream"><div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{product.name}</p><p className="mt-1 line-clamp-2 text-xs text-brand-olive">{product.description ?? ""}</p></div><Plus className="size-5 shrink-0 text-brand-olive" /></div><p className="mt-4 font-display text-lg font-bold">{product.variants.length ? `Desde ${formatCurrency(Math.min(...product.variants.map((variant) => variant.salePrice)))}` : formatCurrency(product.salePrice)}</p></button>)}</div>{products.length === 0 ? <p className="py-8 text-center text-sm text-brand-olive">No se encontraron productos.</p> : null}</CardContent></Card></div>
      <Card className="h-fit xl:sticky xl:top-24"><CardHeader><CardTitle className="flex items-center justify-between"><span className="flex items-center gap-2"><ShoppingBasket className="size-5" /> Resumen</span><Badge variant="muted">{cart.length} líneas</Badge></CardTitle></CardHeader><CardContent className="space-y-3">{cart.map((item) => <div key={item.localId} className="rounded-xl border border-brand-olive/10 p-3"><div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{item.quantity} × {item.productName}</p>{item.variantName ? <p className="text-xs text-brand-olive">{item.variantName}</p> : null}{item.modifierLabels.length ? <p className="text-xs text-brand-olive">{item.modifierLabels.join(" · ")}</p> : null}</div><div className="flex items-center gap-2"><button type="button" className="text-brand-olive" onClick={() => editCartItem(item)} aria-label="Editar producto"><Pencil className="size-4" /></button><button type="button" className="text-red-600" onClick={() => setCart((current) => current.filter((value) => value.localId !== item.localId))} aria-label="Quitar producto"><Trash2 className="size-4" /></button></div></div><div className="mt-2 flex items-center justify-between text-sm"><span>{formatCurrency((item.unitPrice + item.modifiersTotal) * item.quantity)}</span>{item.hasPerPlateOptions ? <span className="text-xs text-brand-olive">{item.quantity} platos configurados</span> : <div className="flex items-center gap-2"><button type="button" onClick={() => setCart((current) => current.map((value) => value.localId === item.localId ? { ...value, quantity: Math.max(1, value.quantity - 1) } : value))}><Minus className="size-4" /></button><span>{item.quantity}</span><button type="button" onClick={() => setCart((current) => current.map((value) => value.localId === item.localId ? { ...value, quantity: Math.min(99, value.quantity + 1) } : value))}><Plus className="size-4" /></button></div>}</div></div>)}{cart.length === 0 ? <div className="rounded-xl bg-brand-cream p-6 text-center text-sm text-brand-olive">Selecciona productos para comenzar.</div> : null}<textarea className="min-h-20 w-full rounded-xl border border-brand-olive/20 p-3 text-sm outline-none focus:border-brand-olive" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Observación general" />{editingOrderId && editReasonRequired ? <textarea className="min-h-20 w-full rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm outline-none focus:border-amber-500" value={editReason} onChange={(event) => setEditReason(event.target.value)} placeholder="Motivo de la edición (obligatorio)" /> : null}{error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}<Button type="button" className="w-full" size="lg" disabled={isPending || !cart.length || Boolean(editingOrderId && editReasonRequired && editReason.trim().length < 3)} onClick={submitOrder}>{isPending ? "Guardando..." : editingOrderId ? "Guardar cambios" : "Guardar pedido"}</Button></CardContent></Card>
    </div>
    {selected ? <div className="fixed inset-0 z-50 grid place-items-center bg-brand-forest/40 p-4"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between"><div><p className="font-display text-2xl font-bold">{selected.name}</p><p className="text-sm text-brand-olive">{editingLocalId ? "Edita la configuración de esta línea." : "Personaliza el producto"}</p></div><button type="button" onClick={() => { setSelected(null); setEditingLocalId(null); }} className="text-brand-olive">Cerrar</button></div><div className={`mt-5 grid gap-3 ${selected.variants.length ? "sm:grid-cols-[minmax(0,1fr)_140px]" : "sm:flex sm:justify-end"}`}>{selected.variants.length ? <label className="block text-sm font-semibold">Variante<select className="mt-2 min-h-12 w-full rounded-xl border border-brand-olive/20 bg-white px-3" value={variantId ?? ""} onChange={(event) => setVariantId(event.target.value)}>{selected.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name} · {formatCurrency(variant.salePrice)}</option>)}</select></label> : null}<label className={`block text-sm font-semibold ${selected.variants.length ? "" : "sm:w-36"}`}>Cantidad<input className="mt-2 min-h-12 w-full rounded-xl border border-brand-olive/20 px-3" type="number" min="1" max="99" value={quantity} onChange={(event) => changeQuantity(Number(event.target.value))} /></label></div>{getRegularGroups(selected).map((group) => <fieldset key={group.id} className="mt-5"><legend className="font-semibold">{group.name} {group.isRequired ? <span className="text-red-600">*</span> : null}</legend>{group.description ? <p className="mt-1 text-xs text-brand-olive">{group.description}</p> : null}<div className="mt-2 space-y-2">{group.options.map((option) => <label key={option.id} className="flex items-center justify-between rounded-xl border border-brand-olive/10 p-3 text-sm"><span className="flex items-center gap-2"><input type={group.selectionMode === "single" ? "radio" : "checkbox"} name={group.id} checked={(selectedOptions[group.id] ?? []).includes(option.id)} onChange={() => toggleOption(group, option.id)} />{option.name}</span>{option.additionalPrice > 0 ? <span>+ {formatCurrency(option.additionalPrice)}</span> : null}</label>)}</div></fieldset>)}{getPerPlateGroups(selected).length ? <fieldset className="mt-5"><legend className="font-semibold">Personalización por plato</legend><p className="mt-1 text-xs text-brand-olive">Cada fila representa un plato. Puedes elegir sabores, presa y preferencias de forma independiente.</p><div className="mt-3 space-y-3">{Array.from({ length: quantity }, (_, plateIndex) => <div key={plateIndex} className="rounded-xl border border-brand-olive/10 bg-brand-cream/40 p-3"><p className="text-sm font-semibold">Plato {plateIndex + 1}</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{getPerPlateGroups(selected).map((group) => { const variant = selected.variants.find((item) => item.id === variantId); const isFlavorGroup = group.name.trim().toLocaleLowerCase().includes("sabores"); const maxSelections = isFlavorGroup && variant?.maxFlavors ? variant.maxFlavors : group.maxSelections; return <div key={group.id} className="text-sm font-semibold">{groupDisplayName(group)}{group.isRequired ? <span className="text-red-600"> *</span> : null}<span className="mt-2 block"><MultiCheckboxSelect options={getProductGroupOptions(selected, group)} selectedIds={unitSelections[plateIndex]?.[group.id] ?? []} onChange={(optionId) => toggleUnitOption(plateIndex, group, optionId)} placeholder={groupPlaceholder(group)} maxSelections={maxSelections} /></span></div>; })}</div></div>)}</div></fieldset> : null}<label className="mt-5 block text-sm font-semibold">Nota<textarea className="mt-2 min-h-20 w-full rounded-xl border border-brand-olive/20 p-3 text-sm" value={itemNotes} onChange={(event) => setItemNotes(event.target.value)} placeholder="Observación para cocina (opcional)" /></label>{error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}<Button type="button" className="mt-5 w-full" onClick={addSelected}>{editingLocalId ? <Pencil className="size-4" /> : <Plus className="size-4" />} {editingLocalId ? "Guardar cambios" : "Agregar al pedido"}</Button></div></div> : null}
  </div>;
}
