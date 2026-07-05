// Best-effort parser: OSM `opening_hours` string → our weekly hours shape.
// Handles common patterns like:
//   "Mo-Fr 09:00-15:00; Sa 10:00-16:00; Su off"
//   "Mo-Sa 09:00-13:00,17:00-21:00"
//   "24/7"
// Returns a 7-entry array (day_of_week 0=Sun..6=Sat) or null if unparseable.

export interface OsmDayHour {
  day_of_week: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
  open_time2?: string | null;
  close_time2?: string | null;
}

// OSM weekday order → our day_of_week (Su=0..Sa=6)
const OSM_ORDER = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const TO_DOW: Record<string, number> = {
  Mo: 1,
  Tu: 2,
  We: 3,
  Th: 4,
  Fr: 5,
  Sa: 6,
  Su: 0,
};

function norm(tok: string): string {
  const t = tok.trim().slice(0, 2).toLowerCase();
  return t.charAt(0).toUpperCase() + t.charAt(1);
}

function expandDays(daysStr: string): number[] {
  const out = new Set<number>();
  for (const part of daysStr.split(",")) {
    const seg = part.trim();
    if (!seg) continue;
    if (seg.includes("-")) {
      const [a, b] = seg.split("-").map(norm);
      const ia = OSM_ORDER.indexOf(a);
      const ib = OSM_ORDER.indexOf(b);
      if (ia === -1 || ib === -1) continue;
      let i = ia;
      // inclusive, wrapping (e.g. Sa-Su, Fr-Mo)
      for (let guard = 0; guard < 7; guard++) {
        out.add(TO_DOW[OSM_ORDER[i]]);
        if (i === ib) break;
        i = (i + 1) % 7;
      }
    } else {
      const d = norm(seg);
      if (d in TO_DOW) out.add(TO_DOW[d]);
    }
  }
  return [...out];
}

const TIME = /^(\d{1,2}):(\d{2})$/;
function validTime(t: string): string | null {
  const m = TIME.exec(t.trim());
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2];
  if (h === 24) h = 23; // clamp "24:00" → "23:00"+ (display only)
  if (h < 0 || h > 23) return null;
  return `${String(h).padStart(2, "0")}:${min}`;
}

export function parseOsmOpeningHours(raw: string): OsmDayHour[] | null {
  if (!raw || !raw.trim()) return null;
  const days: OsmDayHour[] = Array.from({ length: 7 }, (_, d) => ({
    day_of_week: d,
    is_closed: true,
    open_time: null,
    close_time: null,
    open_time2: null,
    close_time2: null,
  }));
  let applied = false;

  const input = raw.trim();
  if (/^24\/7$/.test(input)) {
    for (const d of days) {
      d.is_closed = false;
      d.open_time = "00:00";
      d.close_time = "23:59";
    }
    return days;
  }

  for (const ruleRaw of input.split(";")) {
    const rule = ruleRaw.trim();
    if (!rule) continue;

    const closed = /\b(off|closed)\b/i.test(rule);
    // Split days vs the rest at the first digit (time) — or whole thing for "off".
    const digitIdx = rule.search(/\d/);
    const daysStr =
      closed && digitIdx === -1
        ? rule.replace(/\b(off|closed)\b/i, "").trim()
        : digitIdx >= 0
          ? rule.slice(0, digitIdx).trim()
          : rule.trim();

    // Ignore non-weekday selectors we don't support (PH, SH, dates, week...).
    if (daysStr && !/^[A-Za-z,\-\s]+$/.test(daysStr)) continue;

    const dayIdxs = daysStr ? expandDays(daysStr) : OSM_ORDER.map((d) => TO_DOW[d]);
    if (dayIdxs.length === 0) continue;

    if (closed && digitIdx === -1) {
      for (const di of dayIdxs) {
        const day = days.find((x) => x.day_of_week === di)!;
        day.is_closed = true;
        day.open_time = null;
        day.close_time = null;
        day.open_time2 = null;
        day.close_time2 = null;
      }
      continue;
    }

    const timeStr = digitIdx >= 0 ? rule.slice(digitIdx).trim() : "";
    const ranges = timeStr
      .split(",")
      .map((r) => r.trim())
      .map((r) => {
        const [o, c] = r.split("-");
        const open = o ? validTime(o) : null;
        const close = c ? validTime(c) : null;
        return open && close ? { open, close } : null;
      })
      .filter((r): r is { open: string; close: string } => !!r);

    if (ranges.length === 0) continue;

    for (const di of dayIdxs) {
      const day = days.find((x) => x.day_of_week === di)!;
      day.is_closed = false;
      day.open_time = ranges[0].open;
      day.close_time = ranges[0].close;
      day.open_time2 = ranges[1]?.open ?? null;
      day.close_time2 = ranges[1]?.close ?? null;
      applied = true;
    }
  }

  return applied ? days : null;
}
