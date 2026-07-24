"use client";

import { useActionState } from "react";
import { KeyRound, LoaderCircle, Plus, Power, UserPlus } from "lucide-react";
import { createStaff, resetStaffPin, toggleStaff, type StaffFormState } from "@/app/actions/staff";
import { ROLE_LABELS, type RoleKey } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type StaffListItem = { id: string; full_name: string; role_key: RoleKey; status: "active" | "inactive" };

const initialState: StaffFormState = {};

export function StaffManagement({ staffMembers }: { staffMembers: StaffListItem[] }) {
  const [createState, createAction, creating] = useActionState(createStaff, initialState);

  return <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="size-5 text-brand-gold" />Agregar personal</CardTitle><p className="text-sm text-brand-olive">No requiere correo. Asigna un nombre, rol y PIN.</p></CardHeader><CardContent><form action={createAction} className="space-y-4"><div className="space-y-2"><label htmlFor="fullName" className="text-sm font-semibold">Nombre visible</label><Input id="fullName" name="fullName" placeholder="Ej. María López" required /></div><div className="space-y-2"><label htmlFor="roleKey" className="text-sm font-semibold">Rol</label><select id="roleKey" name="roleKey" defaultValue="waiter" className="min-h-12 w-full rounded-xl border border-brand-olive/20 bg-white px-4 py-3 text-sm outline-none focus:border-brand-olive"><option value="admin">Administrador</option><option value="waiter">Mesero</option><option value="kitchen">Cocinero</option><option value="cashier">Cajero</option></select></div><div className="space-y-2"><label htmlFor="pin" className="text-sm font-semibold">PIN de acceso</label><Input id="pin" name="pin" type="password" inputMode="numeric" pattern="[0-9]*" minLength={4} maxLength={6} placeholder="4 a 6 dígitos" required /><p className="text-xs text-brand-olive">Se guarda cifrado y nunca se muestra después.</p></div>{createState.error ? <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{createState.error}</p> : null}{createState.success ? <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{createState.success}</p> : null}<Button type="submit" className="w-full" disabled={creating}>{creating ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}{creating ? "Guardando…" : "Agregar personal"}</Button></form></CardContent></Card>
    <Card><CardHeader><CardTitle>Personal del local</CardTitle><p className="text-sm text-brand-olive">Activa, desactiva o cambia el PIN de cada persona.</p></CardHeader><CardContent className="space-y-3">{staffMembers.length === 0 ? <div className="rounded-xl border border-dashed border-brand-olive/25 p-5 text-sm text-brand-olive">Todavía no hay personal registrado.</div> : staffMembers.map((staff) => <StaffRow key={staff.id} staff={staff} />)}</CardContent></Card>
  </div>;
}

function StaffRow({ staff }: { staff: StaffListItem }) {
  const [resetState, resetAction, resetting] = useActionState(resetStaffPin, initialState);
  return <div className="rounded-2xl border border-brand-olive/10 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{staff.full_name}</p><div className="mt-1 flex items-center gap-2"><Badge variant={staff.status === "active" ? "success" : "muted"}>{staff.status === "active" ? "Activo" : "Inactivo"}</Badge><span className="text-xs text-brand-olive">{ROLE_LABELS[staff.role_key]}</span></div></div>{staff.status === "active" ? <form action={toggleStaff}><input type="hidden" name="staffId" value={staff.id} /><Button variant="outline" size="sm" type="submit"><Power className="size-3.5" />Desactivar</Button></form> : <form action={toggleStaff}><input type="hidden" name="staffId" value={staff.id} /><Button variant="secondary" size="sm" type="submit"><Power className="size-3.5" />Activar</Button></form>}</div><form action={resetAction} className="mt-4 flex flex-col gap-2 border-t border-brand-olive/10 pt-3 sm:flex-row"><input type="hidden" name="staffId" value={staff.id} /><Input name="pin" type="password" inputMode="numeric" pattern="[0-9]*" minLength={4} maxLength={6} placeholder="Nuevo PIN" required className="sm:max-w-44" /><Button variant="ghost" size="sm" type="submit" disabled={resetting}>{resetting ? <LoaderCircle className="size-3.5 animate-spin" /> : <KeyRound className="size-3.5" />}Cambiar PIN</Button></form>{resetState.error ? <p className="mt-2 text-xs text-alert">{resetState.error}</p> : null}{resetState.success ? <p className="mt-2 text-xs text-emerald-700">{resetState.success}</p> : null}</div>;
}
