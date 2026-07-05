import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasLocale, getDictionary } from "@/i18n/config";
import { MyReviews, type MyReview } from "@/components/account/my-reviews";

export default async function MyReviewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const shopFallback = (await getDictionary(locale)).account.shopFallback;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: rows } = await supabase
    .from("reviews")
    .select(
      "id, rating, comment, staff_name, business_reply, created_at, customer_name, businesses(name, slug, logo_url)",
    )
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  const reviews: MyReview[] = (rows ?? []).map((r) => ({
    id: r.id,
    rating: Number(r.rating),
    comment: r.comment,
    staffName: r.staff_name,
    businessReply: r.business_reply,
    createdAt: r.created_at,
    customerName: r.customer_name,
    businessName:
      (r.businesses as { name: string } | null)?.name ?? shopFallback,
    businessSlug: (r.businesses as { slug: string } | null)?.slug ?? "",
    businessLogo:
      (r.businesses as { logo_url: string | null } | null)?.logo_url ?? null,
  }));

  return <MyReviews locale={locale} reviews={reviews} />;
}
