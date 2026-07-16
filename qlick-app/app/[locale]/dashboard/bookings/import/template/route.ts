import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { hasLocale, getDictionary } from "@/i18n/config";

/**
 * Downloadable .xlsx import template, personalized per business: the service
 * and staff columns carry dropdowns fed by the business's real catalog (via a
 * hidden "Lists" sheet, so long lists don't hit Excel's 255-char inline cap).
 * Suggestions only — free text stays allowed and is resolved by the wizard.
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
  const serviceNames = (services ?? []).map((s) => s.name);
  const staffNames = (staff ?? []).map((s) => s.name);

  const wb = new ExcelJS.Workbook();

  // ── Sheet 1: the fill-in table ─────────────────────────────────
  const ws = wb.addWorksheet(t.templateSheet, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  ws.columns = [
    { header: t.hdrDate, key: "date", width: 14 },
    { header: t.hdrTime, key: "time", width: 9 },
    { header: t.hdrName, key: "name", width: 26 },
    { header: t.hdrPhone, key: "phone", width: 16 },
    { header: t.hdrService, key: "service", width: 24 },
    { header: t.hdrStaff, key: "staff", width: 20 },
    { header: t.hdrDuration, key: "duration", width: 16 },
    { header: t.hdrPrice, key: "price", width: 11 },
    { header: t.hdrNotes, key: "notes", width: 32 },
  ];
  const head = ws.getRow(1);
  head.font = { bold: true };
  head.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF3E3BC" },
  };
  head.border = { bottom: { style: "medium", color: { argb: "FF8A6D1F" } } };
  ws.getColumn(1).numFmt = "dd/mm/yyyy";
  ws.getColumn(2).numFmt = "hh:mm";
  ws.getColumn(8).numFmt = '#,##0.00 "€"';

  // ── Hidden sheet with the dropdown sources ─────────────────────
  const lists = wb.addWorksheet("Lists", { state: "hidden" });
  serviceNames.forEach((n, i) => (lists.getCell(i + 1, 1).value = n));
  staffNames.forEach((n, i) => (lists.getCell(i + 1, 2).value = n));

  // `dataValidations` exists at runtime but is missing from exceljs's types;
  // the range form avoids emitting one validation object per cell.
  const validations = (
    ws as unknown as {
      dataValidations: { add(range: string, dv: ExcelJS.DataValidation): void };
    }
  ).dataValidations;
  if (serviceNames.length > 0) {
    validations.add("E2:E1001", {
      type: "list",
      allowBlank: true,
      showErrorMessage: false,
      formulae: [`Lists!$A$1:$A$${serviceNames.length}`],
    });
  }
  if (staffNames.length > 0) {
    validations.add("F2:F1001", {
      type: "list",
      allowBlank: true,
      showErrorMessage: false,
      formulae: [`Lists!$B$1:$B$${staffNames.length}`],
    });
  }

  // ── Sheet 2: instructions ──────────────────────────────────────
  const info = wb.addWorksheet(t.instructionsSheet);
  info.getColumn(1).width = 110;
  info.getCell(1, 1).value = t.instructionsTitle;
  info.getCell(1, 1).font = { bold: true, size: 14 };
  t.instructions.forEach((line, i) => {
    const cell = info.getCell(i + 3, 1);
    cell.value = `• ${line}`;
    cell.alignment = { wrapText: true, vertical: "top" };
  });

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
