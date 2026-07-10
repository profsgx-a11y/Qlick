import { notFound } from "next/navigation";
import { Topbar } from "@/components/dashboard/topbar";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { getDictionary, hasLocale } from "@/i18n/config";
import { BookingsExplorer, BOOKINGS_PAGE_SIZE } from "./bookings-explorer";

const STATUSES = ["pending", "confirmed", "completed", "cancelled", "no_show"];
const SOURCES = ["qr", "web", "dashboard", "phone"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function AdminBookingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const { name, email } = await requireAdmin(locale);
  const dict = await getDictionary(locale);

  const sp = await searchParams;
  const first = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v) ?? "";

  const q = first(sp.q).trim();
  const status = STATUSES.includes(first(sp.status)) ? first(sp.status) : "";
  const source = SOURCES.includes(first(sp.source)) ? first(sp.source) : "";
  const from = DATE_RE.test(first(sp.from)) ? first(sp.from) : "";
  const to = DATE_RE.test(first(sp.to)) ? first(sp.to) : "";
  const page = Math.max(1, parseInt(first(sp.page), 10) || 1);

  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_list_bookings", {
    p_query: q || undefined,
    p_status: status || undefined,
    p_source: source || undefined,
    p_from: from || undefined,
    p_to: to || undefined,
    p_limit: BOOKINGS_PAGE_SIZE,
    p_offset: (page - 1) * BOOKINGS_PAGE_SIZE,
  });

  return (
    <>
      <Topbar
        locale={locale}
        title={dict.admin.bookings.title}
        subtitle={dict.admin.bookings.subtitle}
        userLabel={name || email || ""}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <BookingsExplorer
          locale={locale}
          rows={data ?? []}
          page={page}
          filters={{ q, status, source, from, to }}
        />
      </div>
    </>
  );
}
