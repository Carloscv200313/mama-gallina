"use server";

import { redirect } from "next/navigation";
import { revokeCurrentStaffSession } from "@/lib/auth/server";

export async function signOut() {
  await revokeCurrentStaffSession();
  redirect("/login");
}
