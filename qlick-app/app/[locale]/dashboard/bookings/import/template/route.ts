import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { hasLocale, getDictionary } from "@/i18n/config";
import {
  addDataSheet,
  addCatalogDropdowns,
  addCalendarSheet,
  addInstructionsSheet,
  type BookingXlsxLabels,
} from "@/lib/booking-xlsx";

/**
 * Downloadable .xlsx import template, personalized per business: the service
 * and staff columns carry dropdowns fed by the business's real catalog, and a
 * live "Calendar" sheet shows whatever gets typed as a weekly schedule.
 */
export async function GET(request: NextRequest) {
  const localeSegment = request.nextUrl.pathname.split("/").filter(Boolean)[0];
  const locale = hasLocale(localeSegment) ? localeSegment : "el";
  const t = (await getDictionary(locale)).dashboard.import;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401 });
  const { data: biz } = await supabase
    .from("my_businesses")
    .select("id, my_role")
    .limit(1)
    .maybeSingle();
  if (!biz?.id || (biz.my_role !== "owner" && biz.my_role !== "manager"))
    return new NextResponse(null, { status: 403 });

  const [{ data: services }, { data: staff }] = await Promise.all([
    supabase
      .from("services")
      .select("name")
      .eq("business_id", biz.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("staff")
      .select("name")
      .eq("business_id", biz.id)
      .eq("is_active", true)
      .order("name"),
  ]);

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

  // Order matters: the data sheet must stay the FIRST visible sheet — that's
  // the one the upload parser reads when the template comes back.
  const wb = new ExcelJS.Workbook();
  const ws = addDataSheet(wb, labels);
  addCatalogDropdowns(
    wb,
    ws,
    (services ?? []).map((s) => s.name),
    (staff ?? []).map((s) => s.name),
  );
  addCalendarSheet(wb, labels);
  addInstructionsSheet(wb, labels);

  const buf = (await wb.xlsx.writeBuffer()) as unknown as Uint8Array;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="qlick-import-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
