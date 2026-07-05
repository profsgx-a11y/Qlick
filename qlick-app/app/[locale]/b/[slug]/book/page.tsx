import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "@/i18n/config";
import { BookingFlow } from "./booking-flow";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ src?: string }>;
}) {
  const { locale, slug } = await params;
  if (!hasLocale(locale)) notFound();
  const source = (await searchParams).src === "qr" ? "qr" : "web";

  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, status")
    .eq("slug", slug)
    .maybeSingle();

  if (!business || business.status !== "active") notFound();

  const [{ data: services }, { data: auth }, { data: staffRows }] =
    await Promise.all([
      supabase
        .from("services")
        .select("id, name, description, duration_minutes, price_cents")
        .eq("business_id", business.id)
        .eq("is_active", true)
        .eq("bookable_online", true)
        .order("order_index")
        .order("created_at"),
      supabase.auth.getUser(),
      supabase
        .from("staff")
        .select("id, name, title, avatar_url, color")
        .eq("business_id", business.id)
        .eq("is_active", true)
        .eq("is_bookable", true)
        .order("order_index")
        .order("created_at"),
    ]);

  const staff = (staffRows ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    title: s.title,
    avatarUrl: s.avatar_url,
    color: s.color,
  }));

  // Which bookable staff can perform each service.
  const staffIds = staff.map((s) => s.id);
  const ssRows =
    staffIds.length > 0
      ? (
          await supabase
            .from("service_staff")
            .select("service_id, staff_id")
            .in("staff_id", staffIds)
        ).data ?? []
      : [];
  const serviceStaff: Record<string, string[]> = {};
  for (const r of ssRows) {
    (serviceStaff[r.service_id] ??= []).push(r.staff_id);
  }

  const user = auth.user;
  let defaultName = "";
  let defaultPhone = "";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, phone")
      .eq("id", user.id)
      .maybeSingle();
    defaultName =
      [profile?.first_name, profile?.last_name]
        .map((s) => s?.trim())
        .filter(Boolean)
        .join(" ") || "";
    defaultPhone = profile?.phone ?? "";
  }

  return (
    <BookingFlow
      locale={locale}
      business={{ id: business.id, name: business.name, slug: business.slug }}
      services={services ?? []}
      staff={staff}
      serviceStaff={serviceStaff}
      isAuthenticated={!!user}
      defaultName={defaultName}
      defaultPhone={defaultPhone}
      source={source}
    />
  );
}
