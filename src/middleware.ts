import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as jose from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";
const secret = new TextEncoder().encode(JWT_SECRET);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;

  let isAuthenticated = false;
  if (token) {
    try {
      await jose.jwtVerify(token, secret);
      isAuthenticated = true;
    } catch (e) {
      isAuthenticated = false;
    }
  }

  // If trying to access dashboard pages without being authenticated
  if (pathname.startsWith("/dashboard")) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // If already authenticated and trying to access login/register
  if (pathname === "/login" || pathname === "/register" || pathname === "/") {
    if (isAuthenticated) {
      const dashboardUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register", "/"],
};
