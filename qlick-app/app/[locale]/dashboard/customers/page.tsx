import { notFound } from "next/navigation";
import { Topbar } from "@/components/dashboard/topbar";
import { requireBusiness } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";
import { hasLocale, getDictionary } from "@/i18n/config";
import { CustomersManager } from "./customers-manager";
import { listCustomers } from "./actions";

export default async function CustomersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = (await getDictionary(locale)).dashboard;

  const { business, fullName, email } = await requireBusiness(locale);
  const supabase = await createClient();
  const [{ data: bizRow }, res] = await Promise.all([
    supabase
      .from("businesses")
      .select("timezone")
      .eq("id", business.id)
      .maybeSingle(),
    listCustomers(),
  ]);
  const tz = (bizRow as { timezone?: string } | null)?.timezone || "Europe/Athens";

  return (
    <>
      <Topbar
        locale={locale}
        title={t.navCustomers}
        subtitle={t.customers.subtitle}
        userLabel={fullName || email || ""}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <CustomersManager
          locale={locale}
          tz={tz}
          initialCustomers={res.customers ?? []}
        />
      </div>
    </>
  );
}
