"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  Download,
  Loader2,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectMenu, type SelectOption } from "@/components/ui/select-menu";
import { useDict } from "@/i18n/provider";
import { dashErr } from "@/lib/dash-error";
import type { ImportableEvent } from "@/lib/google/mapping";
import { importGoogleEvents, listGoogleImportEvents } from "./actions";

export interface GcalImportConnection {
  id: string;
  googleEmail: string;
  calendarSummary: string | null;
  needsSetup: boolean;
}

type Step = "pick" | "preview" | "done";

export function GoogleImportClient({
  locale,
  connections,
  services,
}: {
  locale: string;
  connections: GcalImportConnection[];
  services: { id: string; name: string }[];
}) {
  const dict = useDict().dashboard;
  const t = dict.gcal;

  const [connectionId, setConnectionId] = useState(connections[0]?.id ?? "");
  const [step, setStep] = useState<Step>("pick");
  const [events, setEvents] = useState<ImportableEvent[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [serviceId, setServiceId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; duplicates: number } | null>(
    null,
  );
  const [loading, startLoading] = useTransition();
  const [importing, startImporting] = useTransition();

  const conn = connections.find((c) => c.id === connectionId) ?? connections[0];

  const connectionOptions: SelectOption[] = connections.map((c) => ({
    value: c.id,
    label: c.calendarSummary
      ? `${c.googleEmail} · ${c.calendarSummary}`
      : c.googleEmail,
  }));
  const serviceOptions: SelectOption[] = services.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  const fmtWhen = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "el-GR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    return (iso: string) => fmt.format(new Date(iso));
  }, [locale]);

  const load = () =>
    startLoading(async () => {
      setErr(null);
      const res = await listGoogleImportEvents(connectionId);
      if (!res.ok || !res.events) {
        setErr(dashErr(dict.errors, res.error, t.saveFailed));
        return;
      }
      setEvents(res.events);
      setChecked(new Set(res.events.map((e) => e.gcalEventId)));
      setStep("preview");
    });

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setChecked((prev) =>
      prev.size === events.length
        ? new Set()
        : new Set(events.map((e) => e.gcalEventId)),
    );
  };

  const runImport = () =>
    startImporting(async () => {
      setErr(null);
      if (checked.size === 0) {
        setErr(t.importNothing);
        return;
      }
      if (!serviceId) {
        setErr(t.importSelectService);
        return;
      }
      const res = await importGoogleEvents(locale, connectionId, {
        serviceId,
        eventIds: [...checked],
      });
      if (!res.ok) {
        setErr(dashErr(dict.errors, res.error, t.saveFailed));
        return;
      }
      setResult({ imported: res.imported ?? 0, duplicates: res.duplicates ?? 0 });
      setStep("done");
    });

  if (step === "done" && result) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full border border-gold/30 bg-gold/10">
            <Check className="size-5 text-gold" />
          </span>
          <h2 className="font-display text-lg font-semibold text-foreground">
            {result.duplicates > 0
              ? t.importDoneDupes
                  .replace("{n}", String(result.imported))
                  .replace("{dupes}", String(result.duplicates))
              : t.importDone.replace("{n}", String(result.imported))}
          </h2>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          {t.importNote}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild>
            <Link href={`/${locale}/dashboard/calendar`}>
              <CalendarDays className="size-4" />
              {t.importGoCalendar}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/${locale}/dashboard/settings#google-calendar`}>
              <Settings2 className="size-4" />
              {t.importGoSettings}
            </Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
            {t.importConnection}
          </p>
          <SelectMenu
            value={connectionId}
            onChange={(v) => {
              setConnectionId(v);
              setStep("pick");
              setEvents([]);
            }}
            options={connectionOptions}
            className="w-full"
            ariaLabel={t.importConnection}
            disabled={connections.length < 2}
          />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
            {t.importDefaultService}
          </p>
          <SelectMenu
            value={serviceId}
            onChange={setServiceId}
            options={serviceOptions}
            className="w-full"
            ariaLabel={t.importDefaultService}
            placeholder={t.importSelectService}
          />
          <p className="mt-1.5 text-xs text-muted">{t.importDefaultServiceHint}</p>
        </div>
      </div>

      {conn?.needsSetup ? (
        <p className="mt-4 rounded-xl border border-gold/30 bg-gold/10 px-4 py-2.5 text-sm text-gold">
          {t.importNeedsSetup}
        </p>
      ) : step === "pick" ? (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={load} disabled={loading}>
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {loading ? t.importLoading : t.importLoad}
          </Button>
          <p className="text-xs text-muted">{t.importRange}</p>
        </div>
      ) : events.length === 0 ? (
        <p className="mt-5 text-sm text-muted">{t.importEmpty}</p>
      ) : (
        <>
          <div className="mt-5 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border bg-background text-left text-xs uppercase tracking-wide text-muted">
                  <th className="w-10 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={checked.size === events.length}
                      onChange={toggleAll}
                      className="size-4 accent-gold"
                      aria-label={t.importColTitle}
                    />
                  </th>
                  <th className="px-3 py-2.5 font-medium">{t.importColWhen}</th>
                  <th className="px-3 py-2.5 font-medium">{t.importColTitle}</th>
                  <th className="px-3 py-2.5 font-medium">{t.importColDuration}</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr
                    key={e.gcalEventId}
                    className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-background"
                    onClick={() => toggle(e.gcalEventId)}
                  >
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={checked.has(e.gcalEventId)}
                        onChange={() => toggle(e.gcalEventId)}
                        onClick={(ev) => ev.stopPropagation()}
                        className="size-4 accent-gold"
                        aria-label={e.summary || t.importColTitle}
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-foreground">
                      {fmtWhen(e.startsAtIso)}
                    </td>
                    <td className="max-w-[280px] truncate px-3 py-2.5 text-foreground">
                      {e.summary || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted">
                      {e.durationMinutes}′
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {err && <p className="mt-3 text-sm text-danger">{err}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button onClick={runImport} disabled={importing || checked.size === 0}>
              {importing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              {importing
                ? t.importWorking
                : t.importRun.replace("{n}", String(checked.size))}
            </Button>
            <p className="text-xs text-muted">
              {t.importCount.replace("{n}", String(checked.size))}
            </p>
          </div>
        </>
      )}

      {step === "pick" && err && <p className="mt-3 text-sm text-danger">{err}</p>}
    </section>
  );
}
