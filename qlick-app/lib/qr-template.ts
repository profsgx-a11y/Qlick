import POSTER_BLUEPRINT from "./poster-blueprint.json";

/**
 * QR poster design model — a simple element tree rendered on a Konva canvas.
 * The canvas coordinate space matches A4 portrait at 96 DPI (794 × 1123),
 * so export to print keeps proportions.
 */

export const A4 = { width: 794, height: 1123 };

export type ElementType =
  | "text"
  | "rect"
  | "image"
  | "qr"
  | "line"
  | "icon"
  | "ellipse"
  | "table";

interface BaseEl {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  rotation?: number;
  opacity?: number;
}

export interface TextEl extends BaseEl {
  type: "text";
  text: string;
  /** Fixed wrap width. Undefined = auto-size to the text content. */
  width?: number;
  fontSize: number;
  fontFamily: string;
  /** Canvas font fragment: "normal" | "italic" | "700" | "italic 600" | "bold" */
  fontStyle: string;
  fill: string;
  align: "left" | "center" | "right";
  lineHeight: number;
  letterSpacing?: number;
}

export interface RectEl extends BaseEl {
  type: "rect";
  width: number;
  height: number;
  fill: string | null;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
}

export interface ImageEl extends BaseEl {
  type: "image";
  src: string;
  width: number;
  height: number;
}

export interface QrEl extends BaseEl {
  type: "qr";
  data: string;
  size: number;
  fill: string;
  background: string;
}

export interface LineEl extends BaseEl {
  type: "line";
  points: number[];
  stroke: string;
  strokeWidth: number;
}

export interface EllipseEl extends BaseEl {
  type: "ellipse";
  radiusX: number;
  radiusY: number;
  fill: string | null;
  stroke?: string;
  strokeWidth?: number;
}

export interface IconEl extends BaseEl {
  type: "icon";
  iconKey: string;
  size: number;
  color: string; // glyph colour
  bg: string; // circle background, or "none"
  borderColor?: string; // circle border colour, or "none"
  borderWidth?: number; // circle border width (24px viewBox units)
}

export interface TableRow {
  label: string;
  value: string;
  /** Show the horizontal separator line below this row (default true). */
  lineBelow?: boolean;
}

export interface TableEl extends BaseEl {
  type: "table";
  width: number;
  rowHeight: number;
  fontSize: number;
  fontFamily: string;
  labelColor: string;
  valueColor: string;
  borderColor: string;
  borderWidth: number;
  showOuter: boolean; // outer border
  showColLine: boolean; // vertical divider between columns
  rows: TableRow[];
}

export type AnyElement =
  | TextEl
  | RectEl
  | ImageEl
  | QrEl
  | LineEl
  | IconEl
  | EllipseEl
  | TableEl;

function rowLineCount(value: string): number {
  return Math.max(1, value.split("\n").length);
}

export function tableHeight(el: TableEl): number {
  return el.rows.reduce(
    (sum, r) => sum + rowLineCount(r.value) * el.rowHeight,
    0,
  );
}

function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Builds a standalone SVG markup string for a schedule table element. */
export function buildTableSvg(el: TableEl): string {
  const W = el.width;
  const lineH = el.rowHeight;
  const fs = el.fontSize;
  const pad = 10;
  const parts: string[] = [];
  let y = 0;

  for (const row of el.rows) {
    const lines = row.value.split("\n");
    const rowH = Math.max(1, lines.length) * lineH;
    const midY = y + rowH / 2;
    parts.push(
      `<text x="${pad}" y="${midY}" font-family="${el.fontFamily}" font-size="${fs}" font-weight="700" fill="${el.labelColor}" text-anchor="start" dominant-baseline="central">${escXml(row.label)}</text>`,
    );
    const vx = W - pad;
    const startY = midY - ((lines.length - 1) * fs * 1.15) / 2;
    lines.forEach((ln, k) => {
      parts.push(
        `<text x="${vx}" y="${startY + k * fs * 1.15}" font-family="${el.fontFamily}" font-size="${fs}" font-weight="500" fill="${el.valueColor}" text-anchor="end" dominant-baseline="central">${escXml(ln)}</text>`,
      );
    });
    if (row.lineBelow !== false && el.borderWidth > 0) {
      parts.push(
        `<line x1="0" y1="${y + rowH}" x2="${W}" y2="${y + rowH}" stroke="${el.borderColor}" stroke-width="${el.borderWidth}"/>`,
      );
    }
    y += rowH;
  }

  const totalH = y;
  if (el.showColLine && el.borderWidth > 0) {
    parts.unshift(
      `<line x1="${W * 0.5}" y1="0" x2="${W * 0.5}" y2="${totalH}" stroke="${el.borderColor}" stroke-width="${el.borderWidth}"/>`,
    );
  }
  if (el.showOuter && el.borderWidth > 0) {
    parts.push(
      `<rect x="0" y="0" width="${W}" height="${totalH}" fill="none" stroke="${el.borderColor}" stroke-width="${el.borderWidth}"/>`,
    );
  }

  const s = 2; // supersample for crisp print
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${totalH}" width="${W * s}" height="${totalH * s}">${parts.join("")}</svg>`;
}

export const DEFAULT_TABLE_ROWS: TableRow[] = [
  { label: "ΔΕΥΤΕΡΑ", value: "09:00 - 18:00" },
  { label: "ΤΡΙΤΗ", value: "09:00 - 18:00" },
  { label: "ΤΕΤΑΡΤΗ", value: "09:00 - 18:00" },
  { label: "ΠΕΜΠΤΗ", value: "09:00 - 20:00" },
  { label: "ΠΑΡΑΣΚΕΥΗ", value: "09:00 - 20:00" },
  { label: "ΣΑΒΒΑΤΟ", value: "10:00 - 16:00" },
  { label: "ΚΥΡΙΑΚΗ", value: "ΚΛΕΙΣΤΑ", lineBelow: false },
];

export interface QrDesign {
  width: number;
  height: number;
  background: string;
  elements: AnyElement[];
}

// Curated fonts. Those marked (EL) include Greek glyphs — use them for
// Greek text. The Latin-only display fonts are best for the logo.
export const FONT_FAMILIES = [
  "Montserrat", // EL — body/headings
  "EB Garamond", // EL — premium serif/italic
  "Inter", // EL
  "Bebas Neue", // Latin display
  "Anton", // Latin display
  "Oswald", // Latin display
  "Playfair Display", // Latin serif
  "Poppins", // Latin
  "Georgia",
];

export interface Palette {
  name: string;
  bg: string; // background / "light" surface
  primary: string; // main dark colour (logo, banner, buttons, QR)
  accent: string; // gold
}

export const PALETTES: Palette[] = [
  { name: "Μαύρο / Χρυσό", bg: "#FFFFFF", primary: "#111111", accent: "#C89B3C" },
  { name: "Navy / Χρυσό", bg: "#FFFFFF", primary: "#0B2341", accent: "#C8A25A" },
  { name: "Πράσινο / Χρυσό", bg: "#FFFFFF", primary: "#0E3B2E", accent: "#C9A34E" },
];

// All known primaries / golds / lights across palettes + the default template,
// so switching palettes reliably re-maps each colour to its role.
const DARKS = new Set(["#111111", "#1f1f1f", "#0b2341", "#0e3b2e"]);
const GOLDS = new Set(["#c89b3c", "#c8a25a", "#c9a34e", "#c9a35a", "#d4a857"]);
const LIGHTS = new Set(["#ffffff", "#fff", "#f8f5f0", "#f7f5ef"]);

function recolor(color: string, p: Palette): string {
  const c = color.toLowerCase();
  if (GOLDS.has(c)) return p.accent;
  if (DARKS.has(c)) return p.primary;
  if (LIGHTS.has(c)) return p.bg;
  return color;
}

/** Re-maps every colour in a design to the chosen palette by role. */
export function applyPaletteToDesign(d: QrDesign, p: Palette): QrDesign {
  return {
    ...d,
    background: p.bg,
    elements: d.elements.map((e) => {
      if (e.type === "text") return { ...e, fill: recolor(e.fill, p) };
      if (e.type === "qr")
        return {
          ...e,
          fill: recolor(e.fill, p),
          background: recolor(e.background, p),
        };
      if (e.type === "rect" || e.type === "ellipse")
        return {
          ...e,
          fill: e.fill ? recolor(e.fill, p) : e.fill,
          stroke: e.stroke ? recolor(e.stroke, p) : e.stroke,
        };
      if (e.type === "line") return { ...e, stroke: recolor(e.stroke, p) };
      if (e.type === "icon")
        return {
          ...e,
          color: recolor(e.color, p),
          bg: e.bg === "none" ? e.bg : recolor(e.bg, p),
          borderColor:
            e.borderColor && e.borderColor !== "none"
              ? recolor(e.borderColor, p)
              : e.borderColor,
        };
      if (e.type === "table")
        return {
          ...e,
          labelColor: recolor(e.labelColor, p),
          valueColor: recolor(e.valueColor, p),
          borderColor: recolor(e.borderColor, p),
        };
      return e;
    }),
  };
}

const DAY_NAMES = [
  "ΚΥΡΙΑΚΗ",
  "ΔΕΥΤΕΡΑ",
  "ΤΡΙΤΗ",
  "ΤΕΤΑΡΤΗ",
  "ΠΕΜΠΤΗ",
  "ΠΑΡΑΣΚΕΥΗ",
  "ΣΑΒΒΑΤΟ",
];

export interface BusinessForTemplate {
  name: string;
  bookingUrl: string;
  est?: string;
  /** Uploaded logo URL; when absent the poster shows the name as text. */
  logoUrl?: string | null;
  hours: Array<{
    day_of_week: number;
    is_closed: boolean;
    open_time: string | null;
    close_time: string | null;
  }>;
}

let idCounter = 0;
export function genId(prefix = "el"): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

// ── Icon library (line-style glyphs, 24px viewBox) ──
export const ICONS: Record<string, string> = {
  calendar:
    '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  refresh:
    '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  clock:
    '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
  scissors:
    '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>',
  phone:
    '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.7 2.34a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.74-1.27a2 2 0 0 1 2.11-.45c.74.34 1.53.57 2.34.7A2 2 0 0 1 22 16.92z"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  mappin:
    '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  heart:
    '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  instagram:
    '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.7" fill="currentColor"/>',
  sparkles:
    '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/>',
  gift:
    '<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
  user:
    '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  scan:
    '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/>',
};

export const ICON_KEYS = Object.keys(ICONS);

/** Builds a standalone SVG markup string for an icon element. */
export function buildIconSvg(
  iconKey: string,
  color: string,
  bg: string,
  size = 256,
  borderColor = "none",
  borderWidth = 0,
): string {
  const glyph = ICONS[iconKey] ?? ICONS.star;
  const hasFill = bg && bg !== "none";
  const bw = borderColor && borderColor !== "none" ? borderWidth : 0;
  const r = Math.max(6, 11.5 - bw / 2);
  const circle =
    hasFill || bw > 0
      ? `<circle cx="12" cy="12" r="${r}" fill="${hasFill ? bg : "none"}"${
          bw > 0 ? ` stroke="${borderColor}" stroke-width="${bw}"` : ""
        }/>`
      : "";
  const inner = `<g fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(12 12) scale(0.55) translate(-12 -12)" color="${color}">${glyph}</g></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}">${circle}${inner}</svg>`;
}

// ── Font weight helpers (fontStyle stores weight + italic together) ──
export function parseFontStyle(s: string): { weight: string; italic: boolean } {
  const italic = /italic/i.test(s);
  const num = s.match(/[1-9]00/);
  const weight = num ? num[0] : /bold/i.test(s) ? "700" : "400";
  return { weight, italic };
}

export function composeFontStyle(weight: string, italic: boolean): string {
  const parts: string[] = [];
  if (italic) parts.push("italic");
  if (weight !== "400") parts.push(weight);
  return parts.length ? parts.join(" ") : "normal";
}

// Theme constants for the name-fallback text (when a business has no logo).
const INK = "#111111";
const LOGO_FONT = "Bebas Neue";

function scheduleRows(hours: BusinessForTemplate["hours"]): TableRow[] {
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order.map((dow, i) => {
    const dayRows = hours
      .filter(
        (x) =>
          x.day_of_week === dow && !x.is_closed && x.open_time && x.close_time,
      )
      .sort((a, c) => (a.open_time ?? "").localeCompare(c.open_time ?? ""));
    const value =
      dayRows.length === 0
        ? "ΚΛΕΙΣΤΑ"
        : dayRows
            .map(
              (r) =>
                `${(r.open_time ?? "").slice(0, 5)} - ${(r.close_time ?? "").slice(0, 5)}`,
            )
            .join("\n");
    return { label: DAY_NAMES[dow], value, lineBelow: i < order.length - 1 };
  });
}

/**
 * Builds the starting QR poster for a business. Clones the approved blueprint
 * (the saved master design) verbatim, then swaps in the per-business bits: the
 * QR booking link, the opening-hours table, and the logo (or the business name
 * as text when no logo has been uploaded yet).
 */
export function buildDefaultTemplate(b: BusinessForTemplate): QrDesign {
  const rows = scheduleRows(b.hours);
  const els: AnyElement[] = [];

  for (const raw of POSTER_BLUEPRINT.elements) {
    const el = JSON.parse(JSON.stringify(raw)) as AnyElement;
    el.id = genId(el.type);

    if (el.type === "qr") {
      el.data = b.bookingUrl;
    } else if (el.type === "table") {
      el.rows = rows;
    } else if (el.type === "image") {
      if (b.logoUrl) {
        el.src = b.logoUrl;
      } else {
        // No logo uploaded yet → show the business name where the logo goes.
        els.push({
          id: genId("txt"),
          type: "text",
          x: el.x,
          y: el.y + (el.height - 90) / 2,
          width: el.width,
          text: b.name.toUpperCase(),
          fontSize: 90,
          fontFamily: LOGO_FONT,
          fontStyle: "400",
          fill: INK,
          align: "center",
          lineHeight: 1,
          letterSpacing: 4,
        });
        continue; // drop the (empty) blueprint image
      }
    }
    els.push(el);
  }

  return {
    width: POSTER_BLUEPRINT.width,
    height: POSTER_BLUEPRINT.height,
    background: POSTER_BLUEPRINT.background,
    elements: els,
  };
}
