import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { BASE_PATH } from "@/lib/site";

/**
 * Optimistic gate only: it checks that a session cookie is present and bounces
 * anonymous traffic before a server component ever touches the database. The
 * real authorisation is the getCurrentUser() check in each page, because a
 * cookie that merely looks valid is not a session.
 */
export function proxy(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!hasSession) {
    // BASE_PATH has to be added by hand here. next/navigation's redirect()
    // adds it, and <Link> adds it, but NextResponse.redirect() on a hand-built
    // URL does not, and /login is not served by this app.
    const url = new URL(`${BASE_PATH}/login`, request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // /admin is deliberately absent: it authenticates with its own admin
  // cookie, and the page does the authoritative isAdmin() check anyway.
  // Gating it on the user session cookie locked every admin out.
  matcher: ["/dashboard/:path*"],
};
