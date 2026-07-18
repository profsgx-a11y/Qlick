/**
 * Thin Google Calendar REST client (no googleapis dependency — plain fetch).
 * Auth: OAuth2 code flow with offline access; tokens live encrypted in
 * calendar_connections and never reach the browser.
 */

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const API = "https://www.googleapis.com/calendar/v3";

export const GOOGLE_CALENDAR_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
] as const;

/** Scopes the feature cannot work without (checked after consent). */
export const REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
] as const;

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
}

export function gcalRedirectUri(): string {
  return `${siteUrl()}/api/google-calendar/callback`;
}

/** All server env needed for the Google Calendar feature is present. */
export function gcalConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GCAL_TOKEN_KEY &&
      process.env.SUPABASE_SECRET_KEY,
  );
}

export function googleAuthUrl(state: string): string {
  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", gcalRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_CALENDAR_SCOPES.join(" "));
  // offline + consent → Google always returns a refresh token
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  return url.toString();
}

export class GoogleApiError extends Error {
  status: number;
  /** "invalid_grant" means the user revoked access → reconnect needed. */
  code: string;
  constructor(message: string, status: number, code = "api_error") {
    super(message);
    this.name = "GoogleApiError";
    this.status = status;
    this.code = code;
  }
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

function expiryIso(expiresInSeconds: number): string {
  // 60s safety margin so we never hand out an about-to-expire token
  return new Date(Date.now() + (expiresInSeconds - 60) * 1000).toISOString();
}

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      ...params,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || !data.access_token) {
    throw new GoogleApiError(
      data.error_description || data.error || `token request failed (${res.status})`,
      res.status,
      data.error === "invalid_grant" ? "invalid_grant" : "api_error",
    );
  }
  return data;
}

/** Email claim from an id_token (JWT) — no verification needed: the token
 *  came straight from Google's token endpoint over TLS. */
function emailFromIdToken(idToken: string | undefined): string | null {
  if (!idToken) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(idToken.split(".")[1], "base64url").toString("utf8"),
    ) as { email?: string };
    return payload.email?.toLowerCase() || null;
  } catch {
    return null;
  }
}

export interface ExchangedTokens {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string | null;
  scope: string;
  email: string | null;
}

export async function exchangeCode(code: string): Promise<ExchangedTokens> {
  const data = await tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: gcalRedirectUri(),
  });
  return {
    accessToken: data.access_token,
    accessTokenExpiresAt: expiryIso(data.expires_in),
    refreshToken: data.refresh_token ?? null,
    scope: data.scope ?? "",
    email: emailFromIdToken(data.id_token),
  };
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; accessTokenExpiresAt: string }> {
  const data = await tokenRequest({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  return {
    accessToken: data.access_token,
    accessTokenExpiresAt: expiryIso(data.expires_in),
  };
}

/** Best effort — revoking an already-revoked token is fine. */
export async function revokeToken(token: string): Promise<void> {
  try {
    await fetch(REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
    });
  } catch {
    // ignore
  }
}

async function gcalFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => ({}))) as T & {
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new GoogleApiError(
      data.error?.message || `Google Calendar API ${res.status}`,
      res.status,
      res.status === 401 ? "unauthorized" : "api_error",
    );
  }
  return data;
}

export interface GcalCalendar {
  id: string;
  summary: string;
  primary: boolean;
}

export async function listCalendars(accessToken: string): Promise<GcalCalendar[]> {
  const data = await gcalFetch<{
    items?: Array<{ id: string; summary?: string; primary?: boolean }>;
  }>(accessToken, "/users/me/calendarList?minAccessRole=writer&maxResults=100");
  return (data.items ?? []).map((c) => ({
    id: c.id,
    summary: c.summary ?? c.id,
    primary: Boolean(c.primary),
  }));
}

export interface GcalEventTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

export interface GcalEvent {
  id: string;
  status?: string;
  summary?: string;
  transparency?: string;
  start?: GcalEventTime;
  end?: GcalEventTime;
  extendedProperties?: { private?: Record<string, string> };
}

export interface GcalEventInput {
  summary: string;
  description?: string;
  start: GcalEventTime;
  end: GcalEventTime;
  extendedProperties?: { private?: Record<string, string> };
  reminders?: { useDefault: boolean };
}

export async function insertEvent(
  accessToken: string,
  calendarId: string,
  body: GcalEventInput,
): Promise<{ id: string }> {
  return gcalFetch<{ id: string }>(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function patchEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  body: Partial<GcalEventInput>,
): Promise<void> {
  await gcalFetch(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

/** 404/410 (already gone) count as success. */
export async function deleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  try {
    await gcalFetch(
      accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: "DELETE" },
    );
  } catch (e) {
    if (e instanceof GoogleApiError && (e.status === 404 || e.status === 410)) return;
    throw e;
  }
}

/**
 * All events (recurring expanded) whose time intersects [timeMin, timeMax].
 * Paginates; hard cap of ~2500 events for safety.
 */
export async function listEventsWindow(
  accessToken: string,
  calendarId: string,
  timeMinIso: string,
  timeMaxIso: string,
): Promise<GcalEvent[]> {
  const events: GcalEvent[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 10; page++) {
    const params = new URLSearchParams({
      singleEvents: "true",
      orderBy: "startTime",
      timeMin: timeMinIso,
      timeMax: timeMaxIso,
      maxResults: "250",
      fields:
        "nextPageToken,items(id,status,summary,transparency,start,end,extendedProperties/private)",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const data = await gcalFetch<{ items?: GcalEvent[]; nextPageToken?: string }>(
      accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
    );
    events.push(...(data.items ?? []));
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return events;
}
