import { notFound } from "next/navigation";
import { Store, Users, CalendarDays, UserPlus, Gift, CreditCard } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { getDictionary, hasLocale } from "@/i18n/config";

export default async function AdminOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const { name, email } = await requireAdmin(locale);
  const dict = await getDictionary(locale);
  const t = dict.admin.overview;

  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_overview_stats");
  const s = (data ?? {}) as Record<string, number>;
  const n = (k: string) => Number(s[k] ?? 0);

  return (
    <>
      <Topbar
        locale={locale}
        title={t.title}
        subtitle={t.subtitle}
        userLabel={name || email || ""}
      />
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Free-slots highlight */}
        <div className="flex items-center gap-4 rounded-2xl border border-gold/30 bg-gold/10 p-5">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gold/15 text-gold">
            <Gift className="size-6" />
          </span>
          <div>
            <p className="text-2xl font-bold text-foreground">{n("free_slots_left")}</p>
            <p className="text-sm text-muted">
              {t.freeSlots} · {t.freeSlotsHint}
            </p>
          </div>
        </div>

        {/* Businesses */}
        <Group icon={<Store className="size-4" />} label={t.businesses}>
          <Stat label={t.businesses} value={n("businesses_total")} big />
          <Stat label={t.active} value={n("businesses_active")} tone="success" />
          <Stat label={t.draft} value={n("businesses_draft")} tone="warning" />
          <Stat label={t.suspended} value={n("businesses_suspended")} tone="danger" />
        </Group>

        {/* Subscriptions */}
        <div>
          <Group icon={<CreditCard className="size-4" />} label={t.subsTitle}>
            <Stat label={t.inTrial} value={n("in_trial")} tone="success" />
            <Stat label={t.trialExpired} value={n("trial_expired")} tone="warning" />
            <Stat label={t.subscribed} value={n("subscribed")} />
          </Group>
          <p className="mt-2 text-xs text-muted-2">{t.subsNote}</p>
        </div>

        {/* Users */}
        <Group icon={<Users className="size-4" />} label={t.users}>
          <Stat label={t.users} value={n("users_total")} big />
          <Stat label={t.customers} value={n("customers")} />
          <Stat label={t.businessAccounts} value={n("business_accounts")} />
        </Group>

        {/* Activity */}
        <Group icon={<CalendarDays className="size-4" />} label={t.bookings}>
          <Stat label={t.bookings} value={n("bookings_total")} big />
          <Stat label={t.bookings30d} value={n("bookings_30d")} />
          <Stat
            label={t.signups30d}
            value={n("signups_30d")}
            icon={<UserPlus className="size-4" />}
          />
        </Group>
      </div>
    </>
  );
}

function Group({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-2">
        {icon}
        {label}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {children}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  big,
  tone,
  icon,
}: {
  label: string;
  value: number;
  big?: boolean;
  tone?: "success" | "warning" | "danger";
  icon?: React.ReactNode;
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "danger"
          ? "text-danger"
          : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted">{label}</p>
        {icon && <span className="text-muted-2">{icon}</span>}
      </div>
      <p className={`mt-2 font-bold ${big ? "text-3xl" : "text-2xl"} ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}
