"use client";

import { useActionState } from "react";
import type { ExpenseActionState } from "@/app/actions/expenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ExpenseCreateForm({ categories, action, defaultExpenseDate }: { categories: Array<{ id: string; name: string }>; action: (state: ExpenseActionState, formData: FormData) => Promise<ExpenseActionState>; defaultExpenseDate: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction} className="space-y-3"><select name="categoryId" className="min-h-12 w-full rounded-xl border border-brand-olive/20 bg-white px-3" required><option value="">Categoría</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><Input name="description" placeholder="Descripción" required /><Input name="amount" type="number" min="0.01" step="0.01" placeholder="Importe" required /><select name="paymentMethod" className="min-h-12 w-full rounded-xl border border-brand-olive/20 bg-white px-3" required><option value="cash">Efectivo</option><option value="plin">Plin</option><option value="bank_transfer">Transferencia</option></select><Input name="expenseDate" type="date" defaultValue={defaultExpenseDate} required /><textarea name="note" className="min-h-20 w-full rounded-xl border border-brand-olive/20 p-3 text-sm" placeholder="Observación" />{state.error ? <p className="text-sm text-red-700">{state.error}</p> : null}{state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}<Button className="w-full" disabled={pending}>{pending ? "Guardando..." : "Registrar gasto"}</Button></form>;
}
