"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loginAction, type LoginResult } from "./actions";
import type { AuthDict } from "@/lib/i18n-dict";

interface LoginFormProps {
  locale: string;
  dict: AuthDict["login"];
}

export function LoginForm({ locale, dict }: LoginFormProps) {
  const action = loginAction.bind(null, locale);
  const [state, formAction, isPending] = useActionState<LoginResult, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label={dict.email} htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={isPending}
        />
      </Field>

      <Field label={dict.password} htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={isPending}
        />
      </Field>

      <div className="-mt-1 text-right">
        <Link
          href={`/${locale}/forgot-password`}
          className="text-sm font-medium text-gold hover:underline"
        >
          {dict.forgotPassword}
        </Link>
      </div>

      {state.error && (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={isPending} className="mt-2">
        {isPending ? dict.submitting : dict.submit}
      </Button>
    </form>
  );
}
