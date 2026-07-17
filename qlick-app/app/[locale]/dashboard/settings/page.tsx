import { notFound } from "next/navigation";
import Link from "next/link";
import { Topbar } from "@/components/dashboard/topbar";
import { Button } from "@/components/ui/button";
import { requireBusiness } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlanState } from "@/lib/subscription";
import { gcalConfigured } from "@/lib/google/calendar";
import { hasLocale, getDictionary } from "@/i18n/config";
import { HoursEditor } from "./hours-editor";
import { BusinessInfoEditor } from "./business-info-editor";
import { CategoryEditor, type CategoryGroup } from "./category-editor";
import { DeleteShop } from "./delete-shop";
import {
  GoogleCalendarSection,
  type GcalConnectionView,
} from "./google-calendar-section";
import type { DayHoursInput } from "./actions";

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ gcal?: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = (await getDictionary(locale)).dashboard;
  const { business, fullName, firstName, lastName, email } =
    await requireBusiness(locale);
  const supabase = await createClient();

  const [{ data: b }, { data: hours }, { data: allCats }, { data: bizCats }] =
    await Promise.all([
      supabase
        .from("businesses")
        .select("name, email, phone, landline, address, slug, status, day_order, logo_url, cover_url, deletion_scheduled_at")
        .eq("id", business.id)
        .maybeSingle(),
      supabase
        .from("business_hours")
        .select("day_of_week, is_closed, open_time, close_time, order_index")
        .eq("business_id", business.id)
        .order("day_of_week")
        .order("order_index"),
      supabase
        .from("categories")
        .select("id, name_el, name_en, parent_id, order_index")
        .order("order_index"),
      supabase
        .from("business_categories")
        .select("category_id")
        .eq("business_id", business.id),
    ]);

  // Group categories: each parent with its children, then childless top-levels.
  const cats = allCats ?? [];
  const catName = (c: { name_el: string; name_en: string | null }) =>
    locale === "en" ? c.name_en || c.name_el : c.name_el;
  const parents = cats.filter((c) => !c.parent_id);
  const categoryGroups: CategoryGroup[] = [];
  const leftovers: { id: string; name: string }[] = [];
  for (const p of parents) {
    const children = cats.filter((c) => c.parent_id === p.id);
    if (children.length > 0) {
      categoryGroups.push({
        label: catName(p),
        options: children.map((c) => ({ id: c.id, name: catName(c) })),
      });
    } else {
      leftovers.push({ id: p.id, name: catName(p) });
    }
  }
  if (leftovers.length > 0) {
    categoryGroups.push({
      label: locale === "en" ? "Other categories" : "Άλλες κατηγορίες",
      options: leftovers,
    });
  }
  const selectedCategoryIds = (bizCats ?? []).map((r) => r.category_id);

  const address = (b?.address ?? {}) as {
    street?: string;
    city?: string;
    area?: string;
    postcode?: string;
    lat?: number | null;
    lng?: number | null;
  };

  // Build one editable entry per day, in the saved display order
  const dayOrder = (Array.isArray(b?.day_order) ? b?.day_order : [1, 2, 3, 4, 5, 6, 0]) as number[];
  const rows = hours ?? [];
  const initialDays: DayHoursInput[] = dayOrder.map((dow) => {
    const dayRows = rows
      .filter((r) => r.day_of_week === dow)
      .sort((a, c) => a.order_index - c.order_index);
    const open = dayRows.filter((r) => !r.is_closed && r.open_time && r.close_time);
    const isClosed = open.length === 0;
    return {
      day_of_week: dow,
      is_closed: isClosed,
      open_time: open[0]?.open_time?.slice(0, 5) ?? "09:00",
      close_time: open[0]?.close_time?.slice(0, 5) ?? "18:00",
      open_time2: open[1]?.open_time?.slice(0, 5) ?? null,
      close_time2: open[1]?.close_time?.slice(0, 5) ?? null,
    };
  });

  // Google Calendar connections — tokens are server-only (no RLS policies),
  // so the safe fields are read here with the admin client and only those
  // reach the client component.
  const gcalReady = gcalConfigured();
  let gcalConnections: GcalConnectionView[] = [];
  let staffOptions: { id: string; name: string }[] = [];
  let hasBookableStaff = false;
  if (gcalReady) {
    try {
      const admin = createAdminClient();
      const [{ data: connRows }, { data: staffRows }] = await Promise.all([
        admin
          .from("calendar_connections")
          .select(
            "id, google_email, staff_id, calendar_id, calendar_summary, push_enabled, busy_enabled, busy_synced_at, sync_error, created_at",
          )
          .eq("business_id", business.id)
          .order("created_at"),
        admin
          .from("staff")
          .select("id, name, is_active, is_bookable")
          .eq("business_id", business.id)
          .eq("is_active", true)
          .order("order_index"),
      ]);
      gcalConnections = (connRows ?? []).map((c) => ({
        id: c.id,
        googleEmail: c.google_email,
        staffId: c.staff_id,
        calendarId: c.calendar_id,
        calendarSummary: c.calendar_summary,
        pushEnabled: c.push_enabled,
        busyEnabled: c.busy_enabled,
        busySyncedAt: c.busy_synced_at,
        syncError: c.sync_error,
      }));
      staffOptions = (staffRows ?? []).map((s) => ({ id: s.id, name: s.name }));
      hasBookableStaff = (staffRows ?? []).some((s) => s.is_bookable);
    } catch (e) {
      console.error("[gcal] settings load failed", e);
    }
  }
  const gcalFlag = (await searchParams).gcal ?? null;

  // Subscription summary for the top-of-page card.
  const planState = await getPlanState(supabase, business.id);
  const st = t.settings;
  const planLabel =
    planState.plan === "monthly"
      ? st.planMonthly
      : planState.plan === "yearly"
        ? st.planYearly
        : st.planFree;
  const subStatus = !planState.active
    ? st.planExpired
    : planState.expiresAt === null || planState.daysLeft === null
      ? st.planNoExpiry
      : planState.daysLeft <= 0
        ? st.planExpiresToday
        : `${st.planExpires.replace(
            "{date}",
            new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "el-GR", {
              dateStyle: "long",
            }).format(new Date(planState.expiresAt)),
          )} · ${st.planDaysLeft.replace("{n}", String(planState.daysLeft))}`;

  return (
    <>
      <Topbar
        locale={locale}
        title={t.navSettings}
        subtitle={t.settings.subtitle}
        userLabel={fullName || email || ""}
      />
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Subscription — plan, expiry, renew */}
        <section className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold text-foreground">
                {st.subscriptionTitle}
              </h2>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-0.5 text-xs font-medium text-gold">
                  {planLabel}
                </span>
                <span className={planState.active ? "text-muted" : "text-danger"}>
                  {subStatus}
                </span>
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href={`/${locale}#pricing`}>{st.renewSubscription}</Link>
            </Button>
          </div>
        </section>

        <BusinessInfoEditor
          locale={locale}
          slug={b?.slug ?? ""}
          status={b?.status ?? "draft"}
          businessId={business.id}
          initial={{
            name: b?.name ?? "",
            ownerFirstName: firstName ?? "",
            ownerLastName: lastName ?? "",
            email: b?.email ?? email ?? "",
            mobile: b?.phone ?? null,
            landline: b?.landline ?? null,
            street: address.street ?? "",
            city: address.city ?? "",
            area: address.area ?? "",
            postcode: address.postcode ?? "",
            lat: address.lat ?? null,
            lng: address.lng ?? null,
            logoUrl: b?.logo_url ?? null,
            coverUrl: b?.cover_url ?? null,
          }}
        />

        <CategoryEditor
          locale={locale}
          groups={categoryGroups}
          selected={selectedCategoryIds}
        />

        <HoursEditor locale={locale} initialDays={initialDays} />

        <GoogleCalendarSection
          locale={locale}
          configured={gcalReady}
          connections={gcalConnections}
          staffOptions={staffOptions}
          hasBookableStaff={hasBookableStaff}
          statusFlag={gcalFlag}
        />

        {/* Danger zone — delete shop (24h grace, cancellable) */}
        <DeleteShop
          locale={locale}
          scheduledAt={b?.deletion_scheduled_at ?? null}
        />
      </div>
    </>
  );
}
