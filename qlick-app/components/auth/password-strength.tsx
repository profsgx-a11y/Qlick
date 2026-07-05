"use client";

import { Check } from "lucide-react";
import type { AuthDict } from "@/lib/i18n-dict";

interface PasswordStrengthProps {
  password: string;
  labels: AuthDict["passwordStrength"];
}

/**
 * Live password strength meter for the signup forms: a 4-segment bar plus a
 * checklist (8+ chars, uppercase, number, symbol) that lights up as the
 * visitor types. Renders nothing until they start typing.
 */
export function PasswordStrength({ password, labels }: PasswordStrengthProps) {
  if (!password) return null;

  const checks = [
    { ok: password.length >= 8, label: labels.length },
    { ok: /[A-ZΑ-ΩΆΈΉΊΌΎΏ]/.test(password), label: labels.uppercase },
    { ok: /\d/.test(password), label: labels.number },
    { ok: /[^\p{L}\d\s]/u.test(password), label: labels.symbol },
  ];
  const score = checks.filter((c) => c.ok).length;

  const tone =
    score <= 1
      ? { bar: "bg-danger", text: "text-danger", label: labels.weak }
      : score < 4
        ? { bar: "bg-warning", text: "text-warning", label: labels.medium }
        : { bar: "bg-success", text: "text-success", label: labels.strong };

  return (
    <div className="mt-2.5 space-y-2.5">
      {/* strength bar + verdict */}
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={
                "h-1 flex-1 rounded-full transition-colors duration-300 ease-[var(--ease-out)] " +
                (i < score ? tone.bar : "bg-border")
              }
            />
          ))}
        </div>
        <span className={`shrink-0 text-xs font-medium ${tone.text}`}>
          {tone.label}
        </span>
      </div>

      {/* requirements checklist */}
      <ul className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
        {checks.map((c) => (
          <li
            key={c.label}
            className={
              "flex items-center gap-1.5 text-xs transition-colors duration-300 ease-[var(--ease-out)] " +
              (c.ok ? "text-success" : "text-muted-2")
            }
          >
            <span
              className={
                "grid size-3.5 shrink-0 place-items-center rounded-full transition-colors duration-300 ease-[var(--ease-out)] " +
                (c.ok ? "bg-success/20" : "border border-border")
              }
            >
              {c.ok && <Check className="size-2.5" strokeWidth={3} />}
            </span>
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
