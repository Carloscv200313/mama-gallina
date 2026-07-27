import { History, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/server";
import { formatLimaDateTime } from "@/lib/pos/date";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AuditPage() {
  const context = await requireRole("admin"); const admin = createAdminClient();
  const { data: logs } = await admin.from("audit_logs").select("id, action, entity, entity_id, reason, created_at, actor_id").eq("branch_id", context.profile.branchId).order("created_at", { ascending: false }).limit(200);
  const logRows = (logs ?? []) as Array<{ id: string; action: string; entity: string; entity_id: string | null; reason: string | null; created_at: string; actor_id: string | null }>;
  const actorIds = [...new Set(logRows.map((log) => log.actor_id).filter((id): id is string => Boolean(id)))];
  const { data: staff } = actorIds.length ? await admin.from("staff_members").select("id, full_name").in("id", actorIds) : { data: [] };
  const actorMap = new Map(((staff ?? []) as Array<{ id: string; full_name: string }>).map((person) => [person.id, person.full_name]));
  return <div className="mx-auto max-w-7xl space-y-6"><div className="flex items-end justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-olive">Control y trazabilidad</p><h1 className="mt-2 font-display text-4xl font-bold">Auditoría</h1><p className="mt-2 text-brand-olive">Las acciones críticas quedan registradas y no se eliminan desde la interfaz.</p></div><Badge variant="success"><ShieldCheck className="mr-1 size-3.5" /> Protegida</Badge></div><Card><CardHeader><CardTitle className="flex items-center gap-2"><History className="size-5" /> Actividad reciente</CardTitle></CardHeader><CardContent className="space-y-3">{logRows.length === 0 ? <p className="py-10 text-center text-sm text-brand-olive">Todavía no hay eventos.</p> : logRows.map((log) => <div key={log.id} className="flex flex-col gap-2 rounded-xl border border-brand-olive/10 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><Badge variant="muted">{log.action}</Badge><span className="text-sm font-semibold">{log.entity}</span></div><p className="mt-1 text-xs text-brand-olive">{actorMap.get(log.actor_id ?? "") ?? "Sistema"}{log.reason ? ` · ${log.reason}` : ""}</p></div><time className="text-xs text-brand-olive">{formatLimaDateTime(log.created_at)}</time></div>)}</CardContent></Card></div>;
}
