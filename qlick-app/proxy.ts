import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { locales, defaultLocale, hasLocale } from "./i18n/config";

function detectLocale(request: NextRequest): string {
  const cookie = request.cookies.get("NEXT_LOCALE")?.value;
  if (cookie && hasLocale(cookie)) return cookie;

  const accept = request.headers.get("accept-language") ?? "";
  const preferred = accept
    .split(",")
    .map((part) => part.split(";")[0].trim().toLowerCase())
    .map((tag) => tag.split("-")[0]);

  for (const tag of preferred) {
    if (hasLocale(tag)) return tag;
  }
  return defaultLocale;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Locale routing ────────────────────────────────────────
  const pathnameHasLocale = locales.some(
    (loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`),
  );

  if (!pathnameHasLocale) {
    const locale = detectLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  // ── 2. Supabase session refresh ──────────────────────────────
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the session — required for Server Components to see auth state
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|_next/data|favicon.ico|robots.txt|sitemap.xml|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};
