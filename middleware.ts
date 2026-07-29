import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const isDev = process.env.NODE_ENV !== "production";

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(self), geolocation=()"
  );
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );

  // Allow Google Fonts + Gemini WS from pages; keep script/style locked down.
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "connect-src 'self' https://generativelanguage.googleapis.com wss://generativelanguage.googleapis.com https://fonts.googleapis.com https://fonts.gstatic.com",
    "worker-src 'self' blob:",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  // Block common scanner probes lightly via path heuristics.
  const path = request.nextUrl.pathname.toLowerCase();
  if (
    path.includes("wp-admin") ||
    path.includes(".env") ||
    path.includes("phpmyadmin") ||
    path.endsWith(".php")
  ) {
    return new NextResponse(null, { status: 404 });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
