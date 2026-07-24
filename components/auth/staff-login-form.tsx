"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LoaderCircle, LogIn, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { StaffLoginOption } from "@/lib/auth/server";

export function StaffLoginForm({
  staffMembers,
  configurationNotice,
}: {
  staffMembers: StaffLoginOption[];
  configurationNotice: boolean;
}) {
  const router = useRouter();
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: selectedStaffId, pin }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "No se pudo iniciar el acceso.");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {configurationNotice ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Configura Supabase y aplica las migraciones antes de iniciar sesión.</div> : null}
      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between"><p className="text-sm font-semibold text-brand-forest">¿Quién está ingresando?</p><UserRound className="size-4 text-brand-olive" /></div>
        {staffMembers.length > 0 ? <div className="grid gap-3 sm:grid-cols-2">{staffMembers.map((staff) => <button key={staff.id} type="button" onClick={() => setSelectedStaffId(staff.id)} className={`flex min-h-16 items-center gap-3 rounded-2xl border p-3 text-left transition ${selectedStaffId === staff.id ? "border-brand-forest bg-brand-forest text-white shadow-sm" : "border-brand-olive/15 bg-white hover:border-brand-olive/40"}`}><span className={`grid size-10 place-items-center rounded-xl ${selectedStaffId === staff.id ? "bg-white/15" : "bg-brand-sage/20 text-brand-forest"}`}><UserRound className="size-5" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{staff.full_name}</span><span className={`mt-1 block text-xs ${selectedStaffId === staff.id ? "text-white/65" : "text-brand-olive"}`}>{ROLE_LABELS[staff.role_key]}</span></span></button>)}</div> : <div className="rounded-xl border border-dashed border-brand-olive/30 bg-brand-cream p-4 text-sm text-brand-olive">Todavía no hay personal activo. Ejecuta el bootstrap del administrador y vuelve a cargar esta pantalla.</div>}
      </div>

      <div className="space-y-2"><label htmlFor="staff-pin" className="text-sm font-semibold text-brand-forest">PIN de acceso</label><div className="relative"><KeyRound className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-brand-olive" /><Input id="staff-pin" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6} minLength={4} placeholder="••••••" className="pl-11 text-lg tracking-[0.35em]" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))} disabled={!selectedStaffId} required /></div><p className="text-xs text-brand-olive">Usa el PIN de 4 a 6 dígitos asignado por administración.</p></div>
      <Button className="w-full" size="lg" type="submit" disabled={pending || !selectedStaffId || staffMembers.length === 0}>{pending ? <LoaderCircle className="size-5 animate-spin" /> : <LogIn className="size-5" />}{pending ? "Validando…" : "Ingresar"}</Button>
      <div className="flex items-center justify-center gap-2 text-xs text-brand-olive"><Badge variant="muted">Acceso interno</Badge><span>La sesión se cierra automáticamente después de 12 horas.</span></div>
    </form>
  );
}

