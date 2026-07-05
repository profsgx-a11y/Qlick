"use client";

import { useEffect, useRef, useState } from "react";
import { AsYouType, type CountryCode } from "libphonenumber-js";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Country {
  code: CountryCode;
  dial: string;
  flag: string;
  label: string;
}

const COUNTRIES: Country[] = [
  { code: "GR", dial: "+30", flag: "🇬🇷", label: "Ελλάδα" },
  { code: "CY", dial: "+357", flag: "🇨🇾", label: "Κύπρος" },
];

interface PhoneInputProps {
  /** National number portion, controlled by the parent */
  value: string;
  country: CountryCode;
  onChange: (national: string, country: CountryCode) => void;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  /** Overrides the default (mobile) example placeholder. */
  placeholder?: string;
}

export function PhoneInput({
  value,
  country,
  onChange,
  disabled,
  invalid,
  id,
  placeholder,
}: PhoneInputProps) {
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const current = COUNTRIES.find((c) => c.code === country) ?? COUNTRIES[0];

  // Close the country menu on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleInput = (raw: string) => {
    // Keep only digits and spaces; format as the user types
    const formatter = new AsYouType(country);
    const formatted = formatter.input(raw.replace(/[^\d\s]/g, ""));
    onChange(formatted, country);
  };

  return (
    <div className="relative" ref={rootRef}>
      <div
        className={cn(
          "flex h-11 w-full items-stretch overflow-hidden rounded-lg border bg-surface transition-colors",
          invalid
            ? "border-danger"
            : focused || open
              ? "border-gold ring-2 ring-gold/30"
              : "border-border",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label="Κωδικός χώρας"
          onClick={() => !disabled && setOpen((o) => !o)}
          className="flex items-center gap-1 border-r border-border bg-surface-2 pl-2.5 pr-2 text-sm text-foreground transition-colors hover:text-gold focus:outline-none disabled:cursor-not-allowed"
        >
          <span>
            {current.flag} {current.dial}
          </span>
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 text-muted transition-transform",
              open && "rotate-180 text-gold",
            )}
          />
        </button>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={value}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => handleInput(e.target.value)}
          placeholder={
            placeholder ?? (country === "GR" ? "69 1234 5678" : "9x xxx xxx")
          }
          className="flex-1 bg-surface px-3 text-sm text-foreground placeholder:text-muted-2 focus:outline-none disabled:cursor-not-allowed"
        />
      </div>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+4px)] z-50 w-48 rounded-lg border border-border bg-surface p-1 shadow-2xl"
        >
          {COUNTRIES.map((c) => {
            const isSel = c.code === country;
            return (
              <button
                key={c.code}
                type="button"
                role="option"
                aria-selected={isSel}
                onClick={() => {
                  onChange(value, c.code);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors focus:outline-none",
                  isSel
                    ? "bg-gold/10 font-medium text-gold"
                    : "text-foreground hover:bg-surface-2 hover:text-gold",
                )}
              >
                <span className="truncate">
                  {c.flag} {c.label}{" "}
                  <span className="text-muted">{c.dial}</span>
                </span>
                {isSel && <Check className="size-4 shrink-0 text-gold" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { COUNTRIES };
