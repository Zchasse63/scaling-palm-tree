// Middleware — refreshes the Supabase session and gates protected routes.
//
// Public paths: /signin, /auth/callback, _next, brand assets.
// Everything else requires a valid Supabase session.
//
// Unauthenticated requests to a protected page redirect to /signin?next=<original>.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const config = {
  // Skip Next internals + brand assets at the matcher level (cheap).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand/).*)",
  ],
};

const PUBLIC_PATHS = new Set([
  "/signin",
  "/auth/callback",
]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.has(pathname);

  // Always run the Supabase SSR session refresh — it sets cookies on the response.
  const response = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data } = await supabase.auth.getUser();

  if (isPublic) {
    // If the user is already signed in and lands on /signin, send them to /catalogs.
    if (pathname === "/signin" && data.user) {
      return NextResponse.redirect(new URL("/catalogs", req.url));
    }
    return response;
  }

  if (!data.user) {
    const signinUrl = new URL("/signin", req.url);
    signinUrl.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(signinUrl);
  }

  return response;
}
