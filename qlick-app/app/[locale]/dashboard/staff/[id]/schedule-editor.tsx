"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Plus,
  Trash2,
  Clock,
  CalendarOff,
  AlertCircle,
  X,
  BarChart3,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { dashErr } from "@/lib/dash-error";
import { zonedTimeToUtc } from "@/lib/availability";
import {
  localDateInZone,
  minutesFromMidnight,
  addDaysStr,
  startOfWeekStr,
} from "@/lib/calendar";
import {
  saveStaffHours,
  addTimeOff,
  deleteTimeOff,
  type StaffWindow,
} from "./actions";

interface Win {
  open: string;
  close: string;
}
export interface TimeOffRow {
  id: string;
  type: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
}

type OffKind = "repo" | "leave" | "sick" | "unpaid";

const TYPE_META: Record<OffKind, { cls: string; dot: string }> = {
  repo: { cls: "bg-blue-500/15 text-blue-400", dot: "bg-blue-400" },
  leave: { cls: "bg-gold/15 text-gold", dot: "bg-gold" },
  sick: { cls: "bg-red-500/15 text-red-400", dot: "bg-red-400" },
  unpaid: { cls: "bg-purple-500/15 text-purple-400", dot: "bg-purple-400" },
};
const TYPE_ORDER: OffKind[] = ["repo", "leave", "sick", "unpaid"];
/** Paid absence types — count toward salary; "unpaid" never does. */
const PAID_TYPES: OffKind[] = ["repo", "leave", "sick"];

interface Props {
  locale: string;
  tz: string;
  staffId: string;
  businessHours: { day_of_week: number; open_time: string; close_time: string }[];
  initialCustom: boolean;
  initialDays: Record<number, Win[]>;
  initialTimeOff: TimeOffRow[];
}

const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0];

const hm = (t: string) => t.slice(0, 5);

function businessDays(
  hours: Props["businessHours"],
): Record<number, Win[]> {
  const d: Record<number, Win[]> = {};
  for (const dow of DOW_ORDER) d[dow] = [];
  for (const h of hours)
    d[h.day_of_week]?.push({ open: hm(h.open_time), close: hm(h.close_time) });
  return d;
}

export function ScheduleEditor({
  locale,
  tz,
  staffId,
  businessHours,
  initialCustom,
  initialDays,
  initialTimeOff,
}: Props) {
  const dict = useDict();
  const dd = dict.dashboard;
  const t = dd.staff;
  const dayNames = dict.shop.days;
  const typeLabel: Record<OffKind, string> = {
    repo: t.offRepo,
    leave: t.offLeave,
    sick: t.offSick,
    unpaid: t.offUnpaid,
  };
  const bizDays = businessDays(businessHours);
  const [custom, setCustom] = useState(initialCustom);
  const [days, setDays] = useState<Record<number, Win[]>>(
    initialCustom ? initialDays : bizDays,
  );
  const [hoursErr, setHoursErr] = useState<string | null>(null);
  const [savedHours, setSavedHours] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [timeOff, setTimeOff] = useState<TimeOffRow[]>(initialTimeOff);
  const todayIso = localDateInZone(new Date().toISOString(), tz);
  const [offKind, setOffKind] = useState<OffKind>("repo");
  const [offType, setOffType] = useState<"full" | "partial">("full");
  const [fromDate, setFromDate] = useState(todayIso);
  const [toDate, setToDate] = useState(todayIso);
  const [partialDate, setPartialDate] = useState(todayIso);
  const [fromTime, setFromTime] = useState("09:00");
  const [toTime, setToTime] = useState("14:00");
  const [reason, setReason] = useState("");
  const [offErr, setOffErr] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  // Whether paid leaves/repo/sick are deducted from work hours.
  // Unpaid leave is always deducted (it is never paid).
  const [subtractPaid, setSubtractPaid] = useState(false);

  // ── Stats: work hours (week/month/year) + leave days per type (this year) ──
  const stats = useMemo(() => {
    const toMin = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    const year = Number(todayIso.slice(0, 4));

    // Off-interval minutes that overlap the given day's scheduled windows.
    const offOverlapOnDay = (
      o: TimeOffRow,
      dayIso: string,
      wins: Win[],
    ): number => {
      const [y, mo, d] = dayIso.split("-").map(Number);
      const next = addDaysStr(dayIso, 1).split("-").map(Number);
      const dayStart = zonedTimeToUtc(y, mo, d, 0, 0, tz).getTime();
      const dayEnd = zonedTimeToUtc(next[0], next[1], next[2], 0, 0, tz).getTime();
      const os = Math.max(new Date(o.starts_at).getTime(), dayStart);
      const oe = Math.min(new Date(o.ends_at).getTime(), dayEnd);
      if (oe <= os) return 0;
      const offStart = (os - dayStart) / 60000;
      const offEnd = (oe - dayStart) / 60000;
      let ov = 0;
      for (const w of wins)
        ov += Math.max(
          0,
          Math.min(offEnd, toMin(w.close)) - Math.max(offStart, toMin(w.open)),
        );
      return ov;
    };

    // Net scheduled work minutes over [start, end] (inclusive), minus time-off.
    const periodMinutes = (startIso: string, endIso: string): number => {
      let total = 0;
      for (let d = startIso; d <= endIso; d = addDaysStr(d, 1)) {
        const dow = new Date(`${d}T12:00:00Z`).getUTCDay();
        const wins = days[dow] ?? [];
        if (wins.length === 0) continue;
        let dayMin = wins.reduce(
          (s, w) => s + (toMin(w.close) - toMin(w.open)),
          0,
        );
        for (const o of timeOff) {
          const isPaid = PAID_TYPES.includes(o.type as OffKind);
          if (isPaid && !subtractPaid) continue;
          dayMin -= offOverlapOnDay(o, d, wins);
        }
        if (dayMin > 0) total += dayMin;
      }
      return total;
    };

    // Periods (in tz-local date strings).
    const weekStart = startOfWeekStr(todayIso);
    const weekEnd = addDaysStr(weekStart, 6);
    const monthStart = `${todayIso.slice(0, 7)}-01`;
    const monthDays = new Date(Date.UTC(year, Number(todayIso.slice(5, 7)), 0))
      .getUTCDate();
    const monthEnd = `${todayIso.slice(0, 7)}-${String(monthDays).padStart(2, "0")}`;
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    const hours = (min: number) => Math.round((min / 60) * 10) / 10;
    const work = {
      week: hours(periodMinutes(weekStart, weekEnd)),
      month: hours(periodMinutes(monthStart, monthEnd)),
      year: hours(periodMinutes(yearStart, yearEnd)),
    };

    // Leave days/hours per type for the current calendar year.
    const inYear = (iso: string) => iso.slice(0, 4) === String(year);
    const leave: Record<OffKind, { days: number; hours: number }> = {
      repo: { days: 0, hours: 0 },
      leave: { days: 0, hours: 0 },
      sick: { days: 0, hours: 0 },
      unpaid: { days: 0, hours: 0 },
    };
    for (const o of timeOff) {
      const t = (TYPE_ORDER.includes(o.type as OffKind)
        ? o.type
        : "leave") as OffKind;
      const sMin = minutesFromMidnight(o.starts_at, tz);
      const eMin = minutesFromMidnight(o.ends_at, tz);
      const sDate = localDateInZone(o.starts_at, tz);
      if (sMin === 0 && eMin === 0) {
        const lastDay = addDaysStr(localDateInZone(o.ends_at, tz), -1);
        for (let d = sDate; d <= lastDay; d = addDaysStr(d, 1))
          if (inYear(d)) leave[t].days += 1;
      } else if (inYear(sDate)) {
        leave[t].hours += (eMin - sMin) / 60;
      }
    }
    return { work, leave, year };
  }, [days, timeOff, subtractPaid, todayIso, tz]);

  // ── Weekly hours ──
  const setWin = (dow: number, i: number, key: keyof Win, val: string) =>
    setDays((d) => ({
      ...d,
      [dow]: d[dow].map((w, j) => (j === i ? { ...w, [key]: val } : w)),
    }));
  const addWin = (dow: number) =>
    setDays((d) => ({
      ...d,
      [dow]: [...d[dow], { open: "09:00", close: "17:00" }],
    }));
  const removeWin = (dow: number, i: number) =>
    setDays((d) => ({ ...d, [dow]: d[dow].filter((_, j) => j !== i) }));

  const enableCustom = (on: boolean) => {
    setCustom(on);
    if (on && Object.values(days).every((w) => w.length === 0))
      setDays(bizDays);
  };

  const saveHours = () => {
    setHoursErr(null);
    setSavedHours(false);
    const windows: StaffWindow[] = [];
    if (custom) {
      for (const dow of DOW_ORDER) {
        for (const w of days[dow] ?? []) {
          if (w.open >= w.close) {
            setHoursErr(`${dayNames[dow]}: ${t.endAfterStart}`);
            return;
          }
          windows.push({
            day_of_week: dow,
            open_time: w.open,
            close_time: w.close,
          });
        }
      }
    }
    startTransition(async () => {
      const res = await saveStaffHours(locale, staffId, windows);
      if (!res.ok) {
        setHoursErr(dashErr(dd.errors, res.error, t.error));
        return;
      }
      setSavedHours(true);
    });
  };

  // ── Time off ──
  const fmtRange = (o: TimeOffRow) => {
    const sMin = minutesFromMidnight(o.starts_at, tz);
    const eMin = minutesFromMidnight(o.ends_at, tz);
    const sDate = localDateInZone(o.starts_at, tz);
    const fmtD = (iso: string) =>
      new Intl.DateTimeFormat(locale === "el" ? "el-GR" : "en-GB", {
        day: "numeric",
        month: "short",
      }).format(new Date(`${iso}T12:00:00Z`));
    const fmtT = (m: number) =>
      `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    // Full-day if both ends sit on midnight.
    if (sMin === 0 && eMin === 0) {
      const lastDay = addDaysStr(localDateInZone(o.ends_at, tz), -1);
      if (sDate === lastDay) return fmtD(sDate);
      const nDays = (new Date(`${lastDay}T12:00:00Z`).getTime() -
        new Date(`${sDate}T12:00:00Z`).getTime()) /
        86400000 +
        1;
      return `${fmtD(sDate)} – ${fmtD(lastDay)} · ${nDays} ${t.days}`;
    }
    return `${fmtD(sDate)} · ${fmtT(sMin)}–${fmtT(eMin)}`;
  };

  const submitOff = () => {
    setOffErr(null);
    setWarning(null);
    let startsIso: string;
    let endsIso: string;
    if (offType === "full") {
      if (toDate < fromDate) {
        setOffErr(t.endBeforeStart);
        return;
      }
      const [fy, fm, fd] = fromDate.split("-").map(Number);
      startsIso = zonedTimeToUtc(fy, fm, fd, 0, 0, tz).toISOString();
      const next = addDaysStr(toDate, 1);
      const [ny, nm, nd] = next.split("-").map(Number);
      endsIso = zonedTimeToUtc(ny, nm, nd, 0, 0, tz).toISOString();
    } else {
      if (toTime <= fromTime) {
        setOffErr(t.endTimeAfterStart);
        return;
      }
      const [y, mo, d] = partialDate.split("-").map(Number);
      const [fh, fmin] = fromTime.split(":").map(Number);
      const [th, tmin] = toTime.split(":").map(Number);
      startsIso = zonedTimeToUtc(y, mo, d, fh, fmin, tz).toISOString();
      endsIso = zonedTimeToUtc(y, mo, d, th, tmin, tz).toISOString();
    }
    startTransition(async () => {
      const res = await addTimeOff(
        locale,
        staffId,
        offKind,
        startsIso,
        endsIso,
        reason,
      );
      if (!res.ok || !res.id) {
        setOffErr(dashErr(dd.errors, res.error, t.error));
        return;
      }
      setTimeOff((prev) =>
        [
          {
            id: res.id!,
            type: offKind,
            starts_at: startsIso,
            ends_at: endsIso,
            reason: reason.trim() || null,
          },
          ...prev,
        ].sort((a, b) => b.starts_at.localeCompare(a.starts_at)),
      );
      setReason("");
      if (res.warningCount)
        setWarning(
          t.bookingsInRange.replace("{count}", String(res.warningCount)),
        );
    });
  };

  const removeOff = (id: string) => {
    setTimeOff((prev) => prev.filter((o) => o.id !== id));
    startTransition(() => {
      void deleteTimeOff(locale, staffId, id);
    });
  };

  const inputCls =
    "rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground [color-scheme:dark] transition-[border-color,box-shadow] duration-200 ease-[var(--ease-out)] focus-visible:border-gold focus-visible:outline-none focus-visible:[box-shadow:0_0_0_3px_color-mix(in_srgb,var(--gold)_15%,transparent)]";

  return (
    <div className="space-y-6">
      {/* Summary: work hours + leave stats */}
      <Card>
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
          <BarChart3 className="size-5 text-gold" />
          {t.summary}
        </h3>

        {/* Work hours */}
        <div className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">{t.workHours}</p>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>{t.subtractPaid}</span>
              <Switch
                checked={subtractPaid}
                onChange={setSubtractPaid}
                aria-label={t.subtractPaid}
              />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {(
              [
                [t.week, stats.work.week],
                [t.month, stats.work.month],
                [t.year, stats.work.year],
              ] as const
            ).map(([label, val]) => (
              <div
                key={label}
                className="rounded-xl border border-gold/15 surface-raise px-3 py-3 text-center"
              >
                <p className="text-xs text-muted">{label}</p>
                <p className="mt-1 font-display text-xl font-bold text-gold">
                  {val.toLocaleString(locale === "el" ? "el-GR" : "en-GB")}
                  <span className="ml-1 text-sm font-medium text-muted">
                    {t.hoursUnit}
                  </span>
                </p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            {t.basedOnWeekly}{" "}
            {subtractPaid ? t.subtractAll : t.subtractUnpaidOnly}
          </p>
        </div>

        {/* Leave stats */}
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-sm font-medium text-foreground">
            {t.leavesOfYear} {stats.year}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TYPE_ORDER.map((k) => {
              const s = stats.leave[k];
              return (
                <div
                  key={k}
                  className="rounded-xl border border-border px-3 py-2.5"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn("size-2 rounded-full", TYPE_META[k].dot)}
                    />
                    <span className="text-xs text-muted">
                      {typeLabel[k]}
                    </span>
                  </div>
                  <p className="mt-1 font-display text-lg font-bold text-foreground">
                    {s.days}
                    <span className="ml-1 text-xs font-medium text-muted">
                      {s.days === 1 ? t.day : t.days}
                    </span>
                  </p>
                  {s.hours > 0 && (
                    <p className="text-xs text-muted">
                      + {Math.round(s.hours * 10) / 10}{t.partiallyHours}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Weekly hours */}
      <Card>
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
            <Clock className="size-5 text-gold" />
            {t.weeklyHours}
          </h3>
          <div className="flex items-center gap-2 text-sm text-foreground">
            <span>{t.customLabel}</span>
            <Switch
              checked={custom}
              onChange={enableCustom}
              aria-label={t.customLabel}
            />
          </div>
        </div>

        {!custom ? (
          <p className="mt-3 text-sm text-muted">{t.followsBusiness}</p>
        ) : (
          <div className="mt-4 space-y-2">
            {DOW_ORDER.map((dow) => {
              const wins = days[dow] ?? [];
              return (
                <div
                  key={dow}
                  className="flex flex-wrap items-center gap-2 border-b border-border py-2 last:border-0"
                >
                  <span className="w-24 shrink-0 text-sm font-medium text-foreground">
                    {dayNames[dow]}
                  </span>
                  {wins.length === 0 ? (
                    <span className="text-sm text-muted">{t.dayOff}</span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {wins.map((w, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <input
                            type="time"
                            value={w.open}
                            onChange={(e) =>
                              setWin(dow, i, "open", e.target.value)
                            }
                            className={inputCls}
                          />
                          <span className="text-muted">–</span>
                          <input
                            type="time"
                            value={w.close}
                            onChange={(e) =>
                              setWin(dow, i, "close", e.target.value)
                            }
                            className={inputCls}
                          />
                          <button
                            onClick={() => removeWin(dow, i)}
                            className="grid size-7 place-items-center rounded text-muted transition-[transform,background-color,color] duration-200 ease-[var(--ease-out)] hover:bg-danger/10 hover:text-danger active:scale-95"
                            aria-label={dd.remove}
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => addWin(dow)}
                    className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-gold hover:underline"
                  >
                    <Plus className="size-3.5" />
                    {t.hoursBtn}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {hoursErr && (
          <p className="mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {hoursErr}
          </p>
        )}
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={saveHours} disabled={isPending}>
            {isPending ? dd.saving : t.saveHours}
          </Button>
          {savedHours && (
            <span className="text-sm text-success">{dd.saved} ✓</span>
          )}
        </div>
      </Card>

      {/* Time off */}
      <Card>
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
          <CalendarOff className="size-5 text-gold" />
          {t.leavesTitle}
        </h3>

        {/* Add form */}
        <div className="mt-4 rounded-xl border border-border p-4">
          {/* Type selector */}
          <div className="mb-4 flex flex-wrap gap-2">
            {TYPE_ORDER.map((k) => {
              const active = offKind === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setOffKind(k)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-[transform,background-color,border-color,color] duration-200 ease-[var(--ease-out)] active:scale-95",
                    active
                      ? `${TYPE_META[k].cls} border-transparent`
                      : "border-border text-muted hover:border-gold-soft hover:bg-gold/5 hover:text-foreground",
                  )}
                >
                  <span
                    className={cn("size-2 rounded-full", TYPE_META[k].dot)}
                  />
                  {typeLabel[k]}
                </button>
              );
            })}
          </div>

          <div className="relative inline-grid grid-cols-2 rounded-full border border-border bg-surface p-0.5 text-sm">
            {/* Sliding gold indicator (optimistic — follows the click instantly). */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0.5 left-0.5 rounded-full bg-gold/15 ring-1 ring-inset ring-gold/30 transition-transform duration-300 ease-[var(--ease-out)] [box-shadow:var(--glow-nav)]"
              style={{
                width: "calc((100% - 0.25rem) / 2)",
                transform:
                  offType === "full" ? "translateX(0)" : "translateX(100%)",
              }}
            />
            {(["full", "partial"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setOffType(k)}
                className={cn(
                  "relative z-10 rounded-full px-4 py-1.5 text-center font-medium transition-colors duration-200 ease-[var(--ease-out)]",
                  offType === k ? "text-gold" : "text-muted hover:text-foreground",
                )}
              >
                {k === "full" ? t.fullDays : t.partialHours}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-end gap-3">
            {offType === "full" ? (
              <>
                <label className="text-xs text-muted">
                  {t.from}
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className={`mt-1 block ${inputCls}`}
                  />
                </label>
                <label className="text-xs text-muted">
                  {t.to}
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className={`mt-1 block ${inputCls}`}
                  />
                </label>
              </>
            ) : (
              <>
                <label className="text-xs text-muted">
                  {t.dayLabel}
                  <input
                    type="date"
                    value={partialDate}
                    onChange={(e) => setPartialDate(e.target.value)}
                    className={`mt-1 block ${inputCls}`}
                  />
                </label>
                <label className="text-xs text-muted">
                  {t.from}
                  <input
                    type="time"
                    value={fromTime}
                    onChange={(e) => setFromTime(e.target.value)}
                    className={`mt-1 block ${inputCls}`}
                  />
                </label>
                <label className="text-xs text-muted">
                  {t.to}
                  <input
                    type="time"
                    value={toTime}
                    onChange={(e) => setToTime(e.target.value)}
                    className={`mt-1 block ${inputCls}`}
                  />
                </label>
              </>
            )}
            <label className="min-w-[140px] flex-1 text-xs text-muted">
              {t.reasonOptional}
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t.reasonPlaceholder}
                className={`mt-1 block w-full ${inputCls}`}
              />
            </label>
            <Button onClick={submitOff} disabled={isPending}>
              <Plus />
              {dd.add}
            </Button>
          </div>

          {offErr && (
            <p className="mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {offErr}
            </p>
          )}
          {warning && (
            <p className="mt-3 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {warning}
            </p>
          )}
        </div>

        {/* List */}
        <div className="mt-4 space-y-2">
          {timeOff.length === 0 ? (
            <p className="text-sm text-muted">{t.noLeaves}</p>
          ) : (
            timeOff.map((o, i) => (
              <div
                key={o.id}
                style={{ animationDelay: `${i * 40}ms` }}
                className="animate-rise flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 transition-colors duration-200 ease-[var(--ease-out)] hover:border-gold-soft"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                      TYPE_META[(o.type as OffKind) in TYPE_META
                        ? (o.type as OffKind)
                        : "leave"].cls,
                    )}
                  >
                    {typeLabel[(o.type as OffKind) in TYPE_META
                      ? (o.type as OffKind)
                      : "leave"]}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {fmtRange(o)}
                    </p>
                    {o.reason && (
                      <p className="truncate text-xs text-muted">{o.reason}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeOff(o.id)}
                  disabled={isPending}
                  className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition-[transform,background-color,color] duration-200 ease-[var(--ease-out)] hover:bg-danger/10 hover:text-danger active:scale-95"
                  aria-label={dd.delete}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
