"use client";

import { useState } from "react";
import { AsYouType } from "libphonenumber-js";
import { cn } from "@/lib/utils";

interface IntlPhoneInputProps {
  /** Full phone string including country code, e.g. "+30 691 234 5678" */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  placeholder?: string;
}

/**
 * Free international phone field: comes prefilled with "+30 " but the visitor
 * can erase it and type any country code (+44, +49, +1, ...). Formats as they
 * type; numbers without a "+" are treated as Greek national numbers.
 */
export function IntlPhoneInput({
  value,
  onChange,
  disabled,
  invalid,
  id,
  placeholder,
}: IntlPhoneInputProps) {
  const [focused, setFocused] = useState(false);

  const handleInput = (raw: string) => {
    // Allow digits, spaces and a single leading "+"
    let v = raw.replace(/[^\d\s+]/g, "");
    v = v.startsWith("+")
      ? "+" + v.slice(1).replace(/\+/g, "")
      : v.replace(/\+/g, "");
    const formatted = new AsYouType(v.startsWith("+") ? undefined : "GR").input(v);
    onChange(formatted);
  };

  return (
    <input
      id={id}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={value}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => handleInput(e.target.value)}
      placeholder={placeholder ?? "+30 691 234 5678"}
      className={cn(
        "h-11 w-full rounded-lg border bg-surface px-3 text-sm text-foreground transition-colors placeholder:text-muted-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        invalid
          ? "border-danger"
          : focused
            ? "border-gold ring-2 ring-gold/30"
            : "border-border",
      )}
    />
  );
}
