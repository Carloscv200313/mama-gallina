"use client";

import { useActionState } from "react";
import type { CatalogActionState } from "@/app/actions/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProductCreateForm({ categories, action }: { categories: Array<{ id: string; name: string }>; action: (state: CatalogActionState, formData: FormData) => Promise<CatalogActionState> }) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction} className="space-y-3"><Input name="code" placeholder="Código interno" required /><Input name="name" placeholder="Nombre del producto" required /><select name="categoryId" className="min-h-12 w-full rounded-xl border border-brand-olive/20 bg-white px-3" required><option value="">Categoría</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><textarea name="description" className="min-h-20 w-full rounded-xl border border-brand-olive/20 p-3 text-sm" placeholder="Descripción" /><div className="grid grid-cols-2 gap-2"><Input name="salePrice" type="number" min="0" step="0.01" placeholder="Precio" required /><Input name="estimatedCost" type="number" min="0" step="0.01" placeholder="Costo estimado" required /></div><Input name="preparationMinutes" type="number" min="0" defaultValue="15" placeholder="Minutos" required /><label className="flex items-center gap-2 text-sm"><input name="allowsModifiers" type="checkbox" /> Permite modificadores</label><label className="flex items-center gap-2 text-sm"><input name="requiresKitchen" type="checkbox" defaultChecked /> Requiere cocina</label>{state.error ? <p className="text-sm text-red-700">{state.error}</p> : null}{state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}<Button className="w-full" disabled={pending}>{pending ? "Guardando..." : "Crear producto"}</Button></form>;
}

