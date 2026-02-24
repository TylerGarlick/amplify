import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const path = nextUrl.pathname;

  const isAuthenticated = !!session;
  const role = (session?.user as { role?: string } | undefined)?.role ?? null;

  // Protected routes that require authentication
  const requiresAuth =
    path.startsWith("/ar") ||
    path.startsWith("/explore") ||
    path.startsWith("/profile") ||
    path.startsWith("/musician") ||
    path.startsWith("/admin");

  if (!isAuthenticated && requiresAuth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Admin-only routes
  if (path.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/ar", req.url));
  }

  // Musician portal — MUSICIAN or ADMIN
  if (
    path.startsWith("/musician") &&
    role !== "MUSICIAN" &&
    role !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/ar", req.url));
  }

  // Redirect root to AR view for authenticated users, login otherwise
  if (path === "/") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/ar", req.url));
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|uploads).*)"],
};
