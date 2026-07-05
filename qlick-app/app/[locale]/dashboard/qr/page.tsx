import { notFound } from "next/navigation";
import { Topbar } from "@/components/dashboard/topbar";
import { createClient } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/dashboard";
import { hasLocale, getDictionary } from "@/i18n/config";
import {
  buildDefaultTemplate,
  type QrDesign,
  type TableRow,
} from "@/lib/qr-template";
import { QrEditorLoader } from "./qr-editor-loader";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://qlick.gr";

const DAY_UP = [
  "ΚΥΡΙΑΚΗ",
  "ΔΕΥΤΕΡΑ",
  "ΤΡΙΤΗ",
  "ΤΕΤΑΡΤΗ",
  "ΠΕΜΠΤΗ",
  "ΠΑΡΑΣΚΕΥΗ",
  "ΣΑΒΒΑΤΟ",
];

export default async function QrPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = (await getDictionary(locale)).dashboard;

  const { business, fullName, email } = await requireBusiness(locale);
  const supabase = await createClient();

  const [{ data: bizRow }, { data: hours }, { data: template }] =
    await Promise.all([
      supabase
        .from("businesses")
        .select("name, created_at, day_order, logo_url")
        .eq("id", business.id)
        .maybeSingle(),
      supabase
        .from("business_hours")
        .select("day_of_week, is_closed, open_time, close_time")
        .eq("business_id", business.id)
        .order("day_of_week"),
      supabase
        .from("qr_templates")
        .select("config")
        .eq("business_id", business.id)
        .eq("is_default", true)
        .limit(1)
        .maybeSingle(),
    ]);

  const bookingUrl = `${SITE_URL}/${locale}/b/${business.slug}`;
  // The poster QR carries a `src=qr` marker so QR-originated bookings are
  // attributable in reports (kept off the editor's bookingUrl prop, which also
  // feeds the export filename slug).
  const qrUrl = `${bookingUrl}?src=qr`;
  const est = bizRow?.created_at
    ? `EST. ${new Date(bizRow.created_at).getFullYear()}`
    : undefined;

  // Schedule rows from the business hours (in the saved day order) — used to
  // (re)fill the QR poster table from Settings.
  const dayOrder = (
    Array.isArray(bizRow?.day_order) ? bizRow?.day_order : [1, 2, 3, 4, 5, 6, 0]
  ) as number[];
  const allHours = hours ?? [];
  const scheduleRows: TableRow[] = dayOrder.map((dow, idx) => {
    const dayRows = allHours
      .filter(
        (r) => r.day_of_week === dow && !r.is_closed && r.open_time && r.close_time,
      )
      .sort((a, b) => (a.open_time ?? "").localeCompare(b.open_time ?? ""));
    const value =
      dayRows.length === 0
        ? "ΚΛΕΙΣΤΑ"
        : dayRows
            .map(
              (r) =>
                `${(r.open_time ?? "").slice(0, 5)} - ${(r.close_time ?? "").slice(0, 5)}`,
            )
            .join("\n");
    return {
      label: DAY_UP[dow],
      value,
      lineBelow: idx < dayOrder.length - 1,
    };
  });

  // Use saved design if present and valid, else build the default
  const savedConfig = template?.config as unknown as QrDesign | null;
  const initialDesign =
    savedConfig && Array.isArray(savedConfig.elements) && savedConfig.elements.length
      ? savedConfig
      : buildDefaultTemplate({
          name: business.name,
          bookingUrl: qrUrl,
          est,
          logoUrl: bizRow?.logo_url ?? null,
          hours: hours ?? [],
        });

  return (
    <>
      {/* Premium fonts for the canvas (loaded only on the editor route) */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Montserrat:wght@500;600;700;800&family=Oswald:wght@500;700&family=Playfair+Display:ital,wght@0,700;1,500&family=Poppins:wght@600;800&display=swap"
      />
      <Topbar
        locale={locale}
        title={t.navQr}
        subtitle={t.qr.subtitle}
        userLabel={fullName || email || ""}
      />
      <QrEditorLoader
        locale={locale}
        businessId={business.id}
        businessName={business.name}
        bookingUrl={bookingUrl}
        initialDesign={initialDesign}
        scheduleRows={scheduleRows}
      />
    </>
  );
}
