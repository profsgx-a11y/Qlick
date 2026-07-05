import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { requireAdmin } from "@/lib/admin";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { MobileNavProvider } from "@/components/dashboard/mobile-nav";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  await requireAdmin(locale);

  return (
    <MobileNavProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <AdminSidebar locale={locale} />
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">{children}</div>
      </div>
    </MobileNavProvider>
  );
}
