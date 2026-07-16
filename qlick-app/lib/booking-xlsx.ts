/**
 * Shared workbook builders for the appointment import template and the
 * bookings export — same column layout in both so files round-trip.
 *
 * Includes a "Calendar" sheet: a Google-Calendar-style weekly grid driven by
 * live Excel formulas over the data sheet. Change the week-start cell and the
 * grid re-renders; type/import rows and they appear. No macros (an .xlsm
 * would trip security warnings), and no TEXT() format-string literals — those
 * are locale-dependent (Greek Excel expects ηη/μμ codes), so day names come
 * from cell number formats (which Excel localizes) and times are composed
 * with HOUR()/MINUTE().
 */

import type ExcelJS from "exceljs";

export interface BookingXlsxLabels {
  /** data sheet name — also referenced inside the calendar formulas */
  sheet: string;
  instructionsSheet: string;
  instructionsTitle: string;
  instructions: string[];
  calendarSheet: string;
  calWeekFrom: string;
  calHour: string;
  hdr: {
    date: string;
    time: string;
    name: string;
    phone: string;
    email: string;
    service: string;
    staff: string;
    duration: string;
    price: string;
    notes: string;
    status: string;
    source: string;
  };
}

/** Rows the calendar formulas & dropdown validations cover on the data sheet. */
const DATA_LAST_ROW = 10001;
const CAL_FIRST_HOUR = 7;
const CAL_LAST_HOUR = 22;

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF3E3BC" },
};

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.fill = HEADER_FILL;
  row.border = { bottom: { style: "medium", color: { argb: "FF8A6D1F" } } };
}

/** Excel stores times as day fractions; exceljs takes them as 1899-epoch dates. */
export function excelTime(h: number, m = 0): Date {
  return new Date(Date.UTC(1899, 11, 30, h, m));
}

/** A pure date cell (UTC midnight — matches how the parser reads Date cells). */
export function excelDate(y: number, mo: number, d: number): Date {
  return new Date(Date.UTC(y, mo - 1, d));
}

/**
 * The fill-in / export table. Column layout (fixed — the calendar formulas
 * reference A/B/C/F by letter): A date, B time, C name, D phone, E email,
 * F service, G staff, H duration, I price, J notes [, K status, L source].
 */
export function addDataSheet(
  wb: ExcelJS.Workbook,
  labels: BookingXlsxLabels,
  opts: { withStatusSource?: boolean } = {},
): ExcelJS.Worksheet {
  const ws = wb.addWorksheet(labels.sheet, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  ws.columns = [
    { header: labels.hdr.date, key: "date", width: 13 },
    { header: labels.hdr.time, key: "time", width: 8 },
    { header: labels.hdr.name, key: "name", width: 24 },
    { header: labels.hdr.phone, key: "phone", width: 15 },
    { header: labels.hdr.email, key: "email", width: 24 },
    { header: labels.hdr.service, key: "service", width: 22 },
    { header: labels.hdr.staff, key: "staff", width: 18 },
    { header: labels.hdr.duration, key: "duration", width: 15 },
    { header: labels.hdr.price, key: "price", width: 10 },
    { header: labels.hdr.notes, key: "notes", width: 30 },
    ...(opts.withStatusSource
      ? [
          { header: labels.hdr.status, key: "status", width: 14 },
          { header: labels.hdr.source, key: "source", width: 13 },
        ]
      : []),
  ];
  styleHeaderRow(ws.getRow(1));
  ws.getColumn(1).numFmt = "dd/mm/yyyy";
  ws.getColumn(2).numFmt = "hh:mm";
  ws.getColumn(9).numFmt = '#,##0.00 "€"';
  return ws;
}

/**
 * Hidden "Lists" sheet + dropdowns on the service/staff columns. A sheet-range
 * source avoids Excel's 255-char cap on inline lists; suggestions only —
 * free text stays allowed (showErrorMessage: false) and the wizard maps it.
 */
export function addCatalogDropdowns(
  wb: ExcelJS.Workbook,
  ws: ExcelJS.Worksheet,
  serviceNames: string[],
  staffNames: string[],
): void {
  const lists = wb.addWorksheet("Lists", { state: "hidden" });
  serviceNames.forEach((n, i) => (lists.getCell(i + 1, 1).value = n));
  staffNames.forEach((n, i) => (lists.getCell(i + 1, 2).value = n));

  // `dataValidations` exists at runtime but is missing from exceljs's types.
  const validations = (
    ws as unknown as {
      dataValidations: { add(range: string, dv: ExcelJS.DataValidation): void };
    }
  ).dataValidations;
  if (serviceNames.length > 0) {
    validations.add(`F2:F${DATA_LAST_ROW}`, {
      type: "list",
      allowBlank: true,
      showErrorMessage: false,
      formulae: [`Lists!$A$1:$A$${serviceNames.length}`],
    });
  }
  if (staffNames.length > 0) {
    validations.add(`G2:G${DATA_LAST_ROW}`, {
      type: "list",
      allowBlank: true,
      showErrorMessage: false,
      formulae: [`Lists!$B$1:$B$${staffNames.length}`],
    });
  }
}

/**
 * Weekly calendar view over the data sheet. B1 holds the week's Monday
 * (editable; defaults to the current week via a formula), row 2 shows the 7
 * day headers, and every day×hour cell TEXTJOINs the matching appointments
 * ("10:30 Μάκης · Κούρεμα", one per line).
 */
export function addCalendarSheet(
  wb: ExcelJS.Workbook,
  labels: BookingXlsxLabels,
): ExcelJS.Worksheet {
  const ws = wb.addWorksheet(labels.calendarSheet, {
    views: [{ state: "frozen", xSplit: 1, ySplit: 2 }],
  });
  // Sheet names must be single-quoted in formulas (Greek names, spaces…).
  const S = `'${labels.sheet.replace(/'/g, "''")}'`;
  const dates = `${S}!$A$2:$A$${DATA_LAST_ROW}`;
  const times = `${S}!$B$2:$B$${DATA_LAST_ROW}`;
  const names = `${S}!$C$2:$C$${DATA_LAST_ROW}`;
  const services = `${S}!$F$2:$F$${DATA_LAST_ROW}`;

  ws.getColumn(1).width = 9;
  for (let c = 2; c <= 8; c++) ws.getColumn(c).width = 26;

  // Row 1: editable week-start (defaults to this week's Monday).
  const label = ws.getCell(1, 1);
  label.value = labels.calWeekFrom;
  label.font = { bold: true };
  const weekStart = ws.getCell(1, 2);
  weekStart.value = { formula: "TODAY()-WEEKDAY(TODAY(),3)" };
  weekStart.numFmt = "dd/mm/yyyy";
  weekStart.font = { bold: true };
  weekStart.fill = HEADER_FILL;
  weekStart.border = {
    top: { style: "thin", color: { argb: "FF8A6D1F" } },
    bottom: { style: "thin", color: { argb: "FF8A6D1F" } },
    left: { style: "thin", color: { argb: "FF8A6D1F" } },
    right: { style: "thin", color: { argb: "FF8A6D1F" } },
  };
  ws.getRow(1).height = 22;

  // Row 2: hour-column label + the 7 day headers. Day names come from the
  // "ddd dd/mm" number format, which Excel renders in the viewer's language.
  const hourHead = ws.getCell(2, 1);
  hourHead.value = labels.calHour;
  const dayLetters = ["B", "C", "D", "E", "F", "G", "H"];
  for (let d = 0; d < 7; d++) {
    const cell = ws.getCell(2, d + 2);
    cell.value = { formula: d === 0 ? "$B$1" : `$B$1+${d}` };
    cell.numFmt = "ddd dd/mm";
    cell.alignment = { horizontal: "center" };
  }
  styleHeaderRow(ws.getRow(2));

  const grid = { style: "thin" as const, color: { argb: "FFE3DDCF" } };
  for (let h = CAL_FIRST_HOUR; h <= CAL_LAST_HOUR; h++) {
    const r = 3 + (h - CAL_FIRST_HOUR);
    const row = ws.getRow(r);
    row.height = 46;

    const hourCell = ws.getCell(r, 1);
    hourCell.value = excelTime(h);
    hourCell.numFmt = "hh:mm";
    hourCell.font = { size: 9, color: { argb: "FF8A8A8A" } };
    hourCell.alignment = { vertical: "top", horizontal: "right" };
    hourCell.border = { top: grid, right: grid };

    for (let d = 0; d < 7; d++) {
      const cell = ws.getCell(r, d + 2);
      const day = `${dayLetters[d]}$2`;
      // Locale-proof "HH:MM Name · Service" per matching row.
      cell.value = {
        formula:
          `TEXTJOIN(CHAR(10),TRUE,IF((${dates}=${day})*(HOUR(${times})=HOUR($A${r})),` +
          `HOUR(${times})&":"&RIGHT("0"&MINUTE(${times}),2)&" "&${names}` +
          `&IF(${services}="","","  · "&${services}),""))`,
      };
      cell.font = { size: 9 };
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = { top: grid, right: grid };
      if (d >= 5) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFAF7F0" },
        }; // weekend tint
      }
    }
  }
  return ws;
}

export function addInstructionsSheet(
  wb: ExcelJS.Workbook,
  labels: BookingXlsxLabels,
): ExcelJS.Worksheet {
  const ws = wb.addWorksheet(labels.instructionsSheet);
  ws.getColumn(1).width = 110;
  const title = ws.getCell(1, 1);
  title.value = labels.instructionsTitle;
  title.font = { bold: true, size: 14 };
  labels.instructions.forEach((line, i) => {
    const cell = ws.getCell(i + 3, 1);
    cell.value = `• ${line}`;
    cell.alignment = { wrapText: true, vertical: "top" };
  });
  return ws;
}
