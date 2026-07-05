"use client";

import { useState, useTransition } from "react";
import { MailCheck } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { AuthDict } from "@/lib/i18n-dict";
import { sendPasswordReset } from "./actions";

export function ForgotForm({
  locale,
  dict,
}: {
  locale: string;
  dict: AuthDict["forgot"];
}) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!email.trim()) return;
    startTransition(async () => {
      await sendPasswordReset(locale, email);
      setSent(true);
    });
  };

  if (sent) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3.5">
        <MailCheck className="mt-0.5 size-5 shrink-0 text-gold" />
        <p className="text-sm leading-relaxed text-foreground">{dict.sent}</p>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Field label={dict.email} htmlFor="fp-email" required>
        <Input
          id="fp-email"
          type="email"
          value={email}
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
          required
        />
      </Field>

      <Button type="submit" size="lg" disabled={pending} className="mt-2">
        {pending ? dict.submitting : dict.submit}
      </Button>
    </form>
  );
}
