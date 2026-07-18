import { notFound } from "next/navigation";
import Link from "next/link";
import { Topbar } from "@/components/dashboard/topbar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireBusiness } from "@/lib/dashboard";
import { gcalConfigured } from "@/lib/google/calendar";
import { hasLocale, getDictionary } from "@/i18n/config";
import { GoogleImportClient, type GcalImportConnection } from "./google-import-client";

export default async function GoogleImportPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ prompt?: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const autoPrompt = (await searchParams).prompt === "1";
  const t = (await getDictionary(locale)).dashboard;

  const { business, fullName, email } = await requireBusiness(locale);
  const supabase = await createClient();

  const { data: serviceRows } = await supabase
    .from("services")
    .select("id, name, duration_minutes")
    .eq("business_id", business.id)
    .eq("is_active", true)
    .order("name");
  const services = (serviceRows ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    durationMinutes: s.duration_minutes,
  }));

  // Connections (safe fields only) + whether staff mapping is still pending.
  let connections: GcalImportConnection[] = [];
  let staffOptions: { id: string; name: string }[] = [];
  if (gcalConfigured()) {
    try {
      const admin = createAdminClient();
      const [{ data: connRows }, { data: staffRows }] = await Promise.all([
        admin
          .from("calendar_connections")
          .select("id, google_email, calendar_summary, staff_id")
          .eq("business_id", business.id)
          .order("created_at"),
        admin
          .from("staff")
          .select("id, name, is_active, is_bookable")
          .eq("business_id", business.id)
          .order("order_index"),
      ]);
      const bookable = (staffRows ?? []).filter((s) => s.is_active && s.is_bookable);
      staffOptions = bookable.map((s) => ({ id: s.id, name: s.name }));
      connections = (connRows ?? []).map((c) => ({
        id: c.id,
        googleEmail: c.google_email,
        calendarSummary: c.calendar_summary,
        needsSetup: false,
      }));
    } catch (e) {
      console.error("[gcal] import page load failed", e);
    }
  }

  return (
    <>
      <Topbar
        locale={locale}
        title={t.gcal.importTitle}
        subtitle={t.gcal.importSubtitle}
        userLabel={fullName || email || ""}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        {connections.length === 0 ? (
          <section className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">{t.gcal.emptyHint}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href={`/${locale}/dashboard/settings#google-calendar`}>
                {t.gcal.importGoSettings}
              </Link>
            </Button>
          </section>
        ) : (
          <GoogleImportClient
            locale={locale}
            connections={connections}
            services={services}
            staff={staffOptions}
            autoPrompt={autoPrompt}
          />
        )}
      </div>
    </>
  );
}
