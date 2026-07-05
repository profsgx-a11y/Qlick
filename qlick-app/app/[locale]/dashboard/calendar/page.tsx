import { notFound } from "next/navigation";
import { Topbar } from "@/components/dashboard/topbar";
import { createClient } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/dashboard";
import { hasLocale, getDictionary } from "@/i18n/config";
import {
  buildDayWindow,
  dayRangeUtc,
  todayInZone,
  rollingWeekDays,
  monthGridDays,
  localDateInZone,
  minutesFromMidnight,
  type CalBooking,
  type CalStaff,
  type DayWindow,
  type OpenInterval,
} from "@/lib/calendar";
import { dayOfWeekInZone, type DayHours, type Closure } from "@/lib/availability";
import { CalendarClient } from "./calendar-client";

type ViewMode = "day" | "week" | "month";

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dash = (await getDictionary(locale)).dashboard;
  const { business, fullName, email, userId } = await requireBusiness(locale);
  const supabase = await createClient();

  const { data: biz } = await supabase
    .from("businesses")
    .select("timezone, bookings_paused")
    .eq("id", business.id)
    .maybeSingle();
  const tz = biz?.timezone || "Europe/Athens";
  const bookingsPaused = biz?.bookings_paused ?? false;

  const sp = await searchParams;
  // "Day" view was removed — Week is the default, Month the only alternative.
  const view: ViewMode = sp.view === "month" ? "month" : "week";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "")
    ? (sp.date as string)
    : todayInZone(tz);

  // Date span to fetch (single day, Mon–Sun week, or the month grid).
  const days =
    view === "month"
      ? monthGridDays(date)
      : view === "week"
        ? rollingWeekDays(date)
        : [date];
  const { from } = dayRangeUtc(days[0], tz);
  const { to } = dayRangeUtc(days[days.length - 1], tz);

  const [
    { data: staffRows },
    { data: hourRows },
    { data: closureRows },
    { data: bookingRows },
    { data: serviceRows },
  ] = await Promise.all([
    supabase
      .from("staff")
      .select("id, name, color, avatar_url")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .order("order_index")
      .order("created_at"),
    supabase
      .from("business_hours")
      .select("day_of_week, is_closed, open_time, close_time")
      .eq("business_id", business.id),
    supabase
      .from("business_closures")
      .select("date, is_closed, special_open_time, special_close_time")
      .eq("business_id", business.id)
      .gte("date", days[0])
      .lte("date", days[days.length - 1]),
    supabase
      .from("bookings")
      .select(
        "id, starts_at, ends_at, staff_id, status, service_id, service_name, customer_id, customer_name, customer_phone, no_staff_preference, service:services(color)",
      )
      .eq("business_id", business.id)
      // Cancelled bookings stay only in the bookings list, not on the calendar.
      .neq("status", "cancelled")
      .gte("starts_at", from.toISOString())
      .lt("starts_at", to.toISOString())
      .order("starts_at"),
    supabase
      .from("services")
      .select("id, name, duration_minutes, price_cents, color")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .order("order_index")
      .order("created_at"),
  ]);

  const staff: CalStaff[] = (staffRows ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    color: s.color,
    avatarUrl: s.avatar_url,
  }));

  const bookings: CalBooking[] = (bookingRows ?? []).map((b) => ({
    id: b.id,
    startsAt: b.starts_at,
    endsAt: b.ends_at,
    staffId: b.staff_id,
    status: b.status,
    serviceId: b.service_id,
    serviceName: b.service_name,
    customerId: b.customer_id,
    customerName: b.customer_name,
    customerPhone: b.customer_phone,
    noStaffPreference: b.no_staff_preference,
    color: (b.service as { color: string | null } | null)?.color ?? null,
  }));

  const hours = (hourRows ?? []) as DayHours[];
  const closures = (closureRows ?? []) as Closure[];

  // Per-day windows; the grid uses a combined min/max so all columns align.
  // (Month view is a different layout and doesn't need the time window.)
  let win: DayWindow = {
    startMin: 9 * 60,
    endMin: 21 * 60,
    open: [],
    isClosed: false,
  };
  let dayMeta: Record<string, { open: OpenInterval[]; isClosed: boolean }> = {};
  if (view !== "month") {
    const perDay = days.map((d) => {
      const dayBk = bookings.filter(
        (b) => localDateInZone(b.startsAt, tz) === d,
      );
      const dayCl = closures.filter((c) => c.date === d);
      return { d, win: buildDayWindow(d, tz, hours, dayCl, dayBk) };
    });
    win = {
      startMin: Math.min(...perDay.map((x) => x.win.startMin)),
      endMin: Math.max(...perDay.map((x) => x.win.endMin)),
      open: [],
      isClosed: false,
    };
    dayMeta = Object.fromEntries(
      perDay.map((x) => [x.d, { open: x.win.open, isClosed: x.win.isClosed }]),
    );
  }

  // Which services each staff can perform (for the new-booking form).
  const staffIds = staff.map((s) => s.id);
  const ssRows = staffIds.length
    ? (
        await supabase
          .from("service_staff")
          .select("staff_id, service_id")
          .in("staff_id", staffIds)
      ).data ?? []
    : [];
  const staffServices: Record<string, string[]> = {};
  for (const r of ssRows) {
    (staffServices[r.staff_id] ??= []).push(r.service_id);
  }

  // Per-(date, staff) custom hours + time-off for column tinting.
  // Keyed by `${date}|${staffId}` so it works for Day and Week (per weekday).
  const staffSchedule: Record<
    string,
    { open: OpenInterval[]; isClosed: boolean }
  > = {};
  const staffTimeOff: Record<
    string,
    { startMin: number; endMin: number; reason: string | null }[]
  > = {};
  if (view !== "month" && staffIds.length) {
    const toMin = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    const [{ data: shRows }, { data: toRows }] = await Promise.all([
      supabase
        .from("staff_hours")
        .select("staff_id, day_of_week, open_time, close_time")
        .in("staff_id", staffIds),
      supabase
        .from("staff_time_off")
        .select("staff_id, starts_at, ends_at, reason")
        .eq("business_id", business.id)
        .lt("starts_at", to.toISOString())
        .gt("ends_at", from.toISOString()),
    ]);
    const customStaff = new Set((shRows ?? []).map((r) => r.staff_id));
    // Per weekday in the visible range, derive each staff's open window.
    for (const d of days) {
      const dow = dayOfWeekInZone(d, tz);
      const dMeta = dayMeta[d] ?? { open: [], isClosed: true };
      for (const s of staff) {
        const key = `${d}|${s.id}`;
        if (!customStaff.has(s.id)) {
          staffSchedule[key] = { open: dMeta.open, isClosed: dMeta.isClosed };
        } else {
          const open = (shRows ?? [])
            .filter((r) => r.staff_id === s.id && r.day_of_week === dow)
            .map((r) => ({
              startMin: toMin(r.open_time),
              endMin: toMin(r.close_time),
            }));
          staffSchedule[key] = { open, isClosed: open.length === 0 };
        }
      }
    }
    // Split each time-off interval across the days it covers.
    for (const r of toRows ?? []) {
      for (const d of days) {
        const { from: dFrom, to: dTo } = dayRangeUtc(d, tz);
        const s = Math.max(new Date(r.starts_at).getTime(), dFrom.getTime());
        const e = Math.min(new Date(r.ends_at).getTime(), dTo.getTime());
        if (e <= s) continue;
        const startMin =
          s <= dFrom.getTime()
            ? 0
            : minutesFromMidnight(new Date(s).toISOString(), tz);
        const endMin =
          e >= dTo.getTime()
            ? 24 * 60
            : minutesFromMidnight(new Date(e).toISOString(), tz);
        (staffTimeOff[`${d}|${r.staff_id}`] ??= []).push({
          startMin,
          endMin,
          reason: r.reason,
        });
      }
    }
  }

  const services = (serviceRows ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    durationMinutes: s.duration_minutes,
    priceCents: s.price_cents,
    color: s.color,
  }));

  return (
    <>
      <Topbar
        locale={locale}
        title={dash.navCalendar}
        subtitle={dash.calendar.subtitle}
        userLabel={fullName || email || ""}
      />
      <CalendarClient
        locale={locale}
        ownerUserId={userId}
        tz={tz}
        bookingsPaused={bookingsPaused}
        view={view}
        date={date}
        today={todayInZone(tz)}
        days={days}
        dayMeta={dayMeta}
        staff={staff}
        bookings={bookings}
        win={win}
        services={services}
        staffServices={staffServices}
        staffSchedule={staffSchedule}
        staffTimeOff={staffTimeOff}
      />
    </>
  );
}
