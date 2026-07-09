"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, Mail, Trash2 } from "lucide-react";
import { useDict } from "@/i18n/provider";
import { adminErr } from "@/lib/admin-error";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  EmailTemplateModal,
  type EmailTemplateTarget,
} from "@/components/admin/email-template-modal";
import { setBusinessStatus, deleteBusiness } from "../actions";

export function ReviewActions({
  locale,
  businessId,
  businessName,
  status,
  owner,
}: {
  locale: string;
  businessId: string;
  businessName: string;
  status: string;
  owner: { email: string; name: string | null; lang: "el" | "en" } | null;
}) {
  const t = useDict().admin.businesses;
  const errs = useDict().admin.errors;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [emailTarget, setEmailTarget] = useState<EmailTemplateTarget | null>(null);

  const onToggle = () =>
    startTransition(async () => {
      const res = await setBusinessStatus(
        locale,
        businessId,
        status === "active" ? "suspended" : "active",
      );
      if (!res.ok) alert(adminErr(errs, res.error, errs.generic));
      else router.refresh();
    });

  const onDelete = () =>
    startTransition(async () => {
      const res = await deleteBusiness(locale, businessId);
      setConfirmDelete(false);
      if (!res.ok) alert(adminErr(errs, res.error, errs.generic));
      else router.push(`/${locale}/admin/businesses`);
    });

  const btn =
    "inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-40";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {owner && (
        <button
          type="button"
          onClick={() =>
            setEmailTarget({
              email: owner.email,
              name: owner.name,
              businessName,
              lang: owner.lang,
            })
          }
          className={`${btn} text-foreground hover:border-gold hover:text-gold`}
        >
          <Mail className="size-4" /> {t.actionEmail}
        </button>
      )}
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        className={
          status === "active"
            ? `${btn} text-warning hover:border-warning hover:bg-warning/10`
            : `${btn} text-success hover:border-success hover:bg-success/10`
        }
      >
        {status === "active" ? (
          <>
            <Ban className="size-4" /> {t.actionSuspend}
          </>
        ) : (
          <>
            <CheckCircle2 className="size-4" /> {t.actionActivate}
          </>
        )}
      </button>
      <button
        type="button"
        onClick={() => setConfirmDelete(true)}
        disabled={pending}
        className={`${btn} text-danger hover:border-danger hover:bg-danger/10`}
      >
        <Trash2 className="size-4" /> {t.actionDelete}
      </button>

      {confirmDelete && (
        <ConfirmDialog
          title={t.actionDelete}
          message={t.confirmDelete.replace("{name}", businessName)}
          danger
          pending={pending}
          onConfirm={onDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
      {emailTarget && (
        <EmailTemplateModal target={emailTarget} onClose={() => setEmailTarget(null)} />
      )}
    </div>
  );
}
