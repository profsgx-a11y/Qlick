import Link from "next/link";
import { notFound } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { hasLocale, type Locale } from "@/i18n/config";
import { authDict } from "@/lib/i18n-dict";
import { ResetForm } from "./reset-form";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const loc = locale as Locale;
  const dict = authDict[loc].reset;

  // The reset link (via the auth callback) establishes a recovery session.
  // Without one, the link is expired/invalid — offer to request a fresh one.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Card className="w-full max-w-md text-center">
        <span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-gold/10 text-gold">
          <KeyRound className="size-6" />
        </span>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          {dict.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{dict.noSession}</p>
        <Link
          href={`/${loc}/forgot-password`}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-gold px-6 text-sm font-semibold text-black transition-colors hover:bg-gold-bright"
        >
          {dict.noSessionCta}
        </Link>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          {dict.title}
        </h1>
        <p className="mt-1 text-sm text-muted">{dict.subtitle}</p>
      </div>

      <ResetForm
        locale={loc}
        dict={dict}
        strength={authDict[loc].passwordStrength}
      />
    </Card>
  );
}
