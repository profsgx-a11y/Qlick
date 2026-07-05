import { notFound } from "next/navigation";
import { Topbar } from "@/components/dashboard/topbar";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { getDictionary, hasLocale } from "@/i18n/config";
import { BusinessesTable } from "./businesses-table";

export default async function AdminBusinessesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const { name, email } = await requireAdmin(locale);
  const dict = await getDictionary(locale);

  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_list_businesses");

  return (
    <>
      <Topbar
        locale={locale}
        title={dict.admin.businesses.title}
        subtitle={dict.admin.businesses.subtitle}
        userLabel={name || email || ""}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <BusinessesTable locale={locale} rows={data ?? []} />
      </div>
    </>
  );
}
