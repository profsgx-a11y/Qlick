import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "@/i18n/config";
import { userHome } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams, origin, pathname } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  const localeSegment = pathname.split("/").filter(Boolean)[0];
  const locale = hasLocale(localeSegment) ? localeSegment : "el";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Honor a deep-link next (e.g. returning to a booking flow); otherwise
      // route to the right home based on the account type.
      let destination = next && next.startsWith("/") ? next : null;
      if (!destination && data.user) {
        destination = await userHome(supabase, locale, data.user.id);
      }
      return NextResponse.redirect(`${origin}${destination ?? `/${locale}/account`}`);
    }
  }

  // On error, send back to login with a flag
  return NextResponse.redirect(`${origin}/${locale}/login?error=oauth`);
}
