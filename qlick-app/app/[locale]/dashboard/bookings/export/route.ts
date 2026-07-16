import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { hasLocale, getDictionary } from "@/i18n/config";
import { localDateInZone } from "@/lib/calendar";
import { formatInZone } from "@/lib/availability";

/**
 * Export every booking as .xlsx — the business's own data, theirs to keep
 * (backup, accountant, moving elsewhere). The first columns mirror the import
 * template so the file round-trips.
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

  const [{ data: bookings }, { data: staffRows }] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "starts_at, ends_at, status, source, service_name, staff_id, customer_name, customer_phone, customer_notes, price_cents",
      )
      .eq("business_id", biz.id)
      .order("starts_at", { ascending: true }),
    supabase.from("staff").select("id, name").eq("business_id", biz.id),
  ]);
  const staffName = new Map((staffRows ?? []).map((s) => [s.id, s.name]));

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

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(t.templateSheet, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  ws.columns = [
    { header: t.hdrDate, key: "date", width: 12 },
    { header: t.hdrTime, key: "time", width: 8 },
    { header: t.hdrName, key: "name", width: 26 },
    { header: t.hdrPhone, key: "phone", width: 16 },
    { header: t.hdrService, key: "service", width: 24 },
    { header: t.hdrStaff, key: "staff", width: 20 },
    { header: t.hdrDuration, key: "duration", width: 10 },
    { header: t.hdrPrice, key: "price", width: 11 },
    { header: t.hdrNotes, key: "notes", width: 32 },
    { header: t.hdrStatus, key: "status", width: 14 },
    { header: t.hdrSource, key: "source", width: 14 },
  ];
  const head = ws.getRow(1);
  head.font = { bold: true };
  head.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF3E3BC" },
  };
  head.border = { bottom: { style: "medium", color: { argb: "FF8A6D1F" } } };
  ws.getColumn(8).numFmt = '#,##0.00 "€"';

  for (const b of bookings ?? []) {
    const [y, mo, d] = localDateInZone(b.starts_at, tz).split("-");
    ws.addRow({
      date: `${d}/${mo}/${y}`,
      time: formatInZone(new Date(b.starts_at), tz),
      name: b.customer_name,
      phone: b.customer_phone,
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
