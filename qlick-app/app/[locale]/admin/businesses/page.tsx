import { notFound } from "next/navigation";
import { Topbar } from "@/components/dashboard/topbar";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { getDictionary, hasLocale } from "@/i18n/config";
import { scanText } from "@/lib/moderation";
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
  const [{ data }, { data: modTexts }] = await Promise.all([
    supabase.rpc("admin_list_businesses"),
    supabase.rpc("admin_moderation_texts"),
  ]);

  // Flag businesses whose owner-entered text (name, description, services,
  // staff) contains suspicious words — shown as a warning in the table.
  const flags: Record<string, string[]> = {};
  for (const row of modTexts ?? []) {
    const words = scanText(row.txt);
    if (words.length > 0) flags[row.business_id] = words;
  }

  return (
    <>
      <Topbar
        locale={locale}
        title={dict.admin.businesses.title}
        subtitle={dict.admin.businesses.subtitle}
        userLabel={name || email || ""}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <BusinessesTable locale={locale} rows={data ?? []} flags={flags} />
      </div>
    </>
  );
}
