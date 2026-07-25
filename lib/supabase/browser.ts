"use client";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

let browserClient: ReturnType<typeof createClient<Database>> | undefined;

export function createBrowserClient() {
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) throw new Error("Faltan las variables públicas de Supabase.");
    browserClient = createClient<Database>(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return browserClient;
}
