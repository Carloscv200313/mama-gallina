import { AppShell } from "@/components/layout/app-shell";
import { requireAuth } from "@/lib/auth/server";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const context = await requireAuth();
  return <AppShell context={context}>{children}</AppShell>;
}

