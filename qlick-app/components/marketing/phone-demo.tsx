"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion, useInView } from "motion/react";
import { Check, ChevronLeft, Scissors } from "lucide-react";

export interface PhoneDemoStrings {
  shopName: string;
  shopMeta: string;
  services: { name: string; meta: string; price: string }[];
  pickTime: string;
  times: string[];
  booked: string;
  bookedSub: string;
}

/**
 * A looping, self-playing preview of the real booking flow inside a phone
 * frame: pick a service → pick a time → confirmation. Mirrors the actual
 * /b/[slug]/book UI so visitors see the product, not a description of it.
 */
export function PhoneDemo({ s }: { s: PhoneDemoStrings }) {
  const reduce = useReducedMotion();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.4 });

  // phases: 0 services · 1 service picked · 2 times · 3 time picked · 4 booked
  const [phase, setPhase] = React.useState(0);

  React.useEffect(() => {
    if (reduce || !inView) return;
    const delays = [1600, 700, 1800, 700, 2600];
    const t = setTimeout(() => setPhase((p) => (p + 1) % 5), delays[phase]);
    return () => clearTimeout(t);
  }, [phase, reduce, inView]);

  const screen = reduce ? 4 : phase < 2 ? 0 : phase < 4 ? 1 : 2;
  const pickedService = reduce || phase >= 1;
  const pickedTime = reduce || phase >= 3;

  return (
    <div
      ref={rootRef}
      className="relative mx-auto w-[290px] rounded-[44px] border border-border-strong bg-surface p-2.5 shadow-2xl shadow-black/70 ring-1 ring-white/5 sm:w-[310px]"
    >
      {/* speaker notch */}
      <div className="absolute left-1/2 top-4 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-background" />

      <div className="relative h-[560px] overflow-hidden rounded-[34px] bg-background sm:h-[590px]">
        {/* shop header — mirrors the real booking page */}
        <div className="border-b border-border bg-surface/60 px-5 pb-4 pt-10">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-gold text-black">
              <Scissors className="size-5" strokeWidth={2} />
            </span>
            <div>
              <p className="font-display text-sm font-bold text-foreground">{s.shopName}</p>
              <p className="text-xs text-muted">{s.shopMeta}</p>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {screen === 0 && (
            <motion.div
              key="services"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-2.5 p-4"
            >
              {s.services.map((svc, i) => (
                <div
                  key={svc.name}
                  className={
                    "flex items-center justify-between rounded-xl border p-3.5 transition-colors duration-300 " +
                    (pickedService && i === 0
                      ? "border-gold bg-gold/10"
                      : "border-border bg-surface")
                  }
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{svc.name}</p>
                    <p className="text-xs text-muted">{svc.meta}</p>
                  </div>
                  <span className="text-sm font-bold text-gold">{svc.price}</span>
                </div>
              ))}
            </motion.div>
          )}

          {screen === 1 && (
            <motion.div
              key="times"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="p-4"
            >
              <div className="mb-3 flex items-center gap-2 text-xs text-muted">
                <ChevronLeft className="size-3.5" />
                <span>{s.services[0]?.name}</span>
              </div>
              <p className="mb-3 text-sm font-semibold text-foreground">{s.pickTime}</p>
              <div className="grid grid-cols-3 gap-2">
                {s.times.map((t, i) => (
                  <div
                    key={t}
                    className={
                      "rounded-lg border py-2.5 text-center text-sm font-medium transition-colors duration-300 " +
                      (pickedTime && i === 1
                        ? "border-gold bg-gold text-black"
                        : "border-border bg-surface text-foreground")
                    }
                  >
                    {t}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {screen === 2 && (
            <motion.div
              key="booked"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex h-[400px] flex-col items-center justify-center gap-4 p-6 text-center"
            >
              <motion.span
                initial={reduce ? false : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.15 }}
                className="grid size-16 place-items-center rounded-full bg-gold text-black"
              >
                <Check className="size-8" strokeWidth={2.5} />
              </motion.span>
              <div>
                <p className="font-display text-lg font-bold text-foreground">{s.booked}</p>
                <p className="mt-1 text-sm text-muted">{s.bookedSub}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* home indicator */}
        <div className="absolute bottom-2 left-1/2 h-1 w-24 -translate-x-1/2 rounded-full bg-border-strong" />
      </div>
    </div>
  );
}
