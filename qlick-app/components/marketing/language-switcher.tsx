"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/config";

interface LanguageSwitcherProps {
  current: Locale;
  className?: string;
}

const order: Locale[] = ["el", "en"];
const labels: Record<Locale, string> = {
  el: "EL",
  en: "EN",
};

export function LanguageSwitcher({ current, className }: LanguageSwitcherProps) {
  const pathname = usePathname();
  // Optimistic: slide the gold pill the instant a language is clicked, before
  // the (full) locale navigation reloads the page.
  const [pending, setPending] = useState<Locale | null>(null);
  const shown = pending ?? current;

  const buildHref = (target: Locale) => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments[0] === "el" || segments[0] === "en") {
      segments[0] = target;
    } else {
      segments.unshift(target);
    }
    return "/" + segments.join("/");
  };

  return (
    <div
      className={cn(
        "relative inline-flex rounded-full border border-border bg-surface p-0.5 text-xs font-medium",
        className,
      )}
    >
      {/* Sliding gold indicator */}
      <span
        aria-hidden
        className="absolute inset-y-0.5 left-0.5 rounded-full bg-gold transition-transform duration-300 ease-[var(--ease-out)]"
        style={{
          width: "calc((100% - 0.25rem) / 2)",
          transform: shown === "en" ? "translateX(100%)" : "translateX(0)",
        }}
      />
      {order.map((loc) => (
        <Link
          key={loc}
          href={buildHref(loc)}
          onClick={() => setPending(loc)}
          aria-current={loc === current ? "true" : undefined}
          className={cn(
            "relative z-10 w-9 rounded-full py-1 text-center transition-colors duration-200 ease-[var(--ease-out)]",
            shown === loc ? "text-black" : "text-muted hover:text-foreground",
          )}
        >
          {labels[loc]}
        </Link>
      ))}
    </div>
  );
}
