import { notFound } from "next/navigation";
import { Topbar } from "@/components/dashboard/topbar";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { getDictionary, hasLocale } from "@/i18n/config";
import { UsersTable } from "./users-table";

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const { name, email } = await requireAdmin(locale);
  const dict = await getDictionary(locale);

  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_list_users");

  return (
    <>
      <Topbar
        locale={locale}
        title={dict.admin.users.title}
        subtitle={dict.admin.users.subtitle}
        userLabel={name || email || ""}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <UsersTable locale={locale} rows={data ?? []} />
      </div>
    </>
  );
}
