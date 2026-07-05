"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flag, Ban, X, Phone, AlertTriangle, Check, ShieldOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { dashErr } from "@/lib/dash-error";
import {
  reportAccount,
  blockCustomer,
  unblockCustomer,
} from "./actions";

export interface NoShowAccount {
  customerId: string;
  name: string;
  phone: string | null;
  count: number;
  lastIso: string;
  blocked: boolean;
}

export function NoShowReport({
  locale,
  accounts,
}: {
  locale: string;
  accounts: NoShowAccount[];
}) {
  const router = useRouter();
  const dd = useDict().dashboard;
  const t = dd.reports;
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(accounts);
  const [reported, setReported] = useState<Set<string>>(new Set());
  const [reportTarget, setReportTarget] = useState<NoShowAccount | null>(null);
  const [blockTarget, setBlockTarget] = useState<NoShowAccount | null>(null);

  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(locale === "el" ? "el-GR" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));

  const setBlocked = (id: string, blocked: boolean) =>
    setList((prev) =>
      prev.map((a) => (a.customerId === id ? { ...a, blocked } : a)),
    );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-[transform,background-color,border-color,color] duration-200 ease-[var(--ease-out)] hover:border-gold hover:bg-gold/5 hover:text-gold active:scale-[0.97]"
      >
        <Flag className="size-4 text-gold" />
        {t.reportBtn}
        {list.length > 0 && (
          <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs text-gold">
            {list.length}
          </span>
        )}
      </button>

      {open && (
        <Overlay onClose={() => setOpen(false)}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-foreground">
              {t.accountsWithAbsences}
            </h3>
            <button
              onClick={() => setOpen(false)}
              aria-label={dd.close}
              className="text-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          {list.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              {t.noAbsences}
            </p>
          ) : (
            <div className="max-h-[60vh] space-y-2 overflow-auto pr-1">
              {list.map((a) => (
                <div
                  key={a.customerId}
                  className="rounded-lg border border-border bg-surface p-3 transition-colors duration-200 ease-[var(--ease-out)] hover:border-gold-soft"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {a.name}
                        {a.blocked && (
                          <span className="ml-2 rounded-full bg-danger/15 px-2 py-0.5 text-[10px] font-medium text-danger">
                            {t.blockedTag}
                          </span>
                        )}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                        <span className="inline-flex items-center gap-1 text-danger">
                          <AlertTriangle className="size-3.5" />
                          {a.count}{" "}
                          {a.count === 1 ? t.absence : t.absences}
                        </span>
                        <span>{t.lastLabel} {fmtDate(a.lastIso)}</span>
                        {a.phone && (
                          <a
                            href={`tel:${a.phone}`}
                            className="inline-flex items-center gap-1 hover:text-foreground"
                          >
                            <Phone className="size-3.5" />
                            {a.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => setReportTarget(a)}
                      disabled={reported.has(a.customerId)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-[transform,background-color,border-color,color] duration-200 ease-[var(--ease-out)] hover:border-gold hover:bg-gold/5 hover:text-gold active:scale-95 disabled:opacity-50"
                    >
                      {reported.has(a.customerId) ? (
                        <>
                          <Check className="size-3.5" /> {t.reported}
                        </>
                      ) : (
                        <>
                          <Flag className="size-3.5" /> {dd.report.reportAccount}
                        </>
                      )}
                    </button>

                    {a.blocked ? (
                      <UnblockButton
                        locale={locale}
                        account={a}
                        onDone={() => {
                          setBlocked(a.customerId, false);
                          router.refresh();
                        }}
                      />
                    ) : (
                      <button
                        onClick={() => setBlockTarget(a)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-medium text-danger transition-[transform,background-color] duration-200 ease-[var(--ease-out)] hover:bg-danger/10 active:scale-95"
                      >
                        <Ban className="size-3.5" /> {dd.report.block}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Overlay>
      )}

      {reportTarget && (
        <ReportModal
          locale={locale}
          account={reportTarget}
          onClose={() => setReportTarget(null)}
          onDone={() => {
            setReported((prev) => new Set(prev).add(reportTarget.customerId));
            setReportTarget(null);
          }}
        />
      )}

      {blockTarget && (
        <BlockModal
          locale={locale}
          account={blockTarget}
          onClose={() => setBlockTarget(null)}
          onDone={() => {
            setBlocked(blockTarget.customerId, true);
            setBlockTarget(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function ReportModal({
  locale,
  account,
  onClose,
  onDone,
}: {
  locale: string;
  account: NoShowAccount;
  onClose: () => void;
  onDone: () => void;
}) {
  const dd = useDict().dashboard;
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <Overlay onClose={() => !pending && onClose()} small>
      <h3 className="font-display text-base font-bold text-foreground">
        {dd.report.reportAccount}
      </h3>
      <p className="mt-1 text-sm text-muted">
        {dd.reports.reportForPre} <b>{account.name}</b> {dd.reports.reportForPost}
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={dd.report.reasonPlaceholder}
        rows={3}
        disabled={pending}
        className="mt-3 block w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30"
      />
      {err && <p className="mt-2 text-sm text-danger">{err}</p>}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() =>
            start(async () => {
              const res = await reportAccount(
                locale,
                account.customerId,
                account.name,
                reason,
              );
              if (!res.ok) setErr(dashErr(dd.errors, res.error, dd.report.error));
              else onDone();
            })
          }
          disabled={pending}
          className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black shadow-[0_8px_24px_-8px_var(--gold-glow)] transition-[transform,background-color] duration-200 ease-[var(--ease-out)] hover:bg-gold-bright active:scale-[0.97] disabled:opacity-40"
        >
          {pending ? dd.report.sending : dd.report.sendReport}
        </button>
        <button
          onClick={onClose}
          disabled={pending}
          className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition-[transform,background-color,color] duration-200 ease-[var(--ease-out)] hover:bg-surface-2 hover:text-foreground active:scale-[0.97]"
        >
          {dd.cancel}
        </button>
      </div>
    </Overlay>
  );
}

function BlockModal({
  locale,
  account,
  onClose,
  onDone,
}: {
  locale: string;
  account: NoShowAccount;
  onClose: () => void;
  onDone: () => void;
}) {
  const dd = useDict().dashboard;
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const doBlock = (cancelFuture: boolean) =>
    start(async () => {
      const res = await blockCustomer(locale, account.customerId, cancelFuture);
      if (!res.ok) setErr(dashErr(dd.errors, res.error, dd.report.error));
      else onDone();
    });
  return (
    <Overlay onClose={() => !pending && onClose()} small>
      <h3 className="font-display text-base font-bold text-foreground">
        {dd.reports.blockPre} {account.name};
      </h3>
      <p className="mt-1 text-sm text-muted">{dd.reports.blockDesc}</p>
      {err && <p className="mt-2 text-sm text-danger">{err}</p>}
      <div className="mt-4 flex flex-col gap-2">
        <button
          onClick={() => doBlock(true)}
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white transition-[transform,background-color] duration-200 ease-[var(--ease-out)] hover:bg-danger/90 active:scale-[0.97] disabled:opacity-40"
        >
          <Ban className="size-4" /> {dd.report.blockCancel}
        </button>
        <button
          onClick={() => doBlock(false)}
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-danger/40 px-4 py-2 text-sm font-medium text-danger transition-[transform,background-color] duration-200 ease-[var(--ease-out)] hover:bg-danger/10 active:scale-[0.97] disabled:opacity-40"
        >
          {dd.report.blockKeep}
        </button>
        <button
          onClick={onClose}
          disabled={pending}
          className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition-[transform,background-color,color] duration-200 ease-[var(--ease-out)] hover:bg-surface-2 hover:text-foreground active:scale-[0.97]"
        >
          {dd.cancel}
        </button>
      </div>
    </Overlay>
  );
}

function UnblockButton({
  locale,
  account,
  onDone,
}: {
  locale: string;
  account: NoShowAccount;
  onDone: () => void;
}) {
  const t = useDict().dashboard.reports;
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() =>
        start(async () => {
          const res = await unblockCustomer(locale, account.customerId);
          if (res.ok) onDone();
        })
      }
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-[transform,background-color,border-color,color] duration-200 ease-[var(--ease-out)] hover:border-gold hover:bg-gold/5 hover:text-gold active:scale-95 disabled:opacity-50"
    >
      <ShieldOff className="size-3.5" /> {t.unblock}
    </button>
  );
}

function Overlay({
  children,
  onClose,
  small,
}: {
  children: React.ReactNode;
  onClose: () => void;
  small?: boolean;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "animate-pop w-full rounded-xl border border-border bg-surface p-5 shadow-2xl",
            small ? "max-w-sm" : "max-w-lg",
          )}
        >
          {children}
        </div>
      </div>
    </>
  );
}
