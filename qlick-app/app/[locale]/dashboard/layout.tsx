import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { requireBusiness } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileNavProvider } from "@/components/dashboard/mobile-nav";
import { SubscriptionBanner } from "@/components/dashboard/subscription-banner";
import { getPlanState } from "@/lib/subscription";
import {
  PastDueReminder,
  type PastDueBooking,
} from "@/components/dashboard/past-due-reminder";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const { business } = await requireBusiness(locale);

  // Past appointments still awaiting an outcome (already ended but not marked
  // completed / no-show / cancelled). Drives the auto-opening reminder.
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const planState = await getPlanState(supabase, business.id);
  const [{ data: bizRow }, { data: pastDueRows }] = await Promise.all([
    supabase
      .from("businesses")
      .select("timezone")
      .eq("id", business.id)
      .maybeSingle(),
    supabase
      .from("bookings")
      .select("id, starts_at, ends_at, customer_name, customer_phone, service_name")
      .eq("business_id", business.id)
      .in("status", ["pending", "confirmed"])
      .lt("ends_at", nowIso)
      .order("starts_at", { ascending: false }),
  ]);
  const pastDue: PastDueBooking[] = (pastDueRows ?? []).map((b) => ({
    id: b.id,
    startsAt: b.starts_at,
    endsAt: b.ends_at,
    customerName: b.customer_name,
    customerPhone: b.customer_phone,
    serviceName: b.service_name,
  }));
  const tz = (bizRow as { timezone?: string } | null)?.timezone || "Europe/Athens";

  return (
    <MobileNavProvider>
      <div className="flex h-screen overflow-hidden bg-dashboard">
        <Sidebar
          locale={locale}
          businessName={business.name}
          businessSlug={business.slug}
          businessStatus={business.status}
        />
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <SubscriptionBanner
            locale={locale}
            state={{
              plan: planState.plan,
              active: planState.active,
              daysLeft: planState.daysLeft,
            }}
          />
          {children}
        </div>
        <PastDueReminder locale={locale} tz={tz} initial={pastDue} />
      </div>
    </MobileNavProvider>
  );
}
