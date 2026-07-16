"use server";

import { revalidatePath } from "next/cache";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "@/i18n/config";
import { normalizePhone, isValidEmail } from "@/lib/validation";
import {
  detectColumns,
  parseSheet,
  finalizeRows,
  foldText,
  dedupeKey,
  MAX_IMPORT_ROWS,
  DEFAULT_DURATION_MIN,
  type CellValue,
  type ParsedRow,
  type RowProblem,
  type CatalogService,
  type CatalogStaff,
  type ImportMappings,
  type UnknownText,
} from "@/lib/booking-import";

const MAX_FILE_BYTES = 4 * 1024 * 1024;

/** Owner/manager guard shared by both actions. */
async function getBiz() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, businessId: null, timeZone: "" };
  const { data: biz } = await supabase
    .from("my_businesses")
    .select("id, my_role, timezone")
    .limit(1)
    .maybeSingle();
  const ok =
    !!biz?.id && (biz.my_role === "owner" || biz.my_role === "manager");
  return {
    supabase,
    user,
    businessId: ok ? (biz!.id as string) : null,
    timeZone: biz?.timezone || "Europe/Athens",
  };
}

async function loadCatalog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
): Promise<{ services: CatalogService[]; staff: CatalogStaff[] }> {
  // Include inactive entries: historical rows may reference services/staff
  // that have since been switched off, and matching them is still correct.
  const [{ data: svcRows }, { data: staffRows }] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, duration_minutes, price_cents")
      .eq("business_id", businessId),
    supabase.from("staff").select("id, name").eq("business_id", businessId),
  ]);
  return {
    services: (svcRows ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      durationMinutes: s.duration_minutes,
      priceCents: s.price_cents,
    })),
    staff: (staffRows ?? []).map((s) => ({ id: s.id, name: s.name })),
  };
}

/** Flatten exceljs cell values (rich text, formulas, hyperlinks) to plain ones. */
function normCell(v: ExcelJS.CellValue): CellValue {
  if (v == null) return null;
  if (
    v instanceof Date ||
    typeof v === "string" ||
    typeof v === "number" ||
    typeof v === "boolean"
  ) {
    return v;
  }
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((rt) => rt.text).join("");
    if ("hyperlink" in v) {
      return typeof v.text === "string" ? v.text : null;
    }
    if ("result" in v) return normCell(v.result as ExcelJS.CellValue);
    if ("formula" in v) return null; // formula without a cached result
  }
  return null;
}

export interface ParseFileResult {
  ok: boolean;
  error?: string;
  rows?: ParsedRow[];
  unknownServices?: UnknownText[];
  unknownStaff?: UnknownText[];
  /** true when some importable rows have neither a service nor a duration */
  needsDefaultDuration?: boolean;
}

/**
 * Step 1 of the wizard: read the uploaded .xlsx, locate the header row, parse
 * every data row and match services/staff. Nothing is written — the client
 * shows a preview and sends the rows back to `importBookings`.
 */
export async function parseImportFile(
  formData: FormData,
): Promise<ParseFileResult> {
  const { supabase, user, businessId, timeZone } = await getBiz();
  if (!user) return { ok: false, error: "not_authenticated" };
  if (!businessId) return { ok: false, error: "no_permission" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: "file_missing" };
  if (file.size > MAX_FILE_BYTES) return { ok: false, error: "file_too_large" };
  if (!/\.xlsx$/i.test(file.name)) return { ok: false, error: "file_type" };

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(await file.arrayBuffer());
  } catch {
    return { ok: false, error: "file_unreadable" };
  }

  // First visible sheet with content (skips our hidden "Lists" sheet).
  const sheet = workbook.worksheets.find(
    (ws) => ws.state === "visible" && ws.actualRowCount > 0,
  );
  if (!sheet) return { ok: false, error: "file_unreadable" };

  const matrix: CellValue[][] = [];
  sheet.eachRow((row) => {
    const vals = row.values as ExcelJS.CellValue[]; // 1-based sparse array
    matrix.push(vals.slice(1, 31).map(normCell));
  });

  // The header may not be the very first row (people add titles above it).
  let headerIdx = -1;
  let columns = null;
  for (let i = 0; i < Math.min(matrix.length, 10); i++) {
    const cand = detectColumns(matrix[i]);
    if (cand && (cand.time !== undefined || cand.name !== undefined)) {
      headerIdx = i;
      columns = cand;
      break;
    }
  }
  if (headerIdx === -1 || !columns)
    return { ok: false, error: "no_header_row" };

  const data = matrix.slice(headerIdx + 1);
  if (data.length === 0) return { ok: false, error: "nothing_to_import" };
  if (data.length > MAX_IMPORT_ROWS)
    return { ok: false, error: "too_many_rows" };

  const { services, staff } = await loadCatalog(supabase, businessId);
  const parsed = parseSheet(
    matrix[headerIdx],
    data,
    columns,
    timeZone,
    services,
    staff,
  );

  // Rows that can't inherit a duration from a matched service will fall back
  // to the wizard's default-duration picker.
  const needsDefaultDuration = parsed.rows.some(
    (r) => r.startsAtIso && !r.durationMin && !r.serviceId,
  );

  return {
    ok: true,
    rows: parsed.rows,
    unknownServices: parsed.unknownServices,
    unknownStaff: parsed.unknownStaff,
    needsDefaultDuration,
  };
}

// ── Import ───────────────────────────────────────────────────────

const PROBLEMS: RowProblem[] = [
  "bad_date",
  "bad_time",
  "missing_name",
  "bad_phone",
  "bad_email",
  "unknown_service",
  "unknown_staff",
  "duplicate_in_file",
];

function asStr(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s.slice(0, max) : null;
}

function asIso(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = new Date(v).getTime();
  if (Number.isNaN(t)) return null;
  const y = new Date(v).getUTCFullYear();
  if (y < 2000 || y > 2100) return null;
  return new Date(t).toISOString();
}

/** Rebuild a trustworthy ParsedRow from whatever the client sent. */
function sanitizeRow(
  raw: unknown,
  svcIds: Set<string>,
  staffIds: Set<string>,
): ParsedRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const startsAtIso = asIso(r.startsAtIso);
  const phoneRaw = asStr(r.phoneRaw, 40);
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  const emailRaw = asStr(r.emailRaw, 254);
  const email =
    emailRaw && isValidEmail(emailRaw) ? emailRaw.toLowerCase() : null;
  const durationMin =
    typeof r.durationMin === "number" &&
    Number.isFinite(r.durationMin) &&
    r.durationMin > 0 &&
    r.durationMin <= 1440
      ? Math.round(r.durationMin)
      : null;
  const priceCents =
    typeof r.priceCents === "number" &&
    Number.isFinite(r.priceCents) &&
    r.priceCents >= 0 &&
    r.priceCents <= 10_000_000
      ? Math.round(r.priceCents)
      : null;

  const problems = Array.isArray(r.problems)
    ? (r.problems.filter((p) =>
        PROBLEMS.includes(p as RowProblem),
      ) as RowProblem[])
    : [];

  const serviceId =
    typeof r.serviceId === "string" && svcIds.has(r.serviceId)
      ? r.serviceId
      : null;
  const staffId =
    typeof r.staffId === "string" && staffIds.has(r.staffId)
      ? r.staffId
      : null;

  return {
    index: typeof r.index === "number" ? r.index : 0,
    startsAtIso,
    whenLabel: null, // preview-only; not needed at import time
    name: asStr(r.name, 120),
    phone,
    phoneRaw,
    email,
    emailRaw,
    serviceText: asStr(r.serviceText, 120),
    serviceId,
    staffText: asStr(r.staffText, 120),
    staffId,
    durationMin,
    priceCents,
    notes: asStr(r.notes, 300),
    problems,
  };
}

export interface ImportResult {
  ok: boolean;
  error?: string;
  imported?: number;
  duplicates?: number;
  skipped?: number;
  customersCreated?: number;
}

export interface ImportInput {
  locale: string;
  rows: ParsedRow[];
  mappings: ImportMappings;
  defaultDurationMin?: number;
}

/**
 * Step 2 of the wizard: write the reviewed rows as bookings. Mirrors the
 * walk-in insert (customer_id = the owner, free-text name/phone) with
 * source "import"; past rows land as completed history, future as confirmed.
 * Matched or newly-created CRM cards are linked so the customer page fills up.
 * No emails, no hours/capacity checks — historical data must never be cut.
 */
export async function importBookings(
  input: ImportInput,
): Promise<ImportResult> {
  const { supabase, user, businessId } = await getBiz();
  if (!user) return { ok: false, error: "not_authenticated" };
  if (!businessId) return { ok: false, error: "no_permission" };

  const safeLocale = hasLocale(input?.locale) ? input.locale : "el";
  if (!input || !Array.isArray(input.rows) || input.rows.length === 0)
    return { ok: false, error: "nothing_to_import" };
  if (input.rows.length > MAX_IMPORT_ROWS)
    return { ok: false, error: "too_many_rows" };

  const { services, staff } = await loadCatalog(supabase, businessId);
  const svcIds = new Set(services.map((s) => s.id));
  const staffIds = new Set(staff.map((s) => s.id));

  // Untrusted client payload → rebuild rows and mappings defensively.
  const rows: ParsedRow[] = [];
  for (const raw of input.rows) {
    const row = sanitizeRow(raw, svcIds, staffIds);
    if (row) rows.push(row);
  }

  const mappings: ImportMappings = { services: {}, staff: {} };
  if (input.mappings && typeof input.mappings === "object") {
    for (const [k, v] of Object.entries(input.mappings.services ?? {})) {
      if (typeof v === "string" && (v === "" || svcIds.has(v)))
        mappings.services[foldText(k)] = v;
    }
    for (const [k, v] of Object.entries(input.mappings.staff ?? {})) {
      if (typeof v === "string" && (v === "" || staffIds.has(v)))
        mappings.staff[foldText(k)] = v;
    }
  }

  const defaultDurationMin =
    typeof input.defaultDurationMin === "number" &&
    input.defaultDurationMin >= 5 &&
    input.defaultDurationMin <= 480
      ? Math.round(input.defaultDurationMin)
      : DEFAULT_DURATION_MIN;

  const { bookings, skipped } = finalizeRows(rows, services, mappings, {
    defaultDurationMin,
  });
  if (bookings.length === 0)
    return { ok: false, error: "nothing_to_import", skipped: skipped.length };

  // ── Duplicates against what's already in the calendar ─────────
  let minMs = Infinity;
  let maxMs = -Infinity;
  for (const b of bookings) {
    const t = new Date(b.startsAtIso).getTime();
    if (t < minMs) minMs = t;
    if (t > maxMs) maxMs = t;
  }
  // Any status counts — a booking the owner cancelled in Qlick but that still
  // sits in the old Excel must not be resurrected by the import.
  const { data: existing } = await supabase
    .from("bookings")
    .select("starts_at, customer_name, customer_phone")
    .eq("business_id", businessId)
    .gte("starts_at", new Date(minMs).toISOString())
    .lte("starts_at", new Date(maxMs).toISOString());

  const taken = new Set<string>();
  for (const e of existing ?? []) {
    // Keys for both identities (phone AND name) so either kind of match hits.
    const iso = new Date(e.starts_at).toISOString();
    if (e.customer_phone) taken.add(dedupeKey(iso, null, e.customer_phone));
    if (e.customer_name) taken.add(dedupeKey(iso, e.customer_name, null));
  }

  const seen = new Set<string>();
  const fresh: typeof bookings = [];
  let duplicates = 0;
  for (const b of bookings) {
    const byPhone = b.phone ? dedupeKey(b.startsAtIso, null, b.phone) : null;
    const byName = b.name ? dedupeKey(b.startsAtIso, b.name, null) : null;
    const isDup =
      (byPhone && (taken.has(byPhone) || seen.has(byPhone))) ||
      (byName && (taken.has(byName) || seen.has(byName)));
    if (isDup) {
      duplicates++;
      continue;
    }
    if (byPhone) seen.add(byPhone);
    if (byName) seen.add(byName);
    fresh.push(b);
  }

  if (fresh.length === 0) {
    return {
      ok: true,
      imported: 0,
      duplicates,
      skipped: skipped.length,
      customersCreated: 0,
    };
  }

  // ── CRM cards: match by phone → email → name; create the rest ──
  const { data: cards } = await supabase
    .from("business_customers")
    .select("id, first_name, last_name, phone, email")
    .eq("business_id", businessId);

  const cardByPhone = new Map<string, string>();
  const cardByEmail = new Map<string, string>();
  const cardByName = new Map<string, string>();
  const indexCard = (c: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    email: string | null;
  }) => {
    const digits = c.phone?.replace(/\D/g, "");
    if (digits && !cardByPhone.has(digits)) cardByPhone.set(digits, c.id);
    const mail = c.email?.trim().toLowerCase();
    if (mail && !cardByEmail.has(mail)) cardByEmail.set(mail, c.id);
    const full = foldText(
      [c.first_name, c.last_name].filter(Boolean).join(" "),
    );
    if (full && !cardByName.has(full)) cardByName.set(full, c.id);
  };
  for (const c of cards ?? []) indexCard(c);

  const cardFor = (b: (typeof fresh)[number]): string | null => {
    const digits = b.phone?.replace(/\D/g, "");
    if (digits && cardByPhone.has(digits)) return cardByPhone.get(digits)!;
    if (b.email && cardByEmail.has(b.email)) return cardByEmail.get(b.email)!;
    const nameKey = foldText(b.name ?? "");
    if (nameKey && cardByName.has(nameKey)) return cardByName.get(nameKey)!;
    return null;
  };

  // Distinct new people in this batch (identity: phone, else email, else name).
  const newPeople = new Map<
    string,
    { name: string | null; phone: string | null; email: string | null }
  >();
  for (const b of fresh) {
    if (cardFor(b)) continue;
    const digits = b.phone?.replace(/\D/g, "");
    const nameKey = foldText(b.name ?? "");
    if (!digits && !b.email && !nameKey) continue; // anonymous row → no card
    const key = digits ? `p:${digits}` : b.email ? `e:${b.email}` : `n:${nameKey}`;
    if (!newPeople.has(key))
      newPeople.set(key, { name: b.name, phone: b.phone, email: b.email });
  }

  let customersCreated = 0;
  if (newPeople.size > 0) {
    const payload = [...newPeople.values()].map((p) => {
      const parts = (p.name ?? "").trim().split(/\s+/).filter(Boolean);
      return {
        business_id: businessId,
        first_name: parts[0] ?? null,
        last_name: parts.slice(1).join(" ") || null,
        phone: p.phone,
        email: p.email,
      };
    });
    const { data: created, error } = await supabase
      .from("business_customers")
      .insert(payload)
      .select("id, first_name, last_name, phone, email");
    if (error) return { ok: false, error: "import_failed" };
    customersCreated = created?.length ?? 0;
    for (const c of created ?? []) indexCard(c);
  }

  // ── Insert bookings in chunks ──────────────────────────────────
  const payload = fresh.map((b) => ({
    business_id: businessId,
    customer_id: user.id,
    business_customer_id: cardFor(b),
    service_id: b.serviceId,
    service_name: b.serviceName,
    staff_id: b.staffId,
    starts_at: b.startsAtIso,
    ends_at: b.endsAtIso,
    status: b.isPast ? "completed" : "confirmed",
    completed_at: b.isPast ? b.endsAtIso : null,
    source: "import",
    no_staff_preference: !b.staffId,
    customer_name: b.name,
    customer_phone: b.phone,
    customer_notes: b.notes,
    price_cents: b.priceCents,
  }));

  let imported = 0;
  for (let i = 0; i < payload.length; i += 400) {
    const chunk = payload.slice(i, i + 400);
    const { error } = await supabase.from("bookings").insert(chunk);
    if (error) {
      // Report what actually landed before the failure.
      return imported > 0
        ? { ok: false, error: "import_failed", imported, duplicates }
        : { ok: false, error: "import_failed" };
    }
    imported += chunk.length;
  }

  revalidatePath(`/${safeLocale}/dashboard/bookings`);
  revalidatePath(`/${safeLocale}/dashboard/calendar`);
  revalidatePath(`/${safeLocale}/dashboard/customers`);
  revalidatePath(`/${safeLocale}/dashboard`);

  return {
    ok: true,
    imported,
    duplicates,
    skipped: skipped.length,
    customersCreated,
  };
}
