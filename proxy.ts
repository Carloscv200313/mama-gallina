import { NextResponse, type NextRequest } from "next/server";
import { STAFF_SESSION_COOKIE } from "@/lib/auth/constants";

export async function proxy(request: NextRequest) {
  const hasStaffSession = Boolean(request.cookies.get(STAFF_SESSION_COOKIE)?.value);
  if (request.nextUrl.pathname.startsWith("/dashboard") && !hasStaffSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*"],
};
