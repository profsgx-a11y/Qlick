import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "@/i18n/config";
import { ProfileForm } from "@/components/account/profile-form";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, phone, address")
    .eq("id", user.id)
    .maybeSingle();

  const addr = (profile?.address ?? {}) as {
    city?: string;
    street?: string;
    postcode?: string;
    lat?: number | null;
    lng?: number | null;
  };

  return (
    <div className="max-w-md">
      <ProfileForm
        locale={locale}
        email={user.email ?? ""}
        firstName={profile?.first_name ?? ""}
        lastName={profile?.last_name ?? ""}
        phone={profile?.phone ?? ""}
        address={{
          city: addr.city ?? "",
          street: addr.street ?? "",
          postcode: addr.postcode ?? "",
          lat: addr.lat ?? null,
          lng: addr.lng ?? null,
        }}
      />
    </div>
  );
}
