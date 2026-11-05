import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createHash } from "crypto";

function expectedToken() {
  return createHash("sha256").update(process.env.APP_PASSWORD || "taskflow-change-me").digest("hex");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Public: login page + login API + token-protected report/bootstrap APIs + static assets
  if (
    pathname === "/login" ||
    pathname === "/api/login" ||
    pathname === "/api/report" ||
    pathname === "/api/bootstrap" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }
  const cookie = request.cookies.get("tf_auth")?.value;
  if (cookie === expectedToken()) return NextResponse.next();
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
