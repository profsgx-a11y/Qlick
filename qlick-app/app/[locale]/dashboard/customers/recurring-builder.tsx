"use client";

import { useState, useTransition, useMemo } from "react";
import { X, CheckCircle2, XCircle, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SelectMenu } from "@/components/ui/select-menu";
import { DatePicker } from "../calendar/date-picker";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { dashErr } from "@/lib/dash-error";
import { formatDateTime } from "@/lib/format";
import {
  previewSeries,
  createSeries,
  type OccurrencePreview,
} from "./recurring-actions";
import type { PatternType } from "@/lib/recurrence";

export interface ServiceOption {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
}
export interface StaffOption {
  id: string;
  name: string;
}

interface Props {
  locale: string;
  tz: string;
  businessCustomerId: string;
  services: ServiceOption[];
  staff: StaffOption[];
  onClose: () => void;
  onCreated: () => void;
}

function todayInZone(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function weekdayOfDate(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

const STATUS_ICON: Record<string, "ok" | "bad"> = {
  ok: "ok",
  closed: "bad",
  busy: "bad",
  past: "bad",
};

export function RecurringBuilder({
  locale,
  tz,
  businessCustomerId,
  services,
  staff,
  onClose,
  onCreated,
}: Props) {
  const d = useDict().dashboard;
  const t = d.customers;
  const tr = t.recurring;

  const today = useMemo(() => todayInZone(tz), [tz]);

  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [staffId, setStaffId] = useState(""); // "" = any
  const [pattern, setPattern] = useState<PatternType>("weekly");
  const [intervalN, setIntervalN] = useState(1);
  const [startDate, setStartDate] = useState(today);
  const [weekday, setWeekday] = useState(weekdayOfDate(today));
  const [nth, setNth] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(Number(today.slice(8, 10)));
  const [time, setTime] = useState("10:00");
  const [count, setCount] = useState(6);

  const [preview, setPreview] = useState<OccurrencePreview[] | null>(null);
  const [previewSig, setPreviewSig] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const rule = {
    businessCustomerId,
    serviceId,
    staffId: staffId || null,
    patternType: pattern,
    intervalN,
    weekday: pattern === "monthly_dom" ? null : weekday,
    nth: pattern === "monthly_nth_dow" ? nth : null,
    dayOfMonth: pattern === "monthly_dom" ? dayOfMonth : null,
    timeOfDay: time,
    startDate,
    count,
  };

  // A shown preview goes stale as soon as any rule input changes.
  const sig = JSON.stringify(rule);
  const showPreview = preview !== null && previewSig === sig;

  const runPreview = () => {
    setError(null);
    if (!serviceId) {
      setError(dashErr(d.errors, "invalid_service", d.genericError));
      return;
    }
    startTransition(async () => {
      const res = await previewSeries(rule);
      if (!res.ok) {
        setError(dashErr(d.errors, res.error, d.genericError));
        return;
      }
      const occ = res.occurrences ?? [];
      setPreview(occ);
      setPreviewSig(sig);
      setSelected(
        new Set(occ.filter((o) => o.status === "ok").map((o) => o.startIso)),
      );
    });
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await createSeries(locale, {
        ...rule,
        selectedIsos: [...selected],
      });
      if (!res.ok) {
        setError(dashErr(d.errors, res.error, d.genericError));
        return;
      }
      setResult({ created: res.created ?? 0, skipped: res.skipped ?? 0 });
      onCreated();
    });
  };

  const toggle = (iso: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
  };

  const weekdayOptions = (tr.weekdays as string[]).map((label, i) => ({
    value: String(i),
    label,
  }));
  const nthOptions = (tr.nthOptions as string[]).map((label, i) => ({
    value: i === 5 ? "-1" : String(i + 1),
    label,
  }));

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-[90] flex max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="inline-flex items-center gap-2 font-display text-lg font-bold text-foreground">
            <Repeat className="size-5 text-gold" />
            {tr.title}
          </h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground"
            aria-label={d.close}
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {result ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto size-12 text-success" />
              <p className="text-foreground">
                {tr.resultCreated.replace("{n}", String(result.created))}
                {result.skipped > 0
                  ? " " + tr.resultSkipped.replace("{n}", String(result.skipped))
                  : ""}
              </p>
              <Button onClick={onClose}>{d.close}</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={tr.service} htmlFor="rec-service">
                  <SelectMenu
                    id="rec-service"
                    value={serviceId}
                    onChange={setServiceId}
                    disabled={isPending}
                    options={services.map((s) => ({
                      value: s.id,
                      label: s.name,
                    }))}
                  />
                </Field>
                <Field label={tr.staff} htmlFor="rec-staff">
                  <SelectMenu
                    id="rec-staff"
                    value={staffId}
                    onChange={setStaffId}
                    disabled={isPending}
                    options={[
                      { value: "", label: tr.anyStaff },
                      ...staff.map((s) => ({ value: s.id, label: s.name })),
                    ]}
                  />
                </Field>
              </div>

              <Field label={tr.pattern} htmlFor="rec-pattern">
                <SelectMenu
                  id="rec-pattern"
                  value={pattern}
                  onChange={(v) => setPattern(v as PatternType)}
                  disabled={isPending}
                  options={[
                    { value: "weekly", label: tr.patternWeekly },
                    { value: "monthly_dom", label: tr.patternMonthlyDom },
                    { value: "monthly_nth_dow", label: tr.patternMonthlyNth },
                  ]}
                />
              </Field>

              {/* Pattern-specific controls */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={
                    pattern === "weekly" ? tr.everyWeeks : tr.everyMonths
                  }
                  htmlFor="rec-interval"
                >
                  <Input
                    id="rec-interval"
                    type="number"
                    min={1}
                    max={12}
                    value={intervalN}
                    onChange={(e) =>
                      setIntervalN(Math.max(1, Number(e.target.value) || 1))
                    }
                    disabled={isPending}
                  />
                </Field>

                {pattern !== "monthly_dom" && (
                  <Field label={tr.weekday} htmlFor="rec-weekday">
                    <SelectMenu
                      id="rec-weekday"
                      value={String(weekday)}
                      onChange={(v) => setWeekday(Number(v))}
                      disabled={isPending}
                      options={weekdayOptions}
                    />
                  </Field>
                )}

                {pattern === "monthly_nth_dow" && (
                  <Field label={tr.which} htmlFor="rec-nth">
                    <SelectMenu
                      id="rec-nth"
                      value={String(nth)}
                      onChange={(v) => setNth(Number(v))}
                      disabled={isPending}
                      options={nthOptions}
                    />
                  </Field>
                )}

                {pattern === "monthly_dom" && (
                  <Field label={tr.dayOfMonth} htmlFor="rec-dom">
                    <Input
                      id="rec-dom"
                      type="number"
                      min={1}
                      max={31}
                      value={dayOfMonth}
                      onChange={(e) =>
                        setDayOfMonth(
                          Math.min(31, Math.max(1, Number(e.target.value) || 1)),
                        )
                      }
                      disabled={isPending}
                    />
                  </Field>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label={tr.time} htmlFor="rec-time">
                  <Input
                    id="rec-time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    disabled={isPending}
                  />
                </Field>
                <Field label={tr.startFrom} htmlFor="rec-start">
                  <DatePicker
                    value={startDate}
                    today={today}
                    locale={locale}
                    todayLabel={tr.today}
                    prevLabel={tr.prevMonth}
                    nextLabel={tr.nextMonth}
                    onSelect={setStartDate}
                  />
                </Field>
                <Field label={tr.howMany} htmlFor="rec-count">
                  <Input
                    id="rec-count"
                    type="number"
                    min={1}
                    max={12}
                    value={count}
                    onChange={(e) =>
                      setCount(
                        Math.min(12, Math.max(1, Number(e.target.value) || 1)),
                      )
                    }
                    disabled={isPending}
                  />
                </Field>
              </div>

              {error && (
                <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {error}
                </p>
              )}

              {!showPreview ? (
                <Button onClick={runPreview} disabled={isPending} className="w-full">
                  {isPending ? tr.previewing : tr.preview}
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">
                    {tr.occurrencesTitle}
                  </p>
                  {preview.length === 0 ? (
                    <p className="text-sm text-muted">{tr.noneComputed}</p>
                  ) : (
                    <div className="space-y-1.5">
                      {preview.map((o) => {
                        const ok = o.status === "ok";
                        const checked = selected.has(o.startIso);
                        return (
                          <label
                            key={o.startIso}
                            className={cn(
                              "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm",
                              ok
                                ? "cursor-pointer border-border bg-surface-2/30"
                                : "border-danger/20 bg-danger/5 opacity-80",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!ok || isPending}
                              onChange={() => toggle(o.startIso)}
                              className="size-4 accent-gold"
                            />
                            {STATUS_ICON[o.status] === "ok" ? (
                              <CheckCircle2 className="size-4 shrink-0 text-success" />
                            ) : (
                              <XCircle className="size-4 shrink-0 text-danger" />
                            )}
                            <span className="flex-1 text-foreground">
                              {formatDateTime(o.startIso, tz, locale)}
                            </span>
                            {!ok && (
                              <span className="text-xs text-danger">
                                {(tr.status as Record<string, string>)[o.status] ??
                                  o.status}
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <Button
                      onClick={submit}
                      disabled={isPending || selected.size === 0}
                    >
                      {isPending
                        ? tr.creating
                        : tr.createN.replace("{n}", String(selected.size))}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setPreview(null)}
                      disabled={isPending}
                    >
                      {d.back}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
