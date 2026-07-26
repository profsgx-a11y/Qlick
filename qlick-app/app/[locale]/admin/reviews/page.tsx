import { notFound } from "next/navigation";
import { Topbar } from "@/components/dashboard/topbar";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { getDictionary, hasLocale } from "@/i18n/config";
import { ReviewsTable } from "./reviews-table";

export default async function AdminReviewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const { name, email } = await requireAdmin(locale);
  const dict = await getDictionary(locale);

  const supabase = await createClient();
  const [{ data }, { data: reports }] = await Promise.all([
    supabase.rpc("admin_list_reviews"),
    supabase
      .from("review_reports")
      .select("review_id, report_type, note, created_at")
      .order("created_at", { ascending: false }),
  ]);

  // Latest report + count per review, so the table can flag reported reviews.
  const reportsByReview: Record<
    string,
    { count: number; lastType: string; lastNote: string | null }
  > = {};
  for (const r of reports ?? []) {
    const existing = reportsByReview[r.review_id];
    if (existing) existing.count += 1;
    else
      reportsByReview[r.review_id] = {
        count: 1,
        lastType: r.report_type,
        lastNote: r.note,
      };
  }

  return (
    <>
      <Topbar
        locale={locale}
        title={dict.admin.reviews.title}
        subtitle={dict.admin.reviews.subtitle}
        userLabel={name || email || ""}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <ReviewsTable
          locale={locale}
          rows={data ?? []}
          reportsByReview={reportsByReview}
        />
      </div>
    </>
  );
}
