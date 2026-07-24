import { UsersRound } from "lucide-react";
import { StaffManagement } from "@/components/staff/staff-management";
import { requireRole } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RoleKey } from "@/lib/auth/roles";

export default async function StaffPage() {
  const context = await requireRole("admin");
  const { data } = await createAdminClient().from("staff_members").select("id, full_name, role_key, status").eq("branch_id", context.profile.branchId).order("full_name");
  const staffMembers = (data ?? []) as Array<{ id: string; full_name: string; role_key: RoleKey; status: "active" | "inactive" }>;

  return <div className="mx-auto max-w-7xl space-y-8"><div><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-brand-forest text-brand-gold"><UsersRound className="size-5" /></span><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-olive">Control de acceso</p><h1 className="mt-1 font-display text-4xl font-bold tracking-tight">Personal</h1></div></div><p className="mt-3 max-w-2xl text-brand-olive">Administra quién puede entrar al POS y qué áreas puede utilizar. No necesitas crear correos ni contraseñas.</p></div><StaffManagement staffMembers={staffMembers} /></div>;
}

