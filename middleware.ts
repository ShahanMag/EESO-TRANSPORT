import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parse } from "cookie";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = ["/login"];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // Check for session cookie
  const cookies = parse(request.headers.get("cookie") || "");
  const sessionCookie = cookies.session;

  let isAuthenticated = false;
  if (sessionCookie) {
    try {
      JSON.parse(sessionCookie);
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  // Redirect to login if accessing protected route without authentication
  if (!isPublicPath && !isAuthenticated) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }

  // Redirect to dashboard if accessing login while authenticated
  if (isPublicPath && isAuthenticated) {
    const url = new URL("/", request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (except /api/auth/me which needs protection)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|images).*)",
  ],
};
