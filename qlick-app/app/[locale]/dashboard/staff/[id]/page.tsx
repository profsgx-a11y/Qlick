import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { createClient } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/dashboard";
import { hasLocale, getDictionary } from "@/i18n/config";
import {
  ScheduleEditor,
  type TimeOffRow,
} from "./schedule-editor";

export default async function StaffSchedulePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!hasLocale(locale)) notFound();
  const tt = (await getDictionary(locale)).dashboard;

  const { business, fullName, email } = await requireBusiness(locale);
  const supabase = await createClient();

  const { data: staff } = await supabase
    .from("staff")
    .select("id, name")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!staff) notFound();

  const [{ data: biz }, { data: bHours }, { data: sHours }, { data: timeOff }] =
    await Promise.all([
      supabase
        .from("businesses")
        .select("timezone")
        .eq("id", business.id)
        .maybeSingle(),
      supabase
        .from("business_hours")
        .select("day_of_week, is_closed, open_time, close_time")
        .eq("business_id", business.id),
      supabase
        .from("staff_hours")
        .select("day_of_week, open_time, close_time, order_index")
        .eq("staff_id", id)
        .order("day_of_week")
        .order("order_index"),
      supabase
        .from("staff_time_off")
        .select("id, type, starts_at, ends_at, reason")
        .eq("staff_id", id)
        .order("starts_at", { ascending: false }),
    ]);

  const tz = biz?.timezone || "Europe/Athens";

  const businessHours = (bHours ?? [])
    .filter((h) => !h.is_closed && h.open_time && h.close_time)
    .map((h) => ({
      day_of_week: h.day_of_week,
      open_time: h.open_time as string,
      close_time: h.close_time as string,
    }));

  const initialDays: Record<number, { open: string; close: string }[]> = {};
  for (let d = 0; d < 7; d++) initialDays[d] = [];
  for (const r of sHours ?? [])
    initialDays[r.day_of_week].push({
      open: r.open_time.slice(0, 5),
      close: r.close_time.slice(0, 5),
    });

  return (
    <>
      <Topbar
        locale={locale}
        title={`${staff.name} — ${tt.staff.scheduleTitleSuffix}`}
        subtitle={tt.staff.scheduleSubtitle}
        userLabel={fullName || email || ""}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <Link
          href={`/${locale}/dashboard/staff`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {tt.staff.backToStaff}
        </Link>
        <ScheduleEditor
          locale={locale}
          tz={tz}
          staffId={staff.id}
          businessHours={businessHours}
          initialCustom={(sHours ?? []).length > 0}
          initialDays={initialDays}
          initialTimeOff={(timeOff ?? []) as TimeOffRow[]}
        />
      </div>
    </>
  );
}
