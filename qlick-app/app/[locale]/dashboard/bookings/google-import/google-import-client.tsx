"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  Download,
  EyeOff,
  Loader2,
  Settings2,
  Sparkles,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectMenu, type SelectOption } from "@/components/ui/select-menu";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { dashErr } from "@/lib/dash-error";
import {
  ignoreGoogleEvents,
  importGoogleEvents,
  listGoogleImportEvents,
} from "./actions";

export interface GcalImportConnection {
  id: string;
  googleEmail: string;
  calendarSummary: string | null;
  needsSetup: boolean;
}

type Step = "pick" | "preview" | "done";
type Mode = "smart" | "single";

interface RowState {
  eventId: string;
  summary: string;
  startsAtIso: string;
  googleMinutes: number;
  checked: boolean;
  serviceId: string;
  durationMinutes: number;
  staffId: string; // "" = unassigned
}

export function GoogleImportClient({
  locale,
  connections,
  services,
  staff,
  autoPrompt = false,
}: {
  locale: string;
  connections: GcalImportConnection[];
  services: { id: string; name: string; durationMinutes: number }[];
  staff: { id: string; name: string }[];
  autoPrompt?: boolean;
}) {
  const dict = useDict().dashboard;
  const t = dict.gcal;
  const router = useRouter();
  const hasStaff = staff.length > 0;

  const [connectionId, setConnectionId] = useState(connections[0]?.id ?? "");
  const [mode, setMode] = useState<Mode>("smart");
  const [singleStaffId, setSingleStaffId] = useState(staff[0]?.id ?? "");
  const [defaultServiceId, setDefaultServiceId] = useState("");
  const [step, setStep] = useState<Step>("pick");
  const [rows, setRows] = useState<RowState[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; duplicates: number } | null>(
    null,
  );
  const [confirmIgnore, setConfirmIgnore] = useState(false);
  const [loading, startLoading] = useTransition();
  const [importing, startImporting] = useTransition();
  const [ignoring, startIgnoring] = useTransition();

  const conn = connections.find((c) => c.id === connectionId) ?? connections[0];
  const serviceDur = useMemo(
    () => new Map(services.map((s) => [s.id, s.durationMinutes])),
    [services],
  );

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
  const staffOptions: SelectOption[] = staff.map((s) => ({
    value: s.id,
    label: s.name,
  }));
  const rowStaffOptions: SelectOption[] = [
    { value: "", label: t.importUnassigned },
    ...staffOptions,
  ];

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

  const checkedCount = rows.filter((r) => r.checked).length;

  const patchRow = (id: string, patch: Partial<RowState>) =>
    setRows((prev) => prev.map((r) => (r.eventId === id ? { ...r, ...patch } : r)));

  // Switching to "all to one" fills every row with that person; individual
  // rows can still be changed afterwards.
  const applyMode = (m: Mode) => {
    setMode(m);
    if (m === "single" && singleStaffId) {
      setRows((prev) => prev.map((r) => ({ ...r, staffId: singleStaffId })));
    }
  };
  const applySingleStaff = (id: string) => {
    setSingleStaffId(id);
    if (mode === "single") {
      setRows((prev) => prev.map((r) => ({ ...r, staffId: id })));
    }
  };

  const load = (svcOverride?: string) =>
    startLoading(async () => {
      setErr(null);
      const svcId = svcOverride || defaultServiceId;
      if (!svcId) {
        setErr(t.importSelectService);
        return;
      }
      if (mode === "single" && hasStaff && !singleStaffId) {
        setErr(t.importSelectStaff);
        return;
      }
      const res = await listGoogleImportEvents(connectionId, {
        mode,
        serviceId: svcId,
      });
      if (!res.ok || !res.events) {
        setErr(dashErr(dict.errors, res.error, t.saveFailed));
        return;
      }
      const dur = serviceDur.get(svcId) ?? 30;
      const suggestions = res.suggestions ?? {};
      setRows(
        res.events.map((e) => ({
          eventId: e.gcalEventId,
          summary: e.summary,
          startsAtIso: e.startsAtIso,
          googleMinutes: e.durationMinutes,
          checked: true,
          serviceId: svcId,
          durationMinutes: dur,
          staffId:
            mode === "single" ? singleStaffId : suggestions[e.gcalEventId] ?? "",
        })),
      );
      setStep("preview");
    });

  // Arriving from a "Sync" that found unregistered events → auto-load once so
  // the owner immediately sees the "found appointments" prompt.
  const autoRef = useRef(false);
  useEffect(() => {
    if (autoRef.current || !autoPrompt) return;
    if (!conn || conn.needsSetup || services.length === 0) return;
    autoRef.current = true;
    if (!defaultServiceId) setDefaultServiceId(services[0].id);
    load(defaultServiceId || services[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ignoreAll = () =>
    startIgnoring(async () => {
      setErr(null);
      const res = await ignoreGoogleEvents(
        connectionId,
        rows.map((r) => r.eventId),
      );
      if (!res.ok) {
        setErr(dashErr(dict.errors, res.error, t.saveFailed));
        return;
      }
      router.push(`/${locale}/dashboard/bookings`);
    });

  // Ignore a single appointment: never offer it again, drop it from the list.
  const ignoreOne = (eventId: string) =>
    startIgnoring(async () => {
      setErr(null);
      const res = await ignoreGoogleEvents(connectionId, [eventId]);
      if (!res.ok) {
        setErr(dashErr(dict.errors, res.error, t.saveFailed));
        return;
      }
      setRows((prev) => prev.filter((r) => r.eventId !== eventId));
    });

  const toggleAll = () =>
    setRows((prev) => {
      const allOn = prev.every((r) => r.checked);
      return prev.map((r) => ({ ...r, checked: !allOn }));
    });

  const runImport = () =>
    startImporting(async () => {
      setErr(null);
      const chosen = rows.filter((r) => r.checked);
      if (chosen.length === 0) {
        setErr(t.importNothing);
        return;
      }
      const res = await importGoogleEvents(locale, connectionId, {
        rows: chosen.map((r) => ({
          eventId: r.eventId,
          serviceId: r.serviceId,
          staffId: r.staffId || null,
          durationMinutes: r.durationMinutes,
        })),
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
              setRows([]);
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
            value={defaultServiceId}
            onChange={setDefaultServiceId}
            options={serviceOptions}
            className="w-full"
            ariaLabel={t.importDefaultService}
            placeholder={t.importSelectService}
          />
          <p className="mt-1.5 text-xs text-muted">{t.importDefaultServiceHint}</p>
        </div>
      </div>

      {/* Staff assignment mode */}
      {hasStaff && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
            {t.importMode}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-full border border-border bg-background p-0.5 text-sm">
              <button
                type="button"
                onClick={() => applyMode("smart")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-medium transition-colors",
                  mode === "smart"
                    ? "bg-gold text-black"
                    : "text-muted hover:text-foreground",
                )}
              >
                <Sparkles className="size-3.5" />
                {t.importModeSmart}
              </button>
              <button
                type="button"
                onClick={() => applyMode("single")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-medium transition-colors",
                  mode === "single"
                    ? "bg-gold text-black"
                    : "text-muted hover:text-foreground",
                )}
              >
                <User className="size-3.5" />
                {t.importModeSingle}
              </button>
            </div>
            {mode === "single" && (
              <SelectMenu
                value={singleStaffId}
                onChange={applySingleStaff}
                options={staffOptions}
                className="min-w-[180px]"
                ariaLabel={t.importSingleStaff}
                placeholder={t.importSelectStaff}
              />
            )}
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {mode === "smart" ? t.importModeSmartHint : t.importModeSingleHint}
          </p>
        </div>
      )}

      {conn?.needsSetup ? (
        <p className="mt-4 rounded-xl border border-gold/30 bg-gold/10 px-4 py-2.5 text-sm text-gold">
          {t.importNeedsSetup}
        </p>
      ) : step === "pick" ? (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={() => load()} disabled={loading}>
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {loading ? t.importLoading : t.importLoad}
          </Button>
          <p className="text-xs text-muted">{t.importRange}</p>
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-5 text-sm text-muted">{t.importEmpty}</p>
      ) : (
        <>
          {autoPrompt && (
            <p className="mt-5 rounded-xl border border-gold/30 bg-gold/10 px-4 py-2.5 text-sm text-gold">
              {t.importPromptBanner.replace("{n}", String(rows.length))}
            </p>
          )}
          <p className="mt-3 text-xs text-muted">{t.importRowsHint}</p>
          <div className="mt-2 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border bg-background text-left text-xs uppercase tracking-wide text-muted">
                  <th className="w-10 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={rows.every((r) => r.checked)}
                      onChange={toggleAll}
                      className="size-4 accent-gold"
                      aria-label={t.importColTitle}
                    />
                  </th>
                  <th className="px-3 py-2.5 font-medium">{t.importColWhen}</th>
                  <th className="px-3 py-2.5 font-medium">{t.importColTitle}</th>
                  <th className="px-3 py-2.5 font-medium">{t.importColService}</th>
                  <th className="px-3 py-2.5 font-medium">{t.importColDuration}</th>
                  <th className="px-3 py-2.5 font-medium">{t.importColStaff}</th>
                  <th className="w-10 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.eventId}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="px-3 py-2.5 align-top">
                      <input
                        type="checkbox"
                        checked={r.checked}
                        onChange={() => patchRow(r.eventId, { checked: !r.checked })}
                        className="mt-1 size-4 accent-gold"
                        aria-label={r.summary || t.importColTitle}
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 align-top text-foreground">
                      {fmtWhen(r.startsAtIso)}
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-2.5 align-top text-foreground">
                      {r.summary || "—"}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <SelectMenu
                        value={r.serviceId}
                        onChange={(v) =>
                          patchRow(r.eventId, {
                            serviceId: v,
                            durationMinutes: serviceDur.get(v) ?? r.durationMinutes,
                          })
                        }
                        options={serviceOptions}
                        className="min-w-[150px]"
                        ariaLabel={t.importColService}
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 align-top">
                      <input
                        type="number"
                        min={5}
                        max={1440}
                        step={5}
                        value={r.durationMinutes}
                        onChange={(e) =>
                          patchRow(r.eventId, {
                            durationMinutes: Number(e.target.value),
                          })
                        }
                        className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-gold/50 focus:outline-none"
                        aria-label={t.importColDuration}
                      />
                      <span className="mt-1 block text-[11px] text-muted">
                        {t.importGoogleDuration.replace("{n}", String(r.googleMinutes))}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <SelectMenu
                        value={r.staffId}
                        onChange={(v) => patchRow(r.eventId, { staffId: v })}
                        options={rowStaffOptions}
                        className="min-w-[150px]"
                        ariaLabel={t.importColStaff}
                      />
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <button
                        type="button"
                        onClick={() => ignoreOne(r.eventId)}
                        disabled={ignoring}
                        title={t.importIgnoreRow}
                        aria-label={t.importIgnoreRow}
                        className="mt-1 rounded-lg p-1.5 text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                      >
                        <EyeOff className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {err && <p className="mt-3 text-sm text-danger">{err}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button onClick={runImport} disabled={importing || checkedCount === 0}>
              {importing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              {importing
                ? t.importWorking
                : t.importRun.replace("{n}", String(checkedCount))}
            </Button>
            {!confirmIgnore ? (
              <Button
                variant="ghost"
                onClick={() => setConfirmIgnore(true)}
                disabled={importing || ignoring}
                className="text-muted hover:text-danger"
              >
                {t.importIgnoreCta}
              </Button>
            ) : (
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted">{t.importIgnoreConfirm}</span>
                <Button variant="danger" onClick={ignoreAll} disabled={ignoring}>
                  {ignoring ? t.importWorking : t.importIgnoreYes}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setConfirmIgnore(false)}
                  disabled={ignoring}
                >
                  {t.cancel}
                </Button>
              </span>
            )}
            <p className="text-xs text-muted">
              {t.importCount.replace("{n}", String(checkedCount))}
            </p>
          </div>
        </>
      )}

      {step === "pick" && err && <p className="mt-3 text-sm text-danger">{err}</p>}
    </section>
  );
}
