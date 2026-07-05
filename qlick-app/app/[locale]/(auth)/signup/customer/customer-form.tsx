"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IntlPhoneInput } from "@/components/ui/intl-phone-input";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { PasswordStrength } from "@/components/auth/password-strength";
import type { AuthDict } from "@/lib/i18n-dict";
import { createCustomerAccount } from "./actions";

interface CustomerFormProps {
  locale: string;
  dict: AuthDict["customer"];
  social: AuthDict["social"];
  strength: AuthDict["passwordStrength"];
}

export function CustomerForm({ locale, dict, social, strength }: CustomerFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  // Prefilled with the Greek code; visitors abroad can erase it and type theirs.
  const [phone, setPhone] = useState("+30 ");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await createCustomerAccount(locale, {
        firstName,
        lastName,
        email,
        // Send only when there's a real number beyond a bare country code.
        phone: phone.replace(/\D/g, "").length > 4 ? phone.trim() : "",
        password,
      });
      if (!res.ok) {
        setError(res.error ?? "Κάτι πήγε στραβά. Δοκίμασε ξανά.");
        return;
      }
      if (res.needsEmailConfirmation) setConfirm(true);
      // success without confirmation → the action redirects to /account
    });
  };

  if (confirm) {
    return (
      <p className="rounded-md border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-foreground">
        Σου στείλαμε email επιβεβαίωσης. Άνοιξέ το για να ενεργοποιήσεις τον
        λογαριασμό σου.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SocialAuthButtons
        locale={locale}
        labels={{
          google: social.googleSignup,
          facebook: social.facebookSignup,
          or: social.or,
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={dict.firstName} htmlFor="cs-first" required>
          <Input
            id="cs-first"
            value={firstName}
            autoComplete="given-name"
            onChange={(e) => setFirstName(e.target.value)}
            disabled={pending}
          />
        </Field>

        <Field label={dict.lastName} htmlFor="cs-last" required>
          <Input
            id="cs-last"
            value={lastName}
            autoComplete="family-name"
            onChange={(e) => setLastName(e.target.value)}
            disabled={pending}
          />
        </Field>
      </div>

      <Field label={dict.email} htmlFor="cs-email" required>
        <Input
          id="cs-email"
          type="email"
          value={email}
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
        />
      </Field>

      <Field label={dict.phone} htmlFor="cs-phone" required>
        <IntlPhoneInput
          id="cs-phone"
          value={phone}
          onChange={setPhone}
          disabled={pending}
        />
      </Field>

      <div>
        <Field
          label={dict.password}
          htmlFor="cs-pass"
          required
          hint={password ? undefined : dict.passwordHint}
        >
          <Input
            id="cs-pass"
            type="password"
            value={password}
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
            disabled={pending}
          />
        </Field>
        <PasswordStrength password={password} labels={strength} />
      </div>

      {error && (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <Button size="lg" onClick={submit} disabled={pending} className="mt-1">
        {pending ? dict.submitting : dict.submit}
      </Button>

      <p className="text-center text-sm text-muted">
        {dict.haveAccount}{" "}
        <Link
          href={`/${locale}/login`}
          className="font-medium text-gold hover:underline"
        >
          {dict.logIn}
        </Link>
      </p>
    </div>
  );
}
