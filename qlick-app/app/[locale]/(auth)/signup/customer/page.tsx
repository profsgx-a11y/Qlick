import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { hasLocale, type Locale } from "@/i18n/config";
import { authDict } from "@/lib/i18n-dict";
import { CustomerForm } from "./customer-form";

export default async function CustomerSignupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const loc = locale as Locale;
  const dict = authDict[loc].customer;
  const social = authDict[loc].social;

  return (
    <Card className="w-full max-w-md">
      <Link
        href={`/${loc}/signup`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {authDict[loc].signup.back}
      </Link>

      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          {dict.title}
        </h1>
        <p className="mt-1 text-sm text-muted">{dict.subtitle}</p>
      </div>

      <CustomerForm
        locale={loc}
        dict={dict}
        social={social}
        strength={authDict[loc].passwordStrength}
      />

      <p className="mt-6 text-center text-sm text-muted">
        {dict.isBusiness}{" "}
        <Link
          href={`/${loc}/signup/business`}
          className="font-medium text-gold hover:underline"
        >
          {dict.businessLink}
        </Link>
      </p>
    </Card>
  );
}
