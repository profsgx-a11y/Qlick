import { notFound } from "next/navigation";
import { Topbar } from "@/components/dashboard/topbar";
import { createClient } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/dashboard";
import { hasLocale, getDictionary } from "@/i18n/config";
import { ReviewsManager, type ReviewRow } from "./reviews-manager";

export default async function ReviewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = (await getDictionary(locale)).dashboard;

  const { business, fullName, email } = await requireBusiness(locale);
  const supabase = await createClient();

  const [{ data: reviews }, { data: staff }] = await Promise.all([
    supabase
      .from("reviews")
      .select(
        "id, staff_id, staff_name, customer_name, rating, comment, business_reply, status, created_at",
      )
      .eq("business_id", business.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("staff")
      .select("id, name")
      .eq("business_id", business.id)
      .order("order_index")
      .order("created_at"),
  ]);

  return (
    <>
      <Topbar
        locale={locale}
        title={t.navReviews}
        subtitle={t.reviews.subtitle}
        userLabel={fullName || email || ""}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <ReviewsManager
          locale={locale}
          initialReviews={(reviews ?? []) as ReviewRow[]}
          staff={staff ?? []}
        />
      </div>
    </>
  );
}
