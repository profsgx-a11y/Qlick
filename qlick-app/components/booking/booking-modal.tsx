"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ArrowRight } from "lucide-react";
import { BookingFlow } from "@/app/[locale]/b/[slug]/book/booking-flow";
import { useDict } from "@/i18n/provider";

type BookingModalProps = Omit<
  React.ComponentProps<typeof BookingFlow>,
  "embedded"
> & {
  triggerLabel: string;
  triggerClassName?: string;
};

// Opens the real, fully-functional BookingFlow inside a popup overlay on the
// storefront page — instead of navigating to /b/[slug]/book. The /book page is
// kept as a standalone fallback (search links, direct URLs, no-JS).
export function BookingModal({
  triggerLabel,
  triggerClassName,
  ...flowProps
}: BookingModalProps) {
  const [open, setOpen] = useState(false);
  const t = useDict().shop;

  // Lock body scroll + close on Escape while the modal is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName}
      >
        {triggerLabel}
        <ArrowRight className="size-4" />
      </button>

      {open &&
        createPortal(
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={flowProps.business.name}
          onClick={() => setOpen(false)}
        >
          <div
            className="animate-pop flex h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-border bg-background shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab handle — mobile bottom-sheet affordance */}
            <div className="flex shrink-0 justify-center pt-3 sm:hidden">
              <span className="h-1.5 w-10 rounded-full bg-border" />
            </div>

            {/* Modal chrome: business name + close */}
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 pb-4 pt-3 sm:pt-4">
              <p className="truncate font-display text-base font-bold text-foreground">
                {flowProps.business.name}
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.close}
                className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-muted transition-colors hover:border-gold-soft hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Scrollable booking flow */}
            <div className="flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
              <BookingFlow {...flowProps} embedded />
            </div>
          </div>
        </div>,
          document.body,
        )}
    </>
  );
}
