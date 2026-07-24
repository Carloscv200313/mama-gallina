"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

const expenseSchema = z.object({ categoryId: z.uuid(), description: z.string().trim().min(2).max(200), amount: z.coerce.number().finite().positive().max(999999.99), paymentMethod: z.enum(["cash", "plin", "bank_transfer"]), expenseDate: z.string().date(), note: z.string().trim().max(500) });
export type ExpenseActionState = { error?: string; success?: string };

export async function createExpense(_state: ExpenseActionState, formData: FormData): Promise<ExpenseActionState> {
  const context = await requireRole("admin");
  const parsed = expenseSchema.safeParse({ categoryId: formData.get("categoryId"), description: formData.get("description"), amount: formData.get("amount"), paymentMethod: formData.get("paymentMethod"), expenseDate: formData.get("expenseDate"), note: formData.get("note") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa el gasto." };
  const admin = createAdminClient();
  let cashSessionId: string | null = null;
  if (parsed.data.paymentMethod === "cash") {
    const { data: session } = await admin.from("cash_sessions").select("id").eq("branch_id", context.profile.branchId).eq("status", "open").limit(1);
    if (!session?.[0]) return { error: "Abre la caja para registrar un gasto en efectivo." };
    cashSessionId = String(session[0].id);
  }
  const { data: expense, error } = await admin.from("expenses").insert({ branch_id: context.profile.branchId, cash_session_id: cashSessionId, category_id: parsed.data.categoryId, description: parsed.data.description, amount: parsed.data.amount, payment_method: parsed.data.paymentMethod, expense_date: parsed.data.expenseDate, responsible_id: context.staffId, note: parsed.data.note || null, status: "active", created_by: context.staffId, updated_by: context.staffId }).select("id").single();
  if (error || !expense) return { error: "No se pudo registrar el gasto." };
  if (cashSessionId) await admin.from("cash_movements").insert({ branch_id: context.profile.branchId, cash_session_id: cashSessionId, expense_id: expense.id, type: "expense", amount: parsed.data.amount, note: parsed.data.description, created_by: context.staffId });
  await admin.from("audit_logs").insert({ branch_id: context.profile.branchId, actor_id: context.staffId, action: "expense.created", entity: "expenses", entity_id: expense.id, after_data: { amount: parsed.data.amount, payment_method: parsed.data.paymentMethod } });
  revalidatePath("/gastos"); revalidatePath("/caja"); revalidatePath("/reportes"); revalidatePath("/dashboard");
  return { success: "Gasto registrado correctamente." };
}

