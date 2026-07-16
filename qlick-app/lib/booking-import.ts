/**
 * Excel appointment import — pure parsing/matching core.
 *
 * Kept free of exceljs/HTTP so it can be unit-tested with plain arrays. The
 * server action extracts a cell matrix from the uploaded workbook and feeds it
 * here; the wizard round-trips the parsed rows plus the user's mapping choices
 * back to the import action, which re-validates everything server-side.
 *
 * Conventions match the walk-in flow: times are stored as UTC ISO computed
 * from the business timezone; customer name/phone are free text (no account).
 */

import { normalizePhone } from "./validation";
import { zonedTimeToUtc, formatInZone } from "./availability";
import { localDateInZone } from "./calendar";

// ── Cell & column model ──────────────────────────────────────────

/** Normalized cell value handed over by the workbook reader. */
export type CellValue = string | number | boolean | Date | null | undefined;

export type ImportField =
  | "date"
  | "time"
  | "name"
  | "phone"
  | "service"
  | "staff"
  | "duration"
  | "price"
  | "notes";

/** column index (0-based) per recognized field */
export type ColumnMap = Partial<Record<ImportField, number>>;

/**
 * Fold case/accents/final-sigma so "Υπηρεσία", "ΥΠΗΡΕΣΙΑ " and "υπηρεσια"
 * all compare equal. Used for headers, service/staff names and dedupe keys.
 */
export function foldText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ς/g, "σ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Synonyms are checked in array order; first field whose synonym hits wins. */
const HEADER_SYNONYMS: [ImportField, string[]][] = [
  // phone BEFORE name: "τηλεφωνο πελατη" must not match the name synonyms.
  // date BEFORE time: a combined "Ημερομηνία & Ώρα" column must land on date
  // (its embedded time is recovered from the datetime cell value).
  ["phone", ["τηλεφωνο", "τηλ.", "τηλ", "κινητο", "phone", "mobile", "tel"]],
  ["date", ["ημερομηνια", "ημ/νια", "date", "ημερα", "day"]],
  ["time", ["ωρα", "time", "εναρξη", "start"]],
  ["name", ["ονοματεπωνυμο", "ονομα", "πελατησ", "customer", "client", "name"]],
  ["service", ["υπηρεσια", "service", "εργασια", "περιποιηση", "treatment"]],
  [
    "staff",
    ["υπαλληλοσ", "προσωπικο", "εργαζομενοσ", "ατομο", "staff", "employee", "barber"],
  ],
  ["duration", ["διαρκεια", "λεπτα", "duration", "minutes", "mins"]],
  ["price", ["τιμη", "κοστοσ", "ποσο", "price", "cost", "amount"]],
  ["notes", ["σημειωσεισ", "σχολια", "παρατηρησεισ", "notes", "comments"]],
];

/**
 * Recognize which column holds which field from the header row. Exact matches
 * win over "contains" so a header like "Ώρα" never lands on a longer synonym.
 * Returns null when no date column can be found (file we can't understand).
 */
export function detectColumns(headerCells: CellValue[]): ColumnMap | null {
  const headers = headerCells.map((c) =>
    typeof c === "string" ? foldText(c) : "",
  );
  const map: ColumnMap = {};
  const taken = new Set<number>();

  const claim = (field: ImportField, idx: number) => {
    if (map[field] === undefined && !taken.has(idx)) {
      map[field] = idx;
      taken.add(idx);
    }
  };

  // Pass 1: exact header == synonym.
  for (const [field, syns] of HEADER_SYNONYMS) {
    for (let i = 0; i < headers.length; i++) {
      if (headers[i] && syns.includes(headers[i])) claim(field, i);
    }
  }
  // Pass 2: header contains a synonym (e.g. "Διάρκεια (λεπτά)", "Ώρα έναρξης").
  for (const [field, syns] of HEADER_SYNONYMS) {
    if (map[field] !== undefined) continue;
    for (let i = 0; i < headers.length; i++) {
      if (!headers[i] || taken.has(i)) continue;
      if (syns.some((s) => headers[i].includes(s))) {
        claim(field, i);
        break;
      }
    }
  }

  if (map.date === undefined) return null;
  return map;
}

// ── Date / time parsing ──────────────────────────────────────────

interface Ymd {
  y: number;
  mo: number;
  d: number;
  /** time carried inside the same cell (Excel datetime), if any */
  h?: number;
  mi?: number;
}

/** Excel serial day 0 = 1899-12-30 (the standard 1900 date system). */
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);
const DAY_MS = 86_400_000;

function fromExcelSerial(n: number): Ymd | null {
  if (!Number.isFinite(n) || n < 1 || n > 200_000) return null;
  const ms = EXCEL_EPOCH_MS + Math.round(n * DAY_MS);
  const dt = new Date(ms);
  const frac = n - Math.floor(n);
  const out: Ymd = {
    y: dt.getUTCFullYear(),
    mo: dt.getUTCMonth() + 1,
    d: dt.getUTCDate(),
  };
  if (frac > 1e-6) {
    const mins = Math.round(frac * 1440);
    out.h = Math.floor(mins / 60) % 24;
    out.mi = mins % 60;
  }
  return out;
}

const DATE_RES: { re: RegExp; y: number; mo: number; d: number }[] = [
  // 31/12/2026, 31-12-2026, 31.12.2026 (+ optional 2-digit year)
  { re: /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/, d: 1, mo: 2, y: 3 },
  // 2026-12-31 or 2026/12/31
  { re: /^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/, y: 1, mo: 2, d: 3 },
];

/** Parse a date cell (Date, Excel serial, or common EL/ISO strings). */
export function parseDateCell(v: CellValue): Ymd | null {
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    const out: Ymd = {
      y: v.getUTCFullYear(),
      mo: v.getUTCMonth() + 1,
      d: v.getUTCDate(),
    };
    // exceljs represents date-formatted cells as UTC dates; a nonzero wall
    // time means the cell held a full datetime.
    if (v.getUTCHours() !== 0 || v.getUTCMinutes() !== 0) {
      out.h = v.getUTCHours();
      out.mi = v.getUTCMinutes();
    }
    return out;
  }
  if (typeof v === "number") return fromExcelSerial(v);
  if (typeof v !== "string") return null;

  const s = v.trim();
  // "31/12/2026 10:30" — split off a trailing time part first.
  const dtMatch = s.match(/^(\S+)\s+(\d{1,2}[:.·]\d{2})$/);
  const datePart = dtMatch ? dtMatch[1] : s;

  for (const f of DATE_RES) {
    const m = datePart.match(f.re);
    if (!m) continue;
    let y = Number(m[f.y]);
    const mo = Number(m[f.mo]);
    const d = Number(m[f.d]);
    if (y < 100) y += 2000;
    if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;
    if (y < 2000 || y > 2100) continue;
    const out: Ymd = { y, mo, d };
    if (dtMatch) {
      const t = parseTimeCell(dtMatch[2]);
      if (t) {
        out.h = t.h;
        out.mi = t.mi;
      }
    }
    return out;
  }
  return null;
}

/** Parse a time cell (Date, Excel day-fraction, "10:30", "9.15", "10:30 μμ"). */
export function parseTimeCell(v: CellValue): { h: number; mi: number } | null {
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    return { h: v.getUTCHours(), mi: v.getUTCMinutes() };
  }
  if (typeof v === "number") {
    if (v >= 0 && v < 1) {
      const mins = Math.round(v * 1440);
      return { h: Math.floor(mins / 60) % 24, mi: mins % 60 };
    }
    if (Number.isInteger(v) && v >= 0 && v <= 23) return { h: v, mi: 0 };
    return null;
  }
  if (typeof v !== "string") return null;

  const s = foldText(v);
  const m = s.match(/^(\d{1,2})(?:[:.·](\d{2}))?\s*(πμ|μμ|am|pm|π.μ.|μ.μ.)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const mi = m[2] ? Number(m[2]) : 0;
  const suffix = m[3];
  if (mi > 59) return null;
  if (suffix === "μμ" || suffix === "pm" || suffix === "μ.μ.") {
    if (h < 12) h += 12;
  } else if (suffix === "πμ" || suffix === "am" || suffix === "π.μ.") {
    if (h === 12) h = 0;
  }
  if (h > 23) return null;
  return { h, mi };
}

/** Duration cell → minutes ("45", 45, "1:30" → 90, "45'"). */
export function parseDurationCell(v: CellValue): number | null {
  if (typeof v === "number") {
    return Number.isFinite(v) && v > 0 && v <= 1440 ? Math.round(v) : null;
  }
  if (typeof v !== "string") return null;
  const s = v.trim();
  const hm = s.match(/^(\d{1,2})[:.](\d{2})$/);
  if (hm) {
    const mins = Number(hm[1]) * 60 + Number(hm[2]);
    return mins > 0 && mins <= 1440 ? mins : null;
  }
  const n = Number(s.replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 && n <= 1440 ? Math.round(n) : null;
}

/** Price cell → cents. Accepts "15", "15,50", "15.50", "€ 15,50". */
export function parsePriceCell(v: CellValue): number | null {
  if (typeof v === "number") {
    return Number.isFinite(v) && v >= 0 ? Math.round(v * 100) : null;
  }
  if (typeof v !== "string") return null;
  const s = v.replace(/[€\s]/g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

function cellText(v: CellValue): string | null {
  if (typeof v === "string") {
    const s = v.trim();
    return s ? s : null;
  }
  if (typeof v === "number") return String(v);
  return null;
}

// ── Row parsing ──────────────────────────────────────────────────

export type RowProblem =
  | "bad_date"
  | "bad_time"
  | "missing_name"
  | "bad_phone"
  | "unknown_service"
  | "unknown_staff"
  | "duplicate_in_file";

/** A sheet row after parsing/normalization — safe to serialize to the client. */
export interface ParsedRow {
  /** 1-based data row number (excluding the header) for error messages */
  index: number;
  startsAtIso: string | null;
  /** "31/12/2026 10:30" in the business timezone, for the preview table */
  whenLabel: string | null;
  name: string | null;
  /** E.164 when valid, else null (raw kept for display) */
  phone: string | null;
  phoneRaw: string | null;
  serviceText: string | null;
  serviceId: string | null;
  staffText: string | null;
  staffId: string | null;
  durationMin: number | null;
  priceCents: number | null;
  notes: string | null;
  problems: RowProblem[];
}

export interface CatalogService {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
}
export interface CatalogStaff {
  id: string;
  name: string;
}

/**
 * Match free text against catalog names: exact (folded) first, then a unique
 * prefix, then a unique substring. Ambiguous or absent → null (user maps it).
 */
export function matchByName<T extends { id: string; name: string }>(
  text: string,
  catalog: T[],
): T | null {
  const q = foldText(text);
  if (!q) return null;
  const exact = catalog.filter((c) => foldText(c.name) === q);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;
  const prefix = catalog.filter(
    (c) => foldText(c.name).startsWith(q) || q.startsWith(foldText(c.name)),
  );
  if (prefix.length === 1) return prefix[0];
  if (prefix.length > 1) return null;
  const sub = catalog.filter(
    (c) => foldText(c.name).includes(q) || q.includes(foldText(c.name)),
  );
  return sub.length === 1 ? sub[0] : null;
}

/** Key used to spot duplicates (same instant + same person). */
export function dedupeKey(
  startsAtIso: string,
  name: string | null,
  phone: string | null,
): string {
  const who = phone ? phone.replace(/\D/g, "") : foldText(name ?? "");
  return `${startsAtIso}|${who}`;
}

/** A distinct unmatched catalog text: folded key + first raw spelling seen. */
export interface UnknownText {
  key: string;
  label: string;
}

export interface ParseSheetResult {
  rows: ParsedRow[];
  unknownServices: UnknownText[];
  unknownStaff: UnknownText[];
}

export const MAX_IMPORT_ROWS = 3000;

/**
 * Turn the raw cell matrix (header row + data rows) into validated rows with
 * catalog matches. Empty rows are skipped; rows without a usable date+time are
 * kept with problems so the preview can show why they'll be skipped.
 */
export function parseSheet(
  header: CellValue[],
  data: CellValue[][],
  columns: ColumnMap,
  timeZone: string,
  services: CatalogService[],
  staff: CatalogStaff[],
): ParseSheetResult {
  const rows: ParsedRow[] = [];
  const unknownServices = new Map<string, string>();
  const unknownStaff = new Map<string, string>();
  const seen = new Set<string>();

  const pick = (cells: CellValue[], field: ImportField): CellValue =>
    columns[field] === undefined ? null : cells[columns[field]!];

  for (let r = 0; r < data.length; r++) {
    const cells = data[r] ?? [];
    const isEmpty = cells.every(
      (c) => c == null || (typeof c === "string" && c.trim() === ""),
    );
    if (isEmpty) continue;

    const problems: RowProblem[] = [];

    const ymd = parseDateCell(pick(cells, "date"));
    if (!ymd) problems.push("bad_date");

    let time: { h: number; mi: number } | null = null;
    const timeCell = pick(cells, "time");
    if (timeCell != null && timeCell !== "") {
      time = parseTimeCell(timeCell);
      if (!time) problems.push("bad_time");
    } else if (ymd && ymd.h !== undefined) {
      time = { h: ymd.h, mi: ymd.mi ?? 0 };
    } else {
      problems.push("bad_time");
    }

    let startsAtIso: string | null = null;
    if (ymd && time) {
      startsAtIso = zonedTimeToUtc(
        ymd.y,
        ymd.mo,
        ymd.d,
        time.h,
        time.mi,
        timeZone,
      ).toISOString();
    }

    const name = cellText(pick(cells, "name"));
    if (!name) problems.push("missing_name");

    const phoneRaw = cellText(pick(cells, "phone"));
    let phone: string | null = null;
    if (phoneRaw) {
      phone = normalizePhone(phoneRaw);
      if (!phone) problems.push("bad_phone");
    }

    const serviceText = cellText(pick(cells, "service"));
    let serviceId: string | null = null;
    if (serviceText) {
      const hit = matchByName(serviceText, services);
      if (hit) serviceId = hit.id;
      else {
        problems.push("unknown_service");
        const key = foldText(serviceText);
        if (!unknownServices.has(key)) unknownServices.set(key, serviceText);
      }
    }

    const staffText = cellText(pick(cells, "staff"));
    let staffId: string | null = null;
    if (staffText) {
      const hit = matchByName(staffText, staff);
      if (hit) staffId = hit.id;
      else {
        problems.push("unknown_staff");
        const key = foldText(staffText);
        if (!unknownStaff.has(key)) unknownStaff.set(key, staffText);
      }
    }

    if (startsAtIso) {
      const key = dedupeKey(startsAtIso, name, phone);
      if (seen.has(key)) problems.push("duplicate_in_file");
      else seen.add(key);
    }

    rows.push({
      index: r + 1,
      startsAtIso,
      whenLabel: startsAtIso ? previewLabel(startsAtIso, timeZone) : null,
      name,
      phone,
      phoneRaw,
      serviceText,
      serviceId,
      staffText,
      staffId,
      durationMin: parseDurationCell(pick(cells, "duration")),
      priceCents: parsePriceCell(pick(cells, "price")),
      notes: cellText(pick(cells, "notes")),
      problems,
    });
  }

  return {
    rows,
    unknownServices: [...unknownServices].map(([key, label]) => ({
      key,
      label,
    })),
    unknownStaff: [...unknownStaff].map(([key, label]) => ({ key, label })),
  };
}

// ── Finalization (shared by preview counts and the import action) ─

/** What the user chose for each unmatched service/staff text (folded key). */
export interface ImportMappings {
  /** folded service text → service id, or "" to import as plain text */
  services: Record<string, string>;
  /** folded staff text → staff id, or "" to leave unassigned */
  staff: Record<string, string>;
}

export interface FinalBooking {
  startsAtIso: string;
  endsAtIso: string;
  serviceId: string | null;
  serviceName: string | null;
  staffId: string | null;
  name: string | null;
  phone: string | null;
  priceCents: number;
  notes: string | null;
  isPast: boolean;
  dedupeKey: string;
}

export const DEFAULT_DURATION_MIN = 30;

/**
 * Resolve every importable row to a concrete booking payload: apply the user's
 * mappings, fill duration/price from the matched service, split past/future.
 * Rows with fatal problems (no start instant, or an in-file duplicate) are
 * returned in `skipped`.
 */
export function finalizeRows(
  rows: ParsedRow[],
  services: CatalogService[],
  mappings: ImportMappings,
  opts: { defaultDurationMin?: number; now?: Date } = {},
): { bookings: FinalBooking[]; skipped: ParsedRow[] } {
  const nowMs = (opts.now ?? new Date()).getTime();
  const defaultDuration = opts.defaultDurationMin ?? DEFAULT_DURATION_MIN;
  const svcById = new Map(services.map((s) => [s.id, s]));

  const bookings: FinalBooking[] = [];
  const skipped: ParsedRow[] = [];

  for (const row of rows) {
    if (!row.startsAtIso || row.problems.includes("duplicate_in_file")) {
      skipped.push(row);
      continue;
    }

    let serviceId = row.serviceId;
    if (!serviceId && row.serviceText) {
      const mapped = mappings.services[foldText(row.serviceText)];
      if (mapped && svcById.has(mapped)) serviceId = mapped;
    }
    const svc = serviceId ? svcById.get(serviceId) : undefined;

    let staffId = row.staffId;
    if (!staffId && row.staffText) {
      const mapped = mappings.staff[foldText(row.staffText)];
      if (mapped) staffId = mapped;
    }

    const durationMin =
      row.durationMin ?? svc?.durationMinutes ?? defaultDuration;
    const startMs = new Date(row.startsAtIso).getTime();
    const endsAtIso = new Date(startMs + durationMin * 60_000).toISOString();

    bookings.push({
      startsAtIso: row.startsAtIso,
      endsAtIso,
      serviceId: serviceId ?? null,
      serviceName: svc?.name ?? row.serviceText,
      staffId: staffId ?? null,
      name: row.name,
      phone: row.phone,
      priceCents: row.priceCents ?? svc?.priceCents ?? 0,
      notes: row.notes,
      isPast: startMs < nowMs,
      dedupeKey: dedupeKey(row.startsAtIso, row.name, row.phone),
    });
  }

  return { bookings, skipped };
}

/** Preview label ("31/12/2026 10:30") rendered in the business timezone. */
export function previewLabel(iso: string, tz: string): string {
  const date = localDateInZone(iso, tz); // YYYY-MM-DD
  const [y, mo, d] = date.split("-");
  return `${d}/${mo}/${y} ${formatInZone(new Date(iso), tz)}`;
}
