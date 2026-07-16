import { notFound } from "next/navigation";
import { Topbar } from "@/components/dashboard/topbar";
import { createClient } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/dashboard";
import { hasLocale, getDictionary } from "@/i18n/config";
import { ImportWizard } from "./import-wizard";

export default async function ImportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = (await getDictionary(locale)).dashboard;

  const { business, fullName, email } = await requireBusiness(locale);
  const supabase = await createClient();

  // Full catalog (inactive too): the mapping dropdowns must cover services and
  // people that appear in historical rows even if they're switched off today.
  const [{ data: services }, { data: staff }] = await Promise.all([
    supabase
      .from("services")
      .select("id, name")
      .eq("business_id", business.id)
      .order("name"),
    supabase
      .from("staff")
      .select("id, name")
      .eq("business_id", business.id)
      .order("name"),
  ]);

  return (
    <>
      <Topbar
        locale={locale}
        title={t.import.title}
        subtitle={t.import.subtitle}
        userLabel={fullName || email || ""}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <ImportWizard
          locale={locale}
          services={services ?? []}
          staff={staff ?? []}
        />
      </div>
    </>
  );
}
