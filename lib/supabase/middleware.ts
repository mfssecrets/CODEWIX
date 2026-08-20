import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Static / asset / API routes — always pass through
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/share") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/og-image") ||
    pathname === "/_not-found"
  ) {
    return supabaseResponse;
  }

  // Auth routes — redirect authenticated users to their UUID homepage
  const authRoutes = [
    "/signin",
    "/signup",
    "/otpverification",
    "/forgotpassword",
    "/newpassword",
  ];
  const isAuthRoute = authRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "?")
  );

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = `/${user.id}`;
    return NextResponse.redirect(url);
  }

  // UUID route protection — redirect unauthenticated users to sign in
  // A UUID route is any path starting with a UUID segment that is not a known public route
  const publicRootRoutes = ["/", "/eval-harness"];
  const segments = pathname.split("/").filter(Boolean);

  // Protected routes: /<uuid>, /<uuid>/my-apps, /<uuid>/build/<projectId>, /chats/<id>
  const isProtectedPath =
    (segments.length >= 1 &&
      !publicRootRoutes.includes(pathname) &&
      !pathname.startsWith("/chats") &&
      !pathname.startsWith("/signin") &&
      !pathname.startsWith("/signup") &&
      !pathname.startsWith("/otpverification") &&
      !pathname.startsWith("/forgotpassword") &&
      !pathname.startsWith("/newpassword")) ||
    pathname.startsWith("/chats");

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
