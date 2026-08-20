import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - preview-vendor (baseui vendor files)
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon\.ico|preview-vendor|Aeonik|fullLogo|og-image|robots\.txt).*)",
  ],
};
