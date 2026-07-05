import { notFound } from "next/navigation";
import { Topbar } from "@/components/dashboard/topbar";
import { createClient } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/dashboard";
import { hasLocale, getDictionary } from "@/i18n/config";
import { ServicesManager, type ServiceRow } from "./services-manager";

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = (await getDictionary(locale)).dashboard;

  const { business, fullName, email } = await requireBusiness(locale);
  const supabase = await createClient();

  const { data: services } = await supabase
    .from("services")
    .select("id, name, description, duration_minutes, price_cents, is_active")
    .eq("business_id", business.id)
    .order("order_index")
    .order("created_at");

  return (
    <>
      <Topbar
        locale={locale}
        title={t.navServices}
        subtitle={t.services.subtitle}
        userLabel={fullName || email || ""}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <ServicesManager
          locale={locale}
          initialServices={(services ?? []) as ServiceRow[]}
        />
      </div>
    </>
  );
}
