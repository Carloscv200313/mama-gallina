import { CalendarDays, Receipt, WalletCards } from "lucide-react";
import { createExpense } from "@/app/actions/expenses";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ExpenseCreateForm } from "@/components/expenses/expense-create-form";

export default async function ExpensesPage() {
  const context = await requireRole("admin");
  const admin = createAdminClient();
  const [{ data: categories }, { data: expenses }] = await Promise.all([admin.from("expense_categories").select("id, name").eq("branch_id", context.profile.branchId).eq("status", "active").order("name"), admin.from("expenses").select("id, category_id, description, amount, payment_method, expense_date, note, status").eq("branch_id", context.profile.branchId).order("expense_date", { ascending: false }).order("created_at", { ascending: false }).limit(100)]);
  const categoryRows = (categories ?? []) as Array<{ id: string; name: string }>;
  const expenseRows = (expenses ?? []) as Array<{ id: string; category_id: string; description: string; amount: number; payment_method: string; expense_date: string; status: string }>;
  const categoryMap = new Map(categoryRows.map((category) => [category.id, category.name]));
  const total = expenseRows.filter((expense) => expense.status === "active").reduce((sum, expense) => sum + Number(expense.amount), 0);
  return <div className="mx-auto max-w-7xl space-y-6"><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-olive">Administración</p><h1 className="mt-2 font-display text-4xl font-bold">Gastos</h1><p className="mt-2 text-brand-olive">Registra salidas y conserva el impacto en caja y rentabilidad.</p></div><Badge variant="muted"><WalletCards className="mr-1 size-3.5" /> S/ {total.toFixed(2)} registrados</Badge></div><div className="grid gap-5 xl:grid-cols-[360px_1fr]"><Card className="h-fit"><CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="size-5" /> Registrar gasto</CardTitle></CardHeader><CardContent><ExpenseCreateForm categories={categoryRows} action={createExpense} /></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="size-5" /> Historial</CardTitle></CardHeader><CardContent className="space-y-3">{expenseRows.length === 0 ? <p className="py-10 text-center text-sm text-brand-olive">No hay gastos registrados.</p> : expenseRows.map((expense) => <div key={expense.id} className="flex items-center justify-between gap-3 rounded-xl border border-brand-olive/10 p-4"><div><p className="font-semibold">{expense.description}</p><p className="mt-1 text-xs text-brand-olive">{categoryMap.get(expense.category_id) ?? "Sin categoría"} · {expense.expense_date} · {expense.payment_method === "cash" ? "Efectivo" : expense.payment_method === "plin" ? "Plin" : "Transferencia"}</p></div><span className="font-display font-bold">S/ {Number(expense.amount).toFixed(2)}</span></div>)}</CardContent></Card></div></div>;
}
