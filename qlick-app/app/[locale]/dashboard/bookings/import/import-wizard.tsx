"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  Download,
  Upload,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  CalendarDays,
  Users,
  RotateCcw,
  Info,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectMenu } from "@/components/ui/select-menu";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { dashErr } from "@/lib/dash-error";
import type {
  ParsedRow,
  UnknownText,
  RowProblem,
} from "@/lib/booking-import";
import { parseImportFile, importBookings, type ImportResult } from "./actions";

interface CatalogItem {
  id: string;
  name: string;
}

interface Props {
  locale: string;
  services: CatalogItem[];
  staff: CatalogItem[];
}

type Phase = "upload" | "preview" | "done";

const PREVIEW_LIMIT = 50;
const DURATION_OPTIONS = ["15", "20", "30", "45", "60", "90", "120"];

function fill(template: string, n: number): string {
  return template.replace("{n}", String(n));
}

export function ImportWizard({ locale, services, staff }: Props) {
  const dict = useDict().dashboard;
  const t = dict.import;

  const [phase, setPhase] = useState<Phase>("upload");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [unknownServices, setUnknownServices] = useState<UnknownText[]>([]);
  const [unknownStaff, setUnknownStaff] = useState<UnknownText[]>([]);
  const [needsDuration, setNeedsDuration] = useState(false);
  const [svcMap, setSvcMap] = useState<Record<string, string>>({});
  const [staffMap, setStaffMap] = useState<Record<string, string>>({});
  const [defaultDuration, setDefaultDuration] = useState("30");
  const [result, setResult] = useState<ImportResult | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const PROBLEM_LABEL: Record<RowProblem, string> = {
    bad_date: t.problemBadDate,
    bad_time: t.problemBadTime,
    missing_name: t.problemMissingName,
    bad_phone: t.problemBadPhone,
    unknown_service: t.problemUnknownService,
    unknown_staff: t.problemUnknownStaff,
    duplicate_in_file: t.problemDuplicateInFile,
  };

  const importable = rows.filter(
    (r) => r.startsAtIso && !r.problems.includes("duplicate_in_file"),
  );
  const warnCount = importable.filter((r) => r.problems.length > 0).length;
  const skipCount = rows.length - importable.length;

  const reset = () => {
    setPhase("upload");
    setRows([]);
    setUnknownServices([]);
    setUnknownStaff([]);
    setSvcMap({});
    setStaffMap({});
    setNeedsDuration(false);
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = async (file: File | undefined | null) => {
    if (!file || busy) return;
    setError(null);
    if (!/\.xlsx$/i.test(file.name)) {
      setError(dashErr(dict.errors, "file_type", dict.genericError));
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError(dashErr(dict.errors, "file_too_large", dict.genericError));
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await parseImportFile(fd);
      if (!res.ok || !res.rows) {
        setError(dashErr(dict.errors, res.error, dict.genericError));
        return;
      }
      setRows(res.rows);
      setUnknownServices(res.unknownServices ?? []);
      setUnknownStaff(res.unknownStaff ?? []);
      setNeedsDuration(!!res.needsDefaultDuration);
      setSvcMap({});
      setStaffMap({});
      setPhase("preview");
    } catch {
      setError(dashErr(dict.errors, "file_unreadable", dict.genericError));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleImport = async () => {
    if (busy || importable.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      const res = await importBookings({
        locale,
        rows,
        mappings: { services: svcMap, staff: staffMap },
        defaultDurationMin: Number(defaultDuration),
      });
      if (!res.ok) {
        setError(dashErr(dict.errors, res.error, dict.genericError));
        return;
      }
      setResult(res);
      setPhase("done");
    } catch {
      setError(dashErr(dict.errors, "import_failed", dict.genericError));
    } finally {
      setBusy(false);
    }
  };

  // ── Shared bits ──────────────────────────────────────────────
  const errorBanner = error && (
    <div className="animate-rise flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{error}</span>
    </div>
  );

  // ── Phase: done ──────────────────────────────────────────────
  if (phase === "done" && result) {
    const lines: string[] = [fill(t.doneImported, result.imported ?? 0)];
    if (result.duplicates) lines.push(fill(t.doneDuplicates, result.duplicates));
    if (result.skipped) lines.push(fill(t.doneSkipped, result.skipped));
    if (result.customersCreated)
      lines.push(fill(t.doneCustomers, result.customersCreated));

    return (
      <div className="animate-rise elev-card relative mx-auto max-w-xl overflow-hidden rounded-2xl border border-border bg-surface px-6 py-12 text-center">
        <div
          aria-hidden
          className="glow-gold pointer-events-none absolute inset-x-0 top-0 h-32 opacity-70"
        />
        <div className="relative flex flex-col items-center">
          <span className="grid size-16 place-items-center rounded-full bg-success/10 text-success ring-2 ring-success/30 [box-shadow:0_0_28px_-6px_var(--gold-glow)]">
            <CheckCircle2 className="size-8" />
          </span>
          <h2 className="mt-5 font-display text-2xl font-bold text-foreground">
            {t.doneTitle}
          </h2>
          <ul className="mt-4 space-y-1.5 text-sm text-muted">
            {lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild>
              <Link href={`/${locale}/dashboard/calendar`}>
                <CalendarDays />
                {t.goCalendar}
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/${locale}/dashboard/customers`}>
                <Users />
                {t.goCustomers}
              </Link>
            </Button>
            <Button variant="ghost" onClick={reset}>
              <RotateCcw />
              {t.importMore}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Phase: preview ───────────────────────────────────────────
  if (phase === "preview") {
    const stats = [
      {
        label: t.statReady,
        value: importable.length - warnCount,
        cls: "text-success",
      },
      { label: t.statWarnings, value: warnCount, cls: "text-warning" },
      { label: t.statSkipped, value: skipCount, cls: "text-danger" },
    ];
    const svcOptions = [
      { value: "", label: t.mapAsText },
      ...services.map((s) => ({ value: s.id, label: s.name })),
    ];
    const staffOptions = [
      { value: "", label: t.mapUnassigned },
      ...staff.map((s) => ({ value: s.id, label: s.name })),
    ];
    const shown = rows.slice(0, PREVIEW_LIMIT);

    return (
      <div className="space-y-5">
        {errorBanner}

        {/* Counters */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="animate-rise elev-card rounded-2xl border border-border bg-surface px-4 py-4 text-center"
              style={{ animationDelay: `${i * 55}ms` }}
            >
              <div
                className={cn(
                  "font-display text-2xl font-bold tabular-nums",
                  s.cls,
                )}
              >
                {s.value}
              </div>
              <div className="mt-1 text-xs text-muted">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Mapping: services */}
        {unknownServices.length > 0 && (
          <div className="animate-rise elev-card rounded-2xl border border-border bg-surface p-5">
            <h3 className="font-display text-base font-bold text-foreground">
              {t.mapServicesTitle}
            </h3>
            <p className="mt-1 text-sm text-muted">{t.mapServicesBody}</p>
            <div className="mt-4 space-y-3">
              {unknownServices.map((u) => (
                <div
                  key={u.key}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="text-sm font-medium text-foreground">
                    «{u.label}»
                  </span>
                  <SelectMenu
                    value={svcMap[u.key] ?? ""}
                    onChange={(v) => setSvcMap((m) => ({ ...m, [u.key]: v }))}
                    options={svcOptions}
                    className="sm:w-72"
                    ariaLabel={t.mapServicesTitle}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mapping: staff */}
        {unknownStaff.length > 0 && (
          <div className="animate-rise elev-card rounded-2xl border border-border bg-surface p-5">
            <h3 className="font-display text-base font-bold text-foreground">
              {t.mapStaffTitle}
            </h3>
            <p className="mt-1 text-sm text-muted">{t.mapStaffBody}</p>
            <div className="mt-4 space-y-3">
              {unknownStaff.map((u) => (
                <div
                  key={u.key}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="text-sm font-medium text-foreground">
                    «{u.label}»
                  </span>
                  <SelectMenu
                    value={staffMap[u.key] ?? ""}
                    onChange={(v) =>
                      setStaffMap((m) => ({ ...m, [u.key]: v }))
                    }
                    options={staffOptions}
                    className="sm:w-72"
                    ariaLabel={t.mapStaffTitle}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Default duration */}
        {needsDuration && (
          <div className="animate-rise elev-card flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-foreground">{t.defaultDuration}</span>
            <SelectMenu
              value={defaultDuration}
              onChange={setDefaultDuration}
              options={DURATION_OPTIONS.map((v) => ({
                value: v,
                label: `${v} ${t.minutesSuffix}`,
              }))}
              className="sm:w-44"
              ariaLabel={t.defaultDuration}
            />
          </div>
        )}

        {/* Preview table */}
        <div className="animate-rise elev-card overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">{t.colWhen}</th>
                  <th className="px-4 py-3 font-medium">{t.colCustomer}</th>
                  <th className="px-4 py-3 font-medium">{t.colPhone}</th>
                  <th className="px-4 py-3 font-medium">{t.colService}</th>
                  <th className="px-4 py-3 font-medium">{t.colStaff}</th>
                  <th className="px-4 py-3 font-medium">{t.colIssues}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const fatal =
                    !r.startsAtIso ||
                    r.problems.includes("duplicate_in_file");
                  const svcLabel = r.serviceId
                    ? services.find((s) => s.id === r.serviceId)?.name
                    : r.serviceText;
                  const staffLabel = r.staffId
                    ? staff.find((s) => s.id === r.staffId)?.name
                    : r.staffText;
                  return (
                    <tr
                      key={r.index}
                      className={cn(
                        "border-t border-border",
                        fatal && "opacity-45",
                      )}
                    >
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">
                        {r.whenLabel ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {r.name ?? (
                          <span className="text-muted">
                            {dict.bookings.customerFallback}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">
                        {r.phone ?? r.phoneRaw ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">{svcLabel ?? "—"}</td>
                      <td className="px-4 py-2.5">{staffLabel ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        {r.problems.length === 0 ? (
                          <CheckCircle2 className="size-4 text-success" />
                        ) : (
                          <span className="flex flex-wrap gap-1">
                            {r.problems.map((p) => (
                              <span
                                key={p}
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-xs ring-1 ring-inset",
                                  fatal
                                    ? "bg-danger/15 text-danger ring-danger/25"
                                    : "bg-warning/15 text-warning ring-warning/25",
                                )}
                              >
                                {PROBLEM_LABEL[p]}
                              </span>
                            ))}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rows.length > PREVIEW_LIMIT && (
            <div className="border-t border-border px-4 py-3 text-center text-xs text-muted">
              {fill(t.moreRows, rows.length - PREVIEW_LIMIT)}
            </div>
          )}
        </div>

        <p className="flex items-start gap-2 text-xs text-muted">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          {t.pastNote}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleImport}
            disabled={busy || importable.length === 0}
          >
            {busy ? (
              <>
                <Loader2 className="animate-spin" />
                {t.importing}
              </>
            ) : (
              fill(t.importCta, importable.length)
            )}
          </Button>
          <Button variant="ghost" onClick={reset} disabled={busy}>
            <ArrowLeft />
            {t.backToUpload}
          </Button>
        </div>
      </div>
    );
  }

  // ── Phase: upload ────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {errorBanner}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Step 1: template */}
        <div className="animate-rise elev-card rounded-2xl border border-border bg-surface p-6">
          <span className="grid size-12 place-items-center rounded-2xl bg-gold/10 text-gold ring-1 ring-gold/20">
            <FileSpreadsheet className="size-5" />
          </span>
          <h3 className="mt-4 font-display text-lg font-bold text-foreground">
            {t.stepTemplateTitle}
          </h3>
          <p className="mt-1.5 text-sm text-muted">{t.stepTemplateBody}</p>
          <Button asChild variant="outline" className="mt-5">
            <a
              href={`/${locale}/dashboard/bookings/import/template`}
              download
            >
              <Download />
              {t.downloadTemplate}
            </a>
          </Button>
        </div>

        {/* Step 2: upload */}
        <div
          className="animate-rise elev-card rounded-2xl border border-border bg-surface p-6"
          style={{ animationDelay: "70ms" }}
        >
          <span className="grid size-12 place-items-center rounded-2xl bg-gold/10 text-gold ring-1 ring-gold/20">
            <Upload className="size-5" />
          </span>
          <h3 className="mt-4 font-display text-lg font-bold text-foreground">
            {t.stepUploadTitle}
          </h3>
          <p className="mt-1.5 text-sm text-muted">{t.stepUploadBody}</p>

          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFile(e.dataTransfer.files?.[0]);
            }}
            className={cn(
              "mt-5 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-[border-color,background-color,box-shadow] duration-200 ease-[var(--ease-out)]",
              dragOver
                ? "border-gold bg-gold/10 [box-shadow:var(--glow-nav)]"
                : "border-border hover:border-gold/60 hover:bg-surface-2/50",
              busy && "cursor-wait opacity-70",
            )}
          >
            {busy ? (
              <>
                <Loader2 className="size-6 animate-spin text-gold" />
                <span className="text-sm text-foreground">{t.parsing}</span>
              </>
            ) : (
              <>
                <Upload className="size-6 text-gold" />
                <span className="text-sm font-medium text-foreground">
                  {t.dropHere}
                </span>
                <span className="text-xs text-muted">{t.fileTypes}</span>
              </>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      </div>

      <p className="flex items-start gap-2 text-xs text-muted">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        {t.pastNote}
      </p>
    </div>
  );
}
