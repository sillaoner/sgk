import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/login"];
const ADMIN_ROLES = new Set(["ohs", "manager"]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  const authState = request.cookies.get("auth_state")?.value;

  if (!isPublicRoute && authState !== "1") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/audit-logs")) {
    const role = request.cookies.get("user_role")?.value;
    if (!role || !ADMIN_ROLES.has(role)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  if (pathname === "/login" && authState === "1") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)"]
};
