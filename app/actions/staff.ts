"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashPin } from "@/lib/security/pin";

const staffSchema = z.object({
  fullName: z.string().trim().min(2, "Ingresa el nombre del trabajador.").max(120),
  roleKey: z.enum(["admin", "waiter", "kitchen", "cashier"]),
  pin: z.string().regex(/^\d{4,6}$/, "El PIN debe tener entre 4 y 6 dígitos."),
});

export type StaffFormState = {
  error?: string;
  success?: string;
};

export async function createStaff(_state: StaffFormState, formData: FormData): Promise<StaffFormState> {
  const context = await requireRole("admin");
  const parsed = staffSchema.safeParse({
    fullName: formData.get("fullName"),
    roleKey: formData.get("roleKey"),
    pin: formData.get("pin"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };

  const { error } = await createAdminClient().from("staff_members").insert({
    branch_id: context.profile.branchId,
    full_name: parsed.data.fullName,
    role_key: parsed.data.roleKey,
    pin_hash: await hashPin(parsed.data.pin),
    status: "active",
    created_by: context.staffId,
    updated_by: context.staffId,
  });

  if (error) {
    return { error: error.code === "23505" ? "Ya existe una persona con ese nombre en este local." : "No se pudo crear el personal." };
  }

  revalidatePath("/usuarios");
  revalidatePath("/login");
  return { success: "Personal creado correctamente." };
}

export async function toggleStaff(formData: FormData) {
  const context = await requireRole("admin");
  const staffId = z.uuid().safeParse(formData.get("staffId"));
  if (!staffId.success || staffId.data === context.staffId) return;

  const admin = createAdminClient();
  const { data: staff } = await admin.from("staff_members").select("id, status, branch_id").eq("id", staffId.data).eq("branch_id", context.profile.branchId).maybeSingle();
  if (!staff) return;

  await admin.from("staff_members").update({ status: staff.status === "active" ? "inactive" : "active", updated_by: context.staffId }).eq("id", staff.id);
  revalidatePath("/usuarios");
  revalidatePath("/login");
}

export async function resetStaffPin(_state: StaffFormState, formData: FormData): Promise<StaffFormState> {
  const context = await requireRole("admin");
  const staffId = z.uuid().safeParse(formData.get("staffId"));
  const pin = z.string().regex(/^\d{4,6}$/, "El PIN debe tener entre 4 y 6 dígitos.").safeParse(formData.get("pin"));
  if (!staffId.success || !pin.success) return { error: "Ingresa un PIN válido." };

  const { data: staff } = await createAdminClient().from("staff_members").select("id").eq("id", staffId.data).eq("branch_id", context.profile.branchId).maybeSingle();
  if (!staff) return { error: "Personal no encontrado." };

  await createAdminClient().from("staff_members").update({ pin_hash: await hashPin(pin.data), failed_pin_attempts: 0, locked_until: null, updated_by: context.staffId }).eq("id", staff.id);
  revalidatePath("/usuarios");
  return { success: "PIN actualizado." };
}

