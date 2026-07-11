"use client";

import { useState } from "react";
import Link from "next/link";
import { X, ArrowRight, ArrowLeft, Check, Clock, CalendarCheck } from "lucide-react";
import { formatPrice, formatDuration } from "@/lib/format";
import { demoShop } from "@/lib/demo-shop";

type Step = { label: string; title: string; body: string };

type Props = {
  locale: string;
  triggerLabel: string;
  triggerClassName?: string;
  dict: {
    previewTitle: string;
    previewSubtitle: string;
    previewClose: string;
    previewNext: string;
    previewBack: string;
    previewCtaNote: string;
    previewSteps: Step[];
    ctaButton: string;
  };
  anyAvailableLabel: string;
};

// A guided, non-functional walk-through of the booking flow. It never touches
// the database — it exists purely to show a prospect what their customers see.
export function DemoBookingPreview({
  locale,
  triggerLabel,
  triggerClassName,
  dict,
  anyAvailableLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const isEl = locale !== "en";
  const steps = dict.previewSteps;
  const last = steps.length - 1;

  const close = () => {
    setOpen(false);
    setStep(0);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClassName}>
        {triggerLabel}
        <ArrowRight className="size-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          onClick={close}
        >
          <div
            className="animate-rise flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-surface shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header + stepper */}
            <div className="border-b border-border p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    {dict.previewTitle}
                  </h3>
                  <p className="mt-1 text-sm text-muted">{dict.previewSubtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label={dict.previewClose}
                  className="grid size-8 shrink-0 place-items-center rounded-full border border-border text-muted transition-colors hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="mt-4 flex items-center gap-1.5">
                {steps.map((s, i) => (
                  <div key={i} className="flex flex-1 items-center gap-1.5">
                    <span
                      className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold transition-colors ${
                        i <= step
                          ? "bg-gold text-black"
                          : "bg-surface-2 text-muted-2"
                      }`}
                    >
                      {i < step ? <Check className="size-3.5" /> : i + 1}
                    </span>
                    {i < last && (
                      <span
                        className={`h-0.5 flex-1 rounded-full ${
                          i < step ? "bg-gold" : "bg-border"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="min-h-[280px] flex-1 overflow-y-auto p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-gold">
                {steps[step].label}
              </p>
              <h4 className="mt-1 font-display text-xl font-bold text-foreground">
                {steps[step].title}
              </h4>
              <p className="mt-1 text-sm text-muted">{steps[step].body}</p>

              <div className="mt-5">
                {step === 0 && (
                  <div className="space-y-2.5">
                    {demoShop.services.slice(0, 3).map((s, i) => (
                      <div
                        key={s.id}
                        className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 ${
                          i === 0
                            ? "border-gold bg-gold/10"
                            : "border-border bg-surface-2/50"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {isEl ? s.name : s.nameEn}
                          </p>
                          <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
                            <Clock className="size-3.5" />
                            {formatDuration(s.durationMinutes, locale)}
                          </span>
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-gold">
                          {formatPrice(s.priceCents, locale)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {step === 1 && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="col-span-2 flex items-center gap-3 rounded-xl border border-gold bg-gold/10 p-3.5">
                      <span className="grid size-9 place-items-center rounded-full bg-gold/20 text-gold">
                        <Check className="size-4" />
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {anyAvailableLabel}
                      </span>
                    </div>
                    {demoShop.staff.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-2/50 p-3"
                      >
                        <span
                          className="grid size-8 place-items-center rounded-full text-xs font-bold text-black"
                          style={{ backgroundColor: m.color }}
                        >
                          {m.name.slice(0, 1)}
                        </span>
                        <span className="truncate text-sm font-medium text-foreground">
                          {m.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {step === 2 && (
                  <div className="grid grid-cols-3 gap-2.5">
                    {["10:00", "10:30", "11:00", "11:30", "12:30", "16:00", "16:30", "17:30", "18:00"].map(
                      (t, i) => (
                        <span
                          key={t}
                          className={`rounded-xl border py-2.5 text-center text-sm font-medium ${
                            i === 3
                              ? "border-gold bg-gold/10 text-gold"
                              : "border-border bg-surface-2/50 text-foreground"
                          }`}
                        >
                          {t}
                        </span>
                      ),
                    )}
                  </div>
                )}

                {step === 3 && (
                  <div className="rounded-2xl border border-border bg-surface-2/50 p-4">
                    <div className="flex items-center gap-3 border-b border-border pb-3">
                      <span className="grid size-10 place-items-center rounded-full bg-gold/15 text-gold">
                        <CalendarCheck className="size-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {isEl ? demoShop.services[0].name : demoShop.services[0].nameEn}
                        </p>
                        <p className="text-xs text-muted">
                          {demoShop.staff[0].name} · {isEl ? "Πέμπτη" : "Thursday"} 11:30
                        </p>
                      </div>
                      <span className="ml-auto text-sm font-semibold text-gold">
                        {formatPrice(demoShop.services[0].priceCents, locale)}
                      </span>
                    </div>
                    <div className="space-y-2 pt-3">
                      <div className="h-9 rounded-lg border border-gold/60 bg-surface px-3 text-sm leading-9 text-muted">
                        {isEl ? "Το όνομά σου" : "Your name"}
                      </div>
                      <div className="h-9 rounded-lg border border-border bg-surface px-3 text-sm leading-9 text-muted-2">
                        {isEl ? "Τηλέφωνο (προαιρετικό)" : "Phone (optional)"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border p-5">
              {step < last ? (
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                    disabled={step === 0}
                    className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground disabled:opacity-0"
                  >
                    <ArrowLeft className="size-4" />
                    {dict.previewBack}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.min(last, s + 1))}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-gold-bright"
                  >
                    {dict.previewNext}
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3 text-center">
                  <p className="text-xs text-muted">{dict.previewCtaNote}</p>
                  <Link
                    href={`/${locale}/signup/business`}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gold text-base font-semibold text-black shadow-[0_8px_24px_-8px_var(--gold-glow)] transition-colors hover:bg-gold-bright"
                  >
                    {dict.ctaButton}
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
