import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { hasLocale, type Locale } from "@/i18n/config";
import { authDict } from "@/lib/i18n-dict";
import { ForgotForm } from "./forgot-form";

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const loc = locale as Locale;
  const dict = authDict[loc].forgot;

  return (
    <Card className="w-full max-w-md">
      <Link
        href={`/${loc}/login`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {dict.back}
      </Link>

      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          {dict.title}
        </h1>
        <p className="mt-1 text-sm text-muted">{dict.subtitle}</p>
      </div>

      <ForgotForm locale={loc} dict={dict} />
    </Card>
  );
}
