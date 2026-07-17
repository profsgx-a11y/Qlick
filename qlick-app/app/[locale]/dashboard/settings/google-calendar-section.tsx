"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  CloudUpload,
  Download,
  Link2,
  RefreshCw,
  TriangleAlert,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SelectMenu, type SelectOption } from "@/components/ui/select-menu";
import { useDict } from "@/i18n/provider";
import { dashErr } from "@/lib/dash-error";
import {
  disconnectGoogle,
  getGoogleCalendars,
  pushAllFutureToGoogle,
  syncGoogleBusyNow,
  updateGoogleConnection,
} from "./google-actions";

export interface GcalConnectionView {
  id: string;
  googleEmail: string;
  staffId: string | null;
  calendarId: string;
  calendarSummary: string | null;
  pushEnabled: boolean;
  busyEnabled: boolean;
  busySyncedAt: string | null;
  syncError: string | null;
}

export function GoogleCalendarSection({
  locale,
  configured,
  connections,
  staffOptions,
  hasBookableStaff,
  statusFlag,
}: {
  locale: string;
  configured: boolean;
  connections: GcalConnectionView[];
  staffOptions: { id: string; name: string }[];
  hasBookableStaff: boolean;
  statusFlag: string | null;
}) {
  const t = useDict().dashboard.gcal;

  const banner = statusFlag ? bannerFor(statusFlag, t) : null;

  return (
    <section
      id="google-calendar"
      className="scroll-mt-24 rounded-2xl border border-border bg-surface p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
            <CalendarDays className="size-5 text-gold" />
            {t.title}
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
            {t.subtitle}
          </p>
        </div>
        {configured && (
          <Button asChild variant={connections.length ? "outline" : "primary"}>
            {/* OAuth must be a full navigation (server redirect to Google),
                not a client transition — <Link> would prefetch an API route. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/google-calendar/start">
              <Link2 className="size-4" />
              {connections.length ? t.connectAnother : t.connectCta}
            </a>
          </Button>
        )}
      </div>

      {banner && (
        <p
          className={
            banner.tone === "ok"
              ? "mt-4 rounded-xl border border-gold/30 bg-gold/10 px-4 py-2.5 text-sm text-gold"
              : "mt-4 rounded-xl border border-danger/40 bg-danger/5 px-4 py-2.5 text-sm text-danger"
          }
        >
          {banner.text}
        </p>
      )}

      {!configured ? (
        <p className="mt-4 text-sm text-muted">{t.notConfigured}</p>
      ) : connections.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{t.emptyHint}</p>
      ) : (
        <div className="mt-5 space-y-4">
          {connections.map((c) => (
            <ConnectionCard
              key={c.id}
              locale={locale}
              conn={c}
              staffOptions={staffOptions}
              hasBookableStaff={hasBookableStaff}
            />
          ))}
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <Button asChild variant="outline">
              <Link href={`/${locale}/dashboard/bookings/google-import`}>
                <Download className="size-4" />
                {t.importCta}
              </Link>
            </Button>
            <p className="text-xs text-muted">{t.importHint}</p>
          </div>
        </div>
      )}
    </section>
  );
}

function bannerFor(
  flag: string,
  t: Record<string, string>,
): { tone: "ok" | "err"; text: string } | null {
  if (flag === "connected") return { tone: "ok", text: t.statusConnected };
  const map: Record<string, string> = {
    err_denied: t.statusErrDenied,
    err_scope: t.statusErrScope,
    err_state: t.statusErrRetry,
    err_exchange: t.statusErrRetry,
    err_email: t.statusErrRetry,
    err_norefresh: t.statusErrRetry,
    err_save: t.statusErrRetry,
    err_permission: t.statusErrPermission,
    not_configured: t.notConfigured,
  };
  const text = map[flag];
  return text ? { tone: "err", text } : null;
}

function ConnectionCard({
  locale,
  conn,
  staffOptions,
  hasBookableStaff,
}: {
  locale: string;
  conn: GcalConnectionView;
  staffOptions: { id: string; name: string }[];
  hasBookableStaff: boolean;
}) {
  const dict = useDict().dashboard;
  const t = dict.gcal;
  const router = useRouter();

  const [staffId, setStaffId] = useState(conn.staffId ?? "");
  const [calendarId, setCalendarId] = useState(conn.calendarId);
  const [pushEnabled, setPushEnabled] = useState(conn.pushEnabled);
  const [busyEnabled, setBusyEnabled] = useState(conn.busyEnabled);
  const [calendars, setCalendars] = useState<SelectOption[] | null>(null);
  const [calError, setCalError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirmingUnlink, setConfirmingUnlink] = useState(false);
  const [saving, startSaving] = useTransition();
  const [working, startWorking] = useTransition();

  const needsReconnect = conn.syncError === "reconnect_required";
  const needsStaff = hasBookableStaff && !staffId;
  const dirty =
    staffId !== (conn.staffId ?? "") ||
    calendarId !== conn.calendarId ||
    pushEnabled !== conn.pushEnabled ||
    busyEnabled !== conn.busyEnabled;

  // Load the owner's calendar list once per card (live from Google).
  useEffect(() => {
    let alive = true;
    getGoogleCalendars(conn.id).then((res) => {
      if (!alive) return;
      if (res.ok && res.calendars) {
        setCalendars(
          res.calendars.map((c) => ({
            value: c.id,
            label: c.primary ? `${c.summary} · ${t.primaryCalendar}` : c.summary,
          })),
        );
      } else {
        setCalError(res.error ?? "gcal_api_error");
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conn.id]);

  const calendarOptions: SelectOption[] =
    calendars ??
    [{ value: conn.calendarId, label: conn.calendarSummary ?? conn.calendarId }];

  const staffSelectOptions: SelectOption[] = [
    ...(!hasBookableStaff ? [{ value: "", label: t.wholeShop }] : []),
    ...staffOptions.map((s) => ({ value: s.id, label: s.name })),
  ];

  const fmtWhen = (iso: string) =>
    new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "el-GR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));

  const save = () =>
    startSaving(async () => {
      setErr(null);
      setMsg(null);
      const chosen = calendarOptions.find((o) => o.value === calendarId);
      const res = await updateGoogleConnection(locale, conn.id, {
        staffId: staffId || null,
        calendarId,
        calendarSummary: chosen?.label ?? null,
        pushEnabled,
        busyEnabled,
      });
      if (!res.ok) {
        setErr(dashErr(dict.errors, res.error, t.saveFailed));
        return;
      }
      const parts: string[] = [t.saved];
      if (res.repushed && res.repushed.created + res.repushed.updated > 0) {
        parts.push(
          t.pushAllDone.replace(
            "{n}",
            String(res.repushed.created + res.repushed.updated),
          ),
        );
      }
      if (res.busyEvents !== null && res.busyEvents !== undefined) {
        parts.push(t.busySyncDone.replace("{n}", String(res.busyEvents)));
      }
      setMsg(parts.join(" · "));
      router.refresh();
    });

  const pushAll = () =>
    startWorking(async () => {
      setErr(null);
      setMsg(null);
      const res = await pushAllFutureToGoogle(locale);
      if (!res.ok || !res.counts) {
        setErr(dashErr(dict.errors, res.error, t.saveFailed));
        return;
      }
      const done = res.counts.created + res.counts.updated + res.counts.deleted;
      setMsg(
        res.counts.failed > 0
          ? t.pushAllPartial
              .replace("{n}", String(done))
              .replace("{failed}", String(res.counts.failed))
          : t.pushAllDone.replace("{n}", String(done)),
      );
      router.refresh();
    });

  const syncBusy = () =>
    startWorking(async () => {
      setErr(null);
      setMsg(null);
      const res = await syncGoogleBusyNow(locale);
      if (!res.ok || !res.results) {
        setErr(dashErr(dict.errors, res.error, t.saveFailed));
        return;
      }
      const mine = res.results.find((r) => r.connectionId === conn.id);
      if (mine && !mine.ok) {
        setErr(
          mine.error === "reconnect_required"
            ? dict.errors.gcal_reconnect
            : dict.errors.gcal_api_error,
        );
      } else {
        setMsg(t.busySyncDone.replace("{n}", String(mine?.events ?? 0)));
      }
      router.refresh();
    });

  const unlink = () =>
    startWorking(async () => {
      setErr(null);
      const res = await disconnectGoogle(locale, conn.id);
      if (!res.ok) {
        setErr(dashErr(dict.errors, res.error, t.saveFailed));
        return;
      }
      router.refresh();
    });

  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/10">
            <CalendarDays className="size-4 text-gold" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {conn.googleEmail}
            </p>
            <p className="text-xs text-muted">
              {conn.busySyncedAt
                ? t.busyLastSync.replace("{when}", fmtWhen(conn.busySyncedAt))
                : t.busyNever}
            </p>
          </div>
        </div>
        {needsReconnect ? (
          <Button asChild variant="outline" className="border-danger/40 text-danger">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/google-calendar/start">
              <RefreshCw className="size-4" />
              {t.reconnect}
            </a>
          </Button>
        ) : conn.syncError ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/40 bg-danger/5 px-2.5 py-0.5 text-xs text-danger">
            <TriangleAlert className="size-3.5" />
            {t.apiError}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-2.5 py-0.5 text-xs text-gold">
            <Check className="size-3.5" />
            {t.connectedChip}
          </span>
        )}
      </div>

      {needsStaff && (
        <p className="mt-3 rounded-xl border border-gold/30 bg-gold/10 px-4 py-2.5 text-sm text-gold">
          {t.needsSetupBody}
        </p>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
            {t.calendarLabel}
          </p>
          <SelectMenu
            value={calendarId}
            onChange={setCalendarId}
            options={calendarOptions}
            className="w-full"
            ariaLabel={t.calendarLabel}
            placeholder={calendars ? undefined : t.calendarLoading}
          />
          {calError && (
            <p className="mt-1.5 text-xs text-danger">
              {dashErr(dict.errors, calError, t.saveFailed)}
            </p>
          )}
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
            {t.staffLabel}
          </p>
          <SelectMenu
            value={staffId}
            onChange={setStaffId}
            options={staffSelectOptions}
            className="w-full"
            ariaLabel={t.staffLabel}
            placeholder={t.staffPlaceholder}
          />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{t.pushLabel}</p>
            <p className="text-xs leading-relaxed text-muted">{t.pushDesc}</p>
          </div>
          <Switch
            checked={pushEnabled}
            onChange={setPushEnabled}
            aria-label={t.pushLabel}
          />
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{t.busyLabel}</p>
            <p className="text-xs leading-relaxed text-muted">{t.busyDesc}</p>
          </div>
          <Switch
            checked={busyEnabled}
            onChange={setBusyEnabled}
            aria-label={t.busyLabel}
          />
        </div>
      </div>

      {(msg || err) && (
        <p className={`mt-3 text-sm ${err ? "text-danger" : "text-gold"}`}>
          {err ?? msg}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {dirty && (
          <Button onClick={save} disabled={saving || working}>
            {saving ? t.saving : t.save}
          </Button>
        )}
        {!dirty && !needsStaff && (
          <>
            <Button
              variant="outline"
              onClick={pushAll}
              disabled={working || saving || !conn.pushEnabled || needsReconnect}
              title={!conn.pushEnabled ? t.pushDisabledHint : undefined}
            >
              <CloudUpload className="size-4" />
              {working ? t.working : t.pushAllCta}
            </Button>
            <Button
              variant="outline"
              onClick={syncBusy}
              disabled={working || saving || !conn.busyEnabled || needsReconnect}
              title={!conn.busyEnabled ? t.busyDisabledHint : undefined}
            >
              <RefreshCw className="size-4" />
              {working ? t.working : t.busySyncCta}
            </Button>
          </>
        )}
        <div className="ml-auto">
          {!confirmingUnlink ? (
            <Button
              variant="ghost"
              onClick={() => setConfirmingUnlink(true)}
              disabled={working || saving}
              className="text-muted hover:text-danger"
            >
              <Unlink className="size-4" />
              {t.disconnect}
            </Button>
          ) : (
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted">{t.disconnectConfirm}</span>
              <Button variant="danger" onClick={unlink} disabled={working}>
                {t.disconnectCta}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setConfirmingUnlink(false)}
                disabled={working}
              >
                {t.cancel}
              </Button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
