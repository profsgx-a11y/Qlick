"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  title?: string;
  "aria-label"?: string;
  className?: string;
}

/**
 * Premium on/off toggle — a sliding knob with a gold-lit track when on.
 * The track picks up a soft gold glow when checked (gold = the brand
 * signature), and both the colour and the knob slide on our `--ease-out`
 * curve. State is owned by the caller, so the slide is optimistic/immediate.
 */
export function Switch({
  checked,
  onChange,
  disabled,
  title,
  className,
  ...rest
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={rest["aria-label"]}
      title={title}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-[background-color,box-shadow] duration-200 ease-[var(--ease-out)] active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        checked
          ? "bg-gold [box-shadow:0_0_14px_-3px_var(--gold-glow)]"
          : "bg-surface-3",
        className,
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-[var(--ease-out)]",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}
