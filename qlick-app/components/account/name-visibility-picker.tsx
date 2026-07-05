"use client";

import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";

export type NameVisibility = "full" | "first" | "anonymous";

/** Best-effort inference of a stored review's name visibility. */
export function inferNameVisibility(
  customerName: string | null | undefined,
): NameVisibility {
  const n = (customerName ?? "").trim();
  if (!n) return "anonymous";
  return n.includes(" ") ? "full" : "first";
}

export function NameVisibilityPicker({
  value,
  onChange,
  disabled,
}: {
  value: NameVisibility;
  onChange: (v: NameVisibility) => void;
  disabled?: boolean;
}) {
  const t = useDict().account;
  const options: { value: NameVisibility; label: string }[] = [
    { value: "full", label: t.visFull },
    { value: "first", label: t.visFirst },
    { value: "anonymous", label: t.visAnon },
  ];
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted">{t.visLabel}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
              value === o.value
                ? "border-gold bg-gold/10 text-gold"
                : "border-border text-muted hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
