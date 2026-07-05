"use client";

import { useState, useRef, useTransition } from "react";
import { GripVertical, Check, Loader2, Plus, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TimeSelect } from "@/components/ui/time-select";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { dashErr } from "@/lib/dash-error";
import { saveHours, type DayHoursInput } from "./actions";

export function HoursEditor({
  locale,
  initialDays,
}: {
  locale: string;
  initialDays: DayHoursInput[];
}) {
  const dict = useDict();
  const s = dict.dashboard.settings;
  const dd = dict.dashboard;
  const dayNames = dict.shop.days;
  const [days, setDays] = useState<DayHoursInput[]>(initialDays);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragFrom = useRef<number | null>(null);
  const [, startTransition] = useTransition();

  const patch = (i: number, p: Partial<DayHoursInput>) => {
    setDays((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...p } : d)));
    setSaved(false);
  };

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    setDays((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setSaved(false);
  };

  const save = () => {
    setError(null);
    setSaving(true);
    startTransition(async () => {
      const res = await saveHours(locale, days);
      setSaving(false);
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(dashErr(dd.errors, res.error, s.saveFailed));
      }
    });
  };

  return (
    <Card className="max-w-2xl">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">
          {s.hoursTitle}
        </h3>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : saved ? (
            <Check className="size-4" />
          ) : null}
          {saved ? dd.saved : dd.save}
        </Button>
      </div>
      <p className="mb-4 flex items-center gap-1 text-xs text-muted-2">
        <GripVertical className="inline size-3" /> {s.dragHint}
      </p>

      <div className="space-y-2">
        {days.map((d, i) => (
          <div
            key={d.day_of_week}
            draggable
            style={{ animationDelay: `${i * 40}ms` }}
            onDragStart={() => {
              dragFrom.current = i;
              setDragIndex(i);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setOverIndex(i);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragFrom.current !== null) reorder(dragFrom.current, i);
              dragFrom.current = null;
              setDragIndex(null);
              setOverIndex(null);
            }}
            onDragEnd={() => {
              dragFrom.current = null;
              setDragIndex(null);
              setOverIndex(null);
            }}
            className={cn(
              "animate-rise rounded-lg border bg-surface px-2 py-2 transition-colors",
              dragIndex === i
                ? "border-gold opacity-50"
                : overIndex === i
                ? "border-gold-soft"
                : "border-border",
            )}
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <span className="cursor-grab text-muted-2 active:cursor-grabbing">
                <GripVertical className="size-4" />
              </span>
              <span className="w-[88px] shrink-0 text-xs font-semibold uppercase tracking-wide text-foreground">
                {dayNames[d.day_of_week]}
              </span>

              {/* Closed label — only when closed, stays on same line as day name */}
              {d.is_closed && (
                <span className="flex-1 text-xs italic text-muted">{s.closed}</span>
              )}

              {/* Open/closed toggle — comes before time selects in DOM so it stays
                  on line 1 on mobile; sm:order-last pushes it after them on desktop */}
              <Switch
                checked={!d.is_closed}
                onChange={(v) => patch(i, { is_closed: !v })}
                title={d.is_closed ? s.open : s.closed}
                aria-label={d.is_closed ? s.open : s.closed}
                className="ml-auto sm:order-last"
              />

              {/* Time selects — w-full on mobile wraps to its own line (below grip+day+button);
                  sm: becomes flex-1 and joins the single row */}
              {!d.is_closed && (
                <div className="flex w-full items-center gap-2 pl-6 sm:w-auto sm:flex-1 sm:pl-0">
                  <TimeSelect
                    value={d.open_time ?? "09:00"}
                    onChange={(v) => patch(i, { open_time: v })}
                  />
                  <span className="text-muted-2">—</span>
                  <TimeSelect
                    value={d.close_time ?? "18:00"}
                    onChange={(v) => patch(i, { close_time: v })}
                  />
                </div>
              )}
            </div>

            {/* Afternoon shift */}
            {!d.is_closed && (
              <div className="mt-2 pl-6 sm:pl-[112px]">
                {d.open_time2 != null ? (
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-[10px] uppercase text-muted-2">
                      {s.afternoon}
                    </span>
                    <TimeSelect
                      value={d.open_time2 ?? "18:00"}
                      onChange={(v) => patch(i, { open_time2: v })}
                    />
                    <span className="text-muted-2">—</span>
                    <TimeSelect
                      value={d.close_time2 ?? "21:00"}
                      onChange={(v) => patch(i, { close_time2: v })}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        patch(i, { open_time2: null, close_time2: null })
                      }
                      className="grid size-7 place-items-center rounded text-muted transition-[transform,background-color,color] duration-200 ease-[var(--ease-out)] hover:bg-danger/10 hover:text-danger active:scale-95"
                      title={s.remove}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      patch(i, { open_time2: "18:00", close_time2: "21:00" })
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-gold hover:underline"
                  >
                    <Plus className="size-3" /> {s.addAfternoon}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
    </Card>
  );
}
