"use client";

import { useState, useTransition } from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PasswordStrength } from "@/components/auth/password-strength";
import type { AuthDict } from "@/lib/i18n-dict";
import { updatePassword } from "./actions";

export function ResetForm({
  locale,
  dict,
  strength,
}: {
  locale: string;
  dict: AuthDict["reset"];
  strength: AuthDict["passwordStrength"];
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    if (password.length < 8) {
      setError(dict.tooShort);
      return;
    }
    if (password !== confirm) {
      setError(dict.mismatch);
      return;
    }
    startTransition(async () => {
      const res = await updatePassword(locale, password);
      // On success the action redirects; we only land here on failure.
      if (!res.ok) {
        setError(res.error === "no_session" ? dict.noSession : dict.failed);
      }
    });
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div>
        <Field label={dict.newPassword} htmlFor="rp-pass" required>
          <Input
            id="rp-pass"
            type="password"
            value={password}
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
            disabled={pending}
            required
          />
        </Field>
        <PasswordStrength password={password} labels={strength} />
      </div>

      <Field label={dict.confirmPassword} htmlFor="rp-pass2" required>
        <Input
          id="rp-pass2"
          type="password"
          value={confirm}
          autoComplete="new-password"
          onChange={(e) => setConfirm(e.target.value)}
          disabled={pending}
          required
        />
      </Field>

      {error && (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="mt-2">
        {pending ? dict.submitting : dict.submit}
      </Button>
    </form>
  );
}
