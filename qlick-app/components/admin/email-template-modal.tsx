"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Mail, X } from "lucide-react";
import { useDict } from "@/i18n/provider";
import {
  buildAdminEmail,
  type AdminEmailKind,
  type AdminEmailLang,
} from "@/lib/admin-email-templates";

export interface EmailTemplateTarget {
  email: string;
  name?: string | null;
  businessName?: string | null;
  /** Preselected template language (e.g. the user's preferred language). */
  lang?: AdminEmailLang;
}

/** Admin modal with the ready-made suspension/deletion emails: pick a
 * template, copy it, or open it in the mail client — sending stays manual. */
export function EmailTemplateModal({
  target,
  onClose,
}: {
  target: EmailTemplateTarget;
  onClose: () => void;
}) {
  const t = useDict().admin.emailTemplates;
  const [kind, setKind] = useState<AdminEmailKind>("suspend");
  const [lang, setLang] = useState<AdminEmailLang>(target.lang ?? "el");
  const [copied, setCopied] = useState(false);

  const tpl = useMemo(
    () =>
      buildAdminEmail(kind, lang, {
        recipientName: target.name,
        businessName: target.businessName,
      }),
    [kind, lang, target],
  );

  const copyAll = async () => {
    await navigator.clipboard.writeText(
      `${t.to}: ${target.email}\n${t.subject}: ${tpl.subject}\n\n${tpl.body}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mailto = `mailto:${encodeURIComponent(target.email)}?subject=${encodeURIComponent(tpl.subject)}&body=${encodeURIComponent(tpl.body)}`;

  const tabCls = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
      active
        ? "bg-gold/15 text-gold"
        : "text-muted hover:bg-surface-2 hover:text-foreground"
    }`;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-[70] flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-surface p-5 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display text-base font-bold text-foreground">
              {t.title}
            </h3>
            <p className="truncate text-xs text-muted">
              {t.to}: {target.email}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={t.close}
            className="text-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg border border-border p-1">
            <button onClick={() => setKind("suspend")} className={tabCls(kind === "suspend")}>
              {t.kindSuspend}
            </button>
            <button onClick={() => setKind("delete")} className={tabCls(kind === "delete")}>
              {t.kindDelete}
            </button>
          </div>
          <div className="flex gap-1 rounded-lg border border-border p-1">
            <button onClick={() => setLang("el")} className={tabCls(lang === "el")}>
              EL
            </button>
            <button onClick={() => setLang("en")} className={tabCls(lang === "en")}>
              EN
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border bg-surface-2/50 p-3">
          <p className="mb-2 text-sm font-semibold text-foreground">
            {t.subject}: {tpl.subject}
          </p>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted">
            {tpl.body}
          </pre>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <a
            href={mailto}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-gold hover:text-gold"
          >
            <Mail className="size-4" /> {t.openMail}
          </a>
          <button
            onClick={copyAll}
            className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-gold/90"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? t.copied : t.copy}
          </button>
        </div>
      </div>
    </>
  );
}
