import { notFound } from "next/navigation";
import { Topbar } from "@/components/dashboard/topbar";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireBusiness } from "@/lib/dashboard";
import { gcalConfigured } from "@/lib/google/calendar";
import { hasLocale, getDictionary } from "@/i18n/config";
import { BookingsList, type BookingRow } from "./bookings-list";

export default async function BookingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = (await getDictionary(locale)).dashboard;

  const { business, fullName, email } = await requireBusiness(locale);
  const supabase = await createClient();

  const [{ data: bookings }, { data: biz }] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "id, starts_at, ends_at, status, service_name, customer_name, customer_phone, customer_notes, price_cents",
      )
      .eq("business_id", business.id)
      .order("starts_at", { ascending: false }),
    supabase
      .from("businesses")
      .select("timezone")
      .eq("id", business.id)
      .maybeSingle(),
  ]);

  // Show the "Sync Google" button only when the shop has a connected calendar
  // (tokens are server-only, so this is read with the admin client).
  let hasGcal = false;
  if (gcalConfigured()) {
    const { count } = await createAdminClient()
      .from("calendar_connections")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id);
    hasGcal = (count ?? 0) > 0;
  }

  return (
    <>
      <Topbar
        locale={locale}
        title={t.navBookings}
        subtitle={t.bookings.subtitle}
        userLabel={fullName || email || ""}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <BookingsList
          locale={locale}
          timeZone={biz?.timezone || "Europe/Athens"}
          initial={(bookings ?? []) as BookingRow[]}
          hasGcal={hasGcal}
        />
      </div>
    </>
  );
}
