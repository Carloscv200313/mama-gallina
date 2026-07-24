import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createStaffSession, StaffLoginError } from "@/lib/auth/server";

const loginSchema = z.object({
  staffId: z.uuid(),
  pin: z.string().regex(/^\d{4,6}$/),
});

export async function POST(request: Request) {
  const body = loginSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Selecciona un trabajador e ingresa un PIN válido." }, { status: 400 });
  }

  const requestHeaders = await headers();
  try {
    await createStaffSession({
      staffId: body.data.staffId,
      pin: body.data.pin,
      ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? requestHeaders.get("x-real-ip"),
      userAgent: requestHeaders.get("user-agent"),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof StaffLoginError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "No se pudo iniciar el acceso." }, { status: 500 });
  }
}

