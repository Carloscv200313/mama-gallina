import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { rolesHavePermission, type Permission, type RoleKey } from "@/lib/auth/roles";
import { createSessionToken, hashSessionToken, verifyPin } from "@/lib/security/pin";
import { STAFF_SESSION_COOKIE } from "@/lib/auth/constants";

const SESSION_DURATION_SECONDS = 60 * 60 * 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 10 * 60 * 1000;

export type StaffRecord = {
  id: string;
  branch_id: string;
  full_name: string;
  role_key: RoleKey;
  status: "active" | "inactive";
  pin_hash?: string;
  failed_pin_attempts: number;
  locked_until: string | null;
};

export type StaffLoginOption = Pick<StaffRecord, "id" | "full_name" | "role_key">;

export type AuthContext = {
  staffId: string;
  profile: {
    fullName: string;
    branchId: string;
    status: "active";
  };
  roles: RoleKey[];
};

type StaffSessionRecord = {
  staff_member_id: string;
  expires_at: string;
  revoked_at: string | null;
  staff_member: StaffRecord | null;
};

export class StaffLoginError extends Error {}

function toAuthContext(staff: StaffRecord): AuthContext {
  return {
    staffId: staff.id,
    profile: {
      fullName: staff.full_name,
      branchId: staff.branch_id,
      status: "active",
    },
    roles: [staff.role_key],
  };
}

export async function getActiveStaffForLogin(): Promise<StaffLoginOption[]> {
  const { data, error } = await createAdminClient()
    .from("staff_members")
    .select("id, full_name, role_key")
    .eq("status", "active")
    .order("full_name");

  if (error) {
    throw new Error("No se pudo cargar el personal activo.");
  }

  return (data ?? []) as StaffLoginOption[];
}

export async function createStaffSession({
  staffId,
  pin,
  ipAddress,
  userAgent,
}: {
  staffId: string;
  pin: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const admin = createAdminClient();
  const { data: staff, error } = await admin
    .from("staff_members")
    .select("id, branch_id, full_name, role_key, status, pin_hash, failed_pin_attempts, locked_until")
    .eq("id", staffId)
    .maybeSingle();

  const staffRecord = staff as StaffRecord | null;
  if (error || !staffRecord || staffRecord.status !== "active") {
    throw new StaffLoginError("No se pudo validar el acceso.");
  }

  if (staffRecord.locked_until && new Date(staffRecord.locked_until).getTime() > Date.now()) {
    throw new StaffLoginError("Este acceso está bloqueado temporalmente.");
  }

  const validPin = await verifyPin(pin, staffRecord.pin_hash ?? "");
  if (!validPin) {
    const failedAttempts = staffRecord.failed_pin_attempts + 1;
    await admin
      .from("staff_members")
      .update({
        failed_pin_attempts: failedAttempts,
        locked_until: failedAttempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCK_DURATION_MS).toISOString() : null,
      })
      .eq("id", staffRecord.id);
    throw new StaffLoginError("PIN incorrecto.");
  }

  const rawToken = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);
  const { error: sessionError } = await admin.from("staff_sessions").insert({
    staff_member_id: staffRecord.id,
    token_hash: hashSessionToken(rawToken),
    expires_at: expiresAt.toISOString(),
    ip_address: ipAddress ?? null,
    user_agent: userAgent ?? null,
  });

  if (sessionError) {
    throw new StaffLoginError("No se pudo iniciar la sesión.");
  }

  await admin
    .from("staff_members")
    .update({ failed_pin_attempts: 0, locked_until: null, last_login_at: new Date().toISOString() })
    .eq("id", staffRecord.id);

  const cookieStore = await cookies();
  cookieStore.set(STAFF_SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });

  return toAuthContext(staffRecord);
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(STAFF_SESSION_COOKIE)?.value;
  if (!rawToken) return null;

  const { data, error } = await createAdminClient()
    .from("staff_sessions")
    .select("staff_member_id, expires_at, revoked_at, staff_member:staff_members(id, branch_id, full_name, role_key, status, failed_pin_attempts, locked_until)")
    .eq("token_hash", hashSessionToken(rawToken))
    .maybeSingle();

  const session = data as StaffSessionRecord | null;
  if (error || !session || session.revoked_at || new Date(session.expires_at).getTime() <= Date.now() || !session.staff_member || session.staff_member.status !== "active") {
    return null;
  }

  await createAdminClient()
    .from("staff_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("staff_member_id", session.staff_member_id)
    .eq("token_hash", hashSessionToken(rawToken));

  return toAuthContext(session.staff_member);
}

export async function revokeCurrentStaffSession() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(STAFF_SESSION_COOKIE)?.value;
  if (rawToken) {
    await createAdminClient()
      .from("staff_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token_hash", hashSessionToken(rawToken));
  }
  cookieStore.delete(STAFF_SESSION_COOKIE);
}

export async function requireAuth() {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  return context;
}

export async function requireRole(...allowedRoles: RoleKey[]) {
  const context = await requireAuth();
  if (!context.roles.some((role) => allowedRoles.includes(role))) {
    redirect("/dashboard?error=forbidden");
  }
  return context;
}

export async function requirePermission(permission: Permission) {
  const context = await requireAuth();
  if (!rolesHavePermission(context.roles, permission)) {
    redirect("/dashboard?error=forbidden");
  }
  return context;
}
