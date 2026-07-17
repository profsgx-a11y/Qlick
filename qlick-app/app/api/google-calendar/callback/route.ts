import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptToken } from "@/lib/google/crypto";
import {
  exchangeCode,
  gcalConfigured,
  GoogleApiError,
  REQUIRED_SCOPES,
  siteUrl,
} from "@/lib/google/calendar";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "gcal_oauth";

function localeFrom(request: NextRequest): string {
  return request.cookies.get("NEXT_LOCALE")?.value === "en" ? "en" : "el";
}

/**
 * Google redirects here after consent. Validates state, re-checks the
 * session + membership, exchanges the code and stores encrypted tokens.
 * Always lands back on the settings page with a `gcal=` status flag.
 */
export async function GET(request: NextRequest) {
  const locale = localeFrom(request);
  const done = (flag: string) => {
    const res = NextResponse.redirect(
      new URL(`/${locale}/dashboard/settings?gcal=${flag}#google-calendar`, siteUrl()),
    );
    res.cookies.set(STATE_COOKIE, "", { maxAge: 0, path: "/api/google-calendar" });
    return res;
  };

  if (!gcalConfigured()) return done("not_configured");

  const sp = request.nextUrl.searchParams;
  if (sp.get("error")) {
    // User pressed "Cancel" on the consent screen (or Google errored out).
    return done(sp.get("error") === "access_denied" ? "err_denied" : "err_exchange");
  }
  const code = sp.get("code");
  const state = sp.get("state");
  if (!code || !state) return done("err_state");

  // CSRF check: state must match the nonce we set when starting the flow.
  let businessId: string | null = null;
  try {
    const cookie = request.cookies.get(STATE_COOKIE)?.value;
    const parsed = cookie ? (JSON.parse(cookie) as { n?: string; b?: string }) : null;
    if (!parsed?.n || parsed.n !== state || !parsed.b) return done("err_state");
    businessId = parsed.b;
  } catch {
    return done("err_state");
  }

  // The signed-in user must (still) manage this business.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return done("err_permission");
  const { data: biz } = await supabase
    .from("my_businesses")
    .select("id, my_role")
    .eq("id", businessId)
    .maybeSingle();
  if (!biz?.id || (biz.my_role !== "owner" && biz.my_role !== "manager")) {
    return done("err_permission");
  }

  let tokens;
  try {
    tokens = await exchangeCode(code);
  } catch (e) {
    console.error(
      "[gcal] code exchange failed",
      e instanceof GoogleApiError ? `${e.status} ${e.message}` : e,
    );
    return done("err_exchange");
  }

  // Granular consent lets users untick individual permissions — without
  // both scopes the feature can't work, so ask them to retry.
  const granted = new Set(tokens.scope.split(" "));
  if (!REQUIRED_SCOPES.every((s) => granted.has(s))) return done("err_scope");
  if (!tokens.email) return done("err_email");

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("calendar_connections")
    .select("id")
    .eq("business_id", businessId)
    .eq("google_email", tokens.email)
    .maybeSingle();

  const tokenFields = {
    access_token_enc: encryptToken(tokens.accessToken),
    access_token_expires_at: tokens.accessTokenExpiresAt,
    scopes: tokens.scope,
    sync_error: null,
    connected_by: user.id,
  };

  if (existing) {
    // Re-connect: refresh tokens, keep the owner's staff/calendar setup.
    const { error } = await admin
      .from("calendar_connections")
      .update({
        ...tokenFields,
        ...(tokens.refreshToken
          ? { refresh_token_enc: encryptToken(tokens.refreshToken) }
          : {}),
      })
      .eq("id", existing.id);
    if (error) {
      console.error("[gcal] connection update failed", error.message);
      return done("err_save");
    }
    return done("connected");
  }

  if (!tokens.refreshToken) return done("err_norefresh");

  const { error } = await admin.from("calendar_connections").insert({
    business_id: businessId,
    google_email: tokens.email,
    refresh_token_enc: encryptToken(tokens.refreshToken),
    ...tokenFields,
  });
  if (error) {
    console.error("[gcal] connection insert failed", error.message);
    return done("err_save");
  }
  return done("connected");
}
