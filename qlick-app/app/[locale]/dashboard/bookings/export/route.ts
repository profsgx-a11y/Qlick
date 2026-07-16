import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { hasLocale, getDictionary } from "@/i18n/config";
import { localDateInZone } from "@/lib/calendar";
import { formatInZone } from "@/lib/availability";
import {
  addDataSheet,
  addCalendarSheet,
  addInstructionsSheet,
  excelDate,
  excelTime,
  type BookingXlsxLabels,
} from "@/lib/booking-xlsx";

/**
 * Export every booking as .xlsx — the business's own data, theirs to keep
 * (backup, accountant, moving elsewhere). Columns mirror the import template
 * so the file round-trips, dates/times are real typed cells (the "Calendar"
 * sheet's formulas read them), and email comes from the linked CRM card.
 */
export async function GET(request: NextRequest) {
  const localeSegment = request.nextUrl.pathname.split("/").filter(Boolean)[0];
  const locale = hasLocale(localeSegment) ? localeSegment : "el";
  const dict = (await getDictionary(locale)).dashboard;
  const t = dict.import;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401 });
  const { data: biz } = await supabase
    .from("my_businesses")
    .select("id, my_role, timezone")
    .limit(1)
    .maybeSingle();
  if (!biz?.id || (biz.my_role !== "owner" && biz.my_role !== "manager"))
    return new NextResponse(null, { status: 403 });
  const tz = biz.timezone || "Europe/Athens";

  const [{ data: bookings }, { data: staffRows }, { data: cards }] =
    await Promise.all([
      supabase
        .from("bookings")
        .select(
          "starts_at, ends_at, status, source, service_name, staff_id, business_customer_id, customer_name, customer_phone, customer_notes, price_cents",
        )
        .eq("business_id", biz.id)
        .order("starts_at", { ascending: true }),
      supabase.from("staff").select("id, name").eq("business_id", biz.id),
      supabase
        .from("business_customers")
        .select("id, email")
        .eq("business_id", biz.id),
    ]);
  const staffName = new Map((staffRows ?? []).map((s) => [s.id, s.name]));
  const cardEmail = new Map((cards ?? []).map((c) => [c.id, c.email]));

  const statusLabel: Record<string, string> = {
    pending: dict.bookings.statusPending,
    confirmed: dict.bookings.statusConfirmed,
    completed: dict.bookings.statusCompleted,
    cancelled: dict.bookings.statusCancelled,
    no_show: dict.bookings.statusNoShow,
  };
  const sourceLabel: Record<string, string> = {
    web: t.srcWeb,
    qr: t.srcQr,
    dashboard: t.srcDashboard,
    phone: t.srcPhone,
    import: t.srcImport,
  };

  const labels: BookingXlsxLabels = {
    sheet: t.templateSheet,
    instructionsSheet: t.instructionsSheet,
    instructionsTitle: t.instructionsTitle,
    instructions: t.instructions,
    calendarSheet: t.calendarSheet,
    calWeekFrom: t.calWeekFrom,
    calHour: t.calHour,
    hdr: {
      date: t.hdrDate,
      time: t.hdrTime,
      name: t.hdrName,
      phone: t.hdrPhone,
      email: t.hdrEmail,
      service: t.hdrService,
      staff: t.hdrStaff,
      duration: t.hdrDuration,
      price: t.hdrPrice,
      notes: t.hdrNotes,
      status: t.hdrStatus,
      source: t.hdrSource,
    },
  };

  const wb = new ExcelJS.Workbook();
  const ws = addDataSheet(wb, labels, { withStatusSource: true });

  for (const b of bookings ?? []) {
    const [y, mo, d] = localDateInZone(b.starts_at, tz).split("-").map(Number);
    const [h, mi] = formatInZone(new Date(b.starts_at), tz)
      .split(":")
      .map(Number);
    ws.addRow({
      date: excelDate(y, mo, d),
      time: excelTime(h, mi),
      name: b.customer_name,
      phone: b.customer_phone,
      email: b.business_customer_id
        ? (cardEmail.get(b.business_customer_id) ?? null)
        : null,
      service: b.service_name,
      staff: b.staff_id ? (staffName.get(b.staff_id) ?? null) : null,
      duration: Math.max(
        0,
        Math.round(
          (new Date(b.ends_at).getTime() - new Date(b.starts_at).getTime()) /
            60_000,
        ),
      ),
      price: (b.price_cents ?? 0) / 100,
      notes: b.customer_notes,
      status: statusLabel[b.status] ?? b.status,
      source: sourceLabel[b.source] ?? b.source,
    });
  }

  addCalendarSheet(wb, labels);
  addInstructionsSheet(wb, labels);

  const buf = (await wb.xlsx.writeBuffer()) as unknown as Uint8Array;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="qlick-bookings.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
