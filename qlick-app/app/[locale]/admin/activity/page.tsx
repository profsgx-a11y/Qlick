import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Store,
  Users,
  Star,
  ShieldCheck,
  CalendarPlus,
  Trash2,
  Ban,
  CheckCircle2,
  MailCheck,
  EyeOff,
  Eye,
} from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { getDictionary, hasLocale } from "@/i18n/config";

const ACTION_ICONS: Record<string, React.ReactNode> = {
  business_status_changed: <Store className="size-4 text-gold" />,
  business_deleted: <Trash2 className="size-4 text-danger" />,
  user_suspended: <Ban className="size-4 text-warning" />,
  user_unsuspended: <CheckCircle2 className="size-4 text-success" />,
  user_deleted: <Trash2 className="size-4 text-danger" />,
  user_email_confirmed: <MailCheck className="size-4 text-success" />,
  trial_extended: <CalendarPlus className="size-4 text-gold" />,
  review_hidden: <EyeOff className="size-4 text-warning" />,
  review_published: <Eye className="size-4 text-success" />,
  review_deleted: <Trash2 className="size-4 text-danger" />,
};

const TARGET_ICONS: Record<string, React.ReactNode> = {
  business: <Store className="size-3.5" />,
  user: <Users className="size-3.5" />,
  review: <Star className="size-3.5" />,
};

export default async function AdminActivityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const { name, email } = await requireAdmin(locale);
  const dict = await getDictionary(locale);
  const t = dict.admin.activity;
  const tb = dict.admin.businesses;

  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_list_audit_log", { p_limit: 200 });
  const rows = data ?? [];

  const fmtDateTime = (iso: string) =>
    new Date(iso).toLocaleString(locale === "el" ? "el-GR" : "en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const actionLabel = (code: string) =>
    (t.actions as Record<string, string>)[code] ?? code;

  // Human-readable rendering of the details payload per action type.
  const statusLabel: Record<string, string> = {
    active: tb.statusActive,
    draft: tb.statusDraft,
    suspended: tb.statusSuspended,
  };
  const detailsText = (d: unknown): string | null => {
    if (!d || typeof d !== "object") return null;
    const obj = d as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof obj.from === "string" && typeof obj.to === "string") {
      parts.push(
        `${statusLabel[obj.from] ?? obj.from} → ${statusLabel[obj.to] ?? obj.to}`,
      );
    }
    if (typeof obj.days === "number") {
      parts.push(t.detailsDays.replace("{n}", String(obj.days)));
    }
    if (typeof obj.rating === "number") {
      parts.push(t.detailsRating.replace("{n}", String(obj.rating)));
    }
    if (typeof obj.customer === "string" && obj.customer) {
      parts.push(String(obj.customer));
    }
    if (typeof obj.comment === "string" && obj.comment) {
      parts.push(`«${obj.comment}»`);
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  };

  return (
    <>
      <Topbar
        locale={locale}
        title={t.title}
        subtitle={t.subtitle}
        userLabel={name || email || ""}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        {rows.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
            {t.empty}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/60 text-left text-xs uppercase tracking-wider text-muted-2">
                  <th className="px-4 py-3 font-medium">{t.colWhen}</th>
                  <th className="px-4 py-3 font-medium">{t.colAction}</th>
                  <th className="px-4 py-3 font-medium">{t.colTarget}</th>
                  <th className="px-4 py-3 font-medium">{t.colAdmin}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const details = detailsText(r.details);
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 whitespace-nowrap text-muted">
                        {fmtDateTime(r.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface-2">
                            {ACTION_ICONS[r.action] ?? (
                              <ShieldCheck className="size-4 text-muted" />
                            )}
                          </span>
                          <div>
                            <p className="font-medium text-foreground">
                              {actionLabel(r.action)}
                            </p>
                            {details && (
                              <p className="text-xs text-muted-2 [overflow-wrap:anywhere]">
                                {details}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-muted">
                          {r.target_type && (
                            <span className="text-muted-2">
                              {TARGET_ICONS[r.target_type]}
                            </span>
                          )}
                          {r.target_type === "business" && r.target_id ? (
                            <Link
                              href={`/${locale}/admin/businesses/${r.target_id}`}
                              className="text-foreground hover:text-gold"
                            >
                              {r.target_label || "—"}
                            </Link>
                          ) : (
                            <span className="text-foreground">
                              {r.target_label || "—"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-foreground">{r.admin_name || "—"}</p>
                        {r.admin_email && (
                          <p className="text-xs text-muted-2">{r.admin_email}</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
