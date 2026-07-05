import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "@/i18n/config";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const url = new URL(request.url);
  const localeSegment = url.pathname.split("/").filter(Boolean)[0];
  const locale = hasLocale(localeSegment) ? localeSegment : "el";

  return NextResponse.redirect(new URL(`/${locale}`, request.url), {
    status: 303,
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
