import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { hasLocale, type Locale } from "@/i18n/config";
import { authDict } from "@/lib/i18n-dict";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const { error } = await searchParams;
  if (!hasLocale(locale)) notFound();
  const loc = locale as Locale;
  const dict = authDict[loc].login;
  const social = authDict[loc].social;

  return (
    <Card className="w-full max-w-md">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          {dict.title}
        </h1>
        <p className="mt-1 text-sm text-muted">{dict.subtitle}</p>
      </div>

      {error === "oauth" && (
        <p className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {dict.oauthError}
        </p>
      )}

      <SocialAuthButtons
        locale={loc}
        labels={{
          google: social.googleLogin,
          facebook: social.facebookLogin,
          or: social.or,
        }}
      />

      <LoginForm locale={loc} dict={dict} />

      <p className="mt-6 text-center text-sm text-muted">
        {dict.noAccount}{" "}
        <Link
          href={`/${loc}/signup`}
          className="font-medium text-gold hover:underline"
        >
          {dict.signUp}
        </Link>
      </p>
    </Card>
  );
}
