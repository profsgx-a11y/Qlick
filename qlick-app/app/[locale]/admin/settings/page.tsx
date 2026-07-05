import { notFound } from "next/navigation";
import { Topbar } from "@/components/dashboard/topbar";
import { requireAdmin } from "@/lib/admin";
import { getDictionary, hasLocale } from "@/i18n/config";
import { AdminAccountForm } from "./settings-form";

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const { name, email } = await requireAdmin(locale);
  const dict = await getDictionary(locale);

  return (
    <>
      <Topbar
        locale={locale}
        title={dict.admin.account.title}
        subtitle={dict.admin.account.subtitle}
        userLabel={name || email || ""}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <AdminAccountForm currentEmail={email ?? ""} />
      </div>
    </>
  );
}
