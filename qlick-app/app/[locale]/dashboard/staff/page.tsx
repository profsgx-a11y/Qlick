import { notFound } from "next/navigation";
import { Topbar } from "@/components/dashboard/topbar";
import { createClient } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/dashboard";
import { hasLocale, getDictionary } from "@/i18n/config";
import {
  StaffManager,
  type StaffRow,
  type ServiceOption,
} from "./staff-manager";

export default async function StaffPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const tt = (await getDictionary(locale)).dashboard;

  const { business, fullName, email } = await requireBusiness(locale);
  const supabase = await createClient();

  const [{ data: staff }, { data: services }] = await Promise.all([
    supabase
      .from("staff")
      .select("id, name, title, color, avatar_url, is_active, is_bookable")
      .eq("business_id", business.id)
      .order("order_index")
      .order("created_at"),
    supabase
      .from("services")
      .select("id, name")
      .eq("business_id", business.id)
      .order("order_index")
      .order("created_at"),
  ]);

  // Map staff -> assigned service ids
  const staffIds = (staff ?? []).map((s) => s.id);
  const assignments =
    staffIds.length > 0
      ? (
          await supabase
            .from("service_staff")
            .select("staff_id, service_id")
            .in("staff_id", staffIds)
        ).data ?? []
      : [];

  const byStaff = new Map<string, string[]>();
  for (const a of assignments) {
    const arr = byStaff.get(a.staff_id) ?? [];
    arr.push(a.service_id);
    byStaff.set(a.staff_id, arr);
  }

  const { data: ratingRows } = await supabase
    .from("staff_ratings")
    .select("staff_id, avg_rating, review_count")
    .eq("business_id", business.id);
  const ratings: Record<string, { avg: number; count: number }> = {};
  for (const r of ratingRows ?? []) {
    if (r.staff_id)
      ratings[r.staff_id] = {
        avg: Number(r.avg_rating ?? 0),
        count: r.review_count ?? 0,
      };
  }

  const rows: StaffRow[] = (staff ?? []).map((s) => ({
    ...s,
    service_ids: byStaff.get(s.id) ?? [],
  }));

  return (
    <>
      <Topbar
        locale={locale}
        title={tt.navStaff}
        subtitle={tt.staff.subtitle}
        userLabel={fullName || email || ""}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <StaffManager
          locale={locale}
          businessId={business.id}
          ratings={ratings}
          initialStaff={rows}
          services={(services ?? []) as ServiceOption[]}
        />
      </div>
    </>
  );
}
