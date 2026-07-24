import { Settings2, Store } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function ConfigurationPage() {
  const context = await requireRole("admin"); const admin = createAdminClient();
  const [{ data: rawBranch }, { data: rawSettings }] = await Promise.all([admin.from("branches").select("name, code, slug, timezone, currency, status").eq("id", context.profile.branchId).maybeSingle(), admin.from("settings").select("key, value").eq("branch_id", context.profile.branchId).order("key")]);
  const branch = rawBranch as { name: string; code: string; slug: string; timezone: string; currency: string; status: string } | null;
  const settings = (rawSettings ?? []) as Array<{ key: string; value: unknown }>;
  const branchFields: Array<[string, string | null | undefined]> = [["Nombre", branch?.name], ["Código", branch?.code], ["Zona horaria", branch?.timezone], ["Moneda", branch?.currency], ["Estado", branch?.status]];
  return <div className="mx-auto max-w-4xl space-y-6"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-olive">Administración</p><h1 className="mt-2 font-display text-4xl font-bold">Configuración</h1><p className="mt-2 text-brand-olive">Contexto del local y valores operativos.</p></div><Card><CardHeader><CardTitle className="flex items-center gap-2"><Store className="size-5" /> Local activo</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">{branchFields.map(([label, value]) => <div key={label} className="rounded-xl bg-brand-cream p-4"><p className="text-xs text-brand-olive">{label}</p><p className="mt-1 font-semibold">{value ?? "—"}</p></div>)}</CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><Settings2 className="size-5" /> Ajustes registrados</CardTitle></CardHeader><CardContent className="space-y-3">{settings.length === 0 ? <p className="text-sm text-brand-olive">No hay ajustes personalizados.</p> : settings.map((setting) => <div key={setting.key} className="flex items-center justify-between rounded-xl border border-brand-olive/10 p-4"><span className="text-sm font-semibold">{setting.key}</span><code className="max-w-[60%] truncate text-xs text-brand-olive">{JSON.stringify(setting.value)}</code></div>)}</CardContent></Card></div>;
}
