import { notFound } from "next/navigation";
import { Topbar } from "@/components/dashboard/topbar";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { getDictionary, hasLocale } from "@/i18n/config";
import { CategoriesManager } from "./categories-manager";

export default async function AdminCategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const { name, email } = await requireAdmin(locale);
  const dict = await getDictionary(locale);

  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, slug, name_el, name_en, parent_id, order_index")
    .order("order_index");

  return (
    <>
      <Topbar
        locale={locale}
        title={dict.admin.categories.title}
        subtitle={dict.admin.categories.subtitle}
        userLabel={name || email || ""}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <CategoriesManager locale={locale} categories={data ?? []} />
      </div>
    </>
  );
}
