import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  ChefHat,
  ClipboardList,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-brand-cream">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 md:px-10">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-brand-forest text-xl text-brand-gold">✦</span>
          <span>
            <span className="block font-display text-lg font-bold leading-none">Mamá Gallina</span>
            <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-olive">POS</span>
          </span>
        </Link>
        <Button variant="outline" asChild>
          <Link href="/login">Ingresar <ArrowRight className="size-4" /></Link>
        </Button>
      </header>

      <main className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-10 md:px-10 md:pt-20 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-gold/35 bg-white/65 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-brand-brown"><Sparkles className="size-4 text-brand-gold" /> Operación con sabor a casa</div>
          <h1 className="max-w-3xl font-display text-5xl font-bold leading-[1.03] tracking-tight text-brand-forest md:text-7xl">Todo el restaurante, <span className="text-brand-brown">en una sola mesa.</span></h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-brand-olive">Mamá Gallina POS conecta pedidos, cocina, pagos y caja para que el equipo atienda con rapidez y el negocio crezca con información confiable.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Button size="lg" asChild><Link href="/login">Entrar al sistema <ArrowRight className="size-5" /></Link></Button><Button variant="ghost" size="lg" asChild><a href="#modulos">Conocer los módulos</a></Button></div>
        </section>

        <section className="relative min-h-[410px] rounded-[2rem] bg-brand-forest p-6 text-white shadow-2xl shadow-brand-forest/15 md:p-8">
          <div className="absolute -right-8 -top-8 size-32 rounded-full bg-brand-gold/20 blur-2xl" />
          <div className="relative flex items-center justify-between border-b border-white/15 pb-5"><div><p className="text-sm text-brand-sage">Panel operativo</p><p className="mt-1 font-display text-2xl font-semibold">Turno del día</p></div><span className="rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-semibold text-emerald-200">● En línea</span></div>
          <div className="relative mt-6 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-brand-sage">Ventas de hoy</p><p className="mt-2 font-display text-2xl font-bold">Datos en vivo</p><p className="mt-1 text-xs text-white/60">Conectado a Supabase</p></div><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-brand-sage">Pedidos activos</p><p className="mt-2 font-display text-2xl font-bold">Sincronizados</p><p className="mt-1 text-xs text-white/60">Listos para operar</p></div></div>
          <div className="relative mt-4 space-y-3 rounded-2xl bg-white/10 p-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-brand-gold/20"><ChefHat className="size-4 text-brand-gold" /></span><div className="flex-1"><p className="text-sm font-semibold">Cocina en tiempo real</p><p className="text-xs text-white/60">Estados sincronizados por mesa</p></div><span className="text-xs text-emerald-200">Realtime</span></div><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-brand-gold/20"><ShieldCheck className="size-4 text-brand-gold" /></span><div className="flex-1"><p className="text-sm font-semibold">Roles y auditoría</p><p className="text-xs text-white/60">Cada acción crítica queda registrada</p></div><span className="text-xs text-emerald-200">Seguro</span></div></div>
        </section>
      </main>

      <section id="modulos" className="mx-auto grid max-w-7xl gap-4 px-5 pb-20 md:grid-cols-3 md:px-10"><Feature icon={ClipboardList} title="Pedidos sin fricción" text="Mesas, para llevar, modificadores y estados claros desde el celular." /><Feature icon={ChefHat} title="Cocina sincronizada" text="La brigada recibe cada pedido y actualiza su avance en tiempo real." /><Feature icon={Banknote} title="Caja bajo control" text="Efectivo, pagos digitales, evidencias y cierres trazables." /></section>
    </div>
  );
}

function Feature({ icon: Icon, title, text }: { icon: typeof ClipboardList; title: string; text: string }) {
  return <article className="rounded-2xl border border-brand-olive/10 bg-white/70 p-5"><span className="mb-4 grid size-10 place-items-center rounded-xl bg-brand-sage/20 text-brand-forest"><Icon className="size-5" /></span><h2 className="font-display text-xl font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-brand-olive">{text}</p></article>;
}
