import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { StaffLoginForm } from "@/components/auth/staff-login-form";
import { getActiveStaffForLogin, type StaffLoginOption } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  let staffMembers: StaffLoginOption[] = [];
  let configurationNotice = params.reason === "configuration";

  try {
    staffMembers = await getActiveStaffForLogin();
  } catch {
    configurationNotice = true;
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
      <section className="hidden bg-brand-forest p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-white/10 text-xl text-brand-gold">✦</span><span><span className="block font-display text-lg font-bold">Mamá Gallina</span><span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-sage">POS</span></span></Link>
        <div className="max-w-md"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-sage">Acceso del equipo</p><h1 className="mt-5 font-display text-5xl font-bold leading-tight">Cada persona ve lo que necesita para hacer bien su turno.</h1><p className="mt-6 leading-7 text-white/65">Selecciona tu nombre, ingresa tu PIN y continúa con las tareas de tu rol.</p></div>
        <div className="flex items-center gap-2 text-sm text-white/60"><ShieldCheck className="size-4 text-brand-gold" /> Sesiones internas protegidas</div>
      </section>
      <section className="flex items-center justify-center px-5 py-10 md:px-10"><div className="w-full max-w-md"><Link href="/" className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-brand-olive hover:text-brand-forest"><ArrowLeft className="size-4" /> Volver al inicio</Link><div className="mb-8 lg:hidden"><span className="grid size-11 place-items-center rounded-2xl bg-brand-forest text-xl text-brand-gold">✦</span></div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-olive">Mamá Gallina POS</p><h1 className="mt-3 font-display text-4xl font-bold text-brand-forest">Bienvenido, equipo</h1><p className="mt-3 text-brand-olive">Elige tu perfil para entrar a tu espacio de trabajo.</p><div className="mt-8"><StaffLoginForm staffMembers={staffMembers} configurationNotice={configurationNotice} /></div></div></section>
    </main>
  );
}
