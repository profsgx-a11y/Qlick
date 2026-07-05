"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { CalendarCheck } from "lucide-react";
import { TiltCard } from "@/components/motion/primitives";

/**
 * Abstract "live calendar" visual for the for-business hero: three staff
 * columns filling up with appointment blocks, one new booking dropping in on
 * a loop. Decorative (no fake text), mirrors the real calendar's anatomy.
 */
export function CalendarVisual({ toast }: { toast: { title: string; body: string } }) {
  const reduce = useReducedMotion();

  // columns of appointment blocks: [height(rem), gold?]
  const columns: [number, boolean][][] = [
    [
      [3.5, false],
      [2.5, true],
      [4, false],
    ],
    [
      [2.5, false],
      [3, false],
      [2.5, true],
      [2, false],
    ],
    [
      [4.5, true],
      [3, false],
      [2.5, false],
    ],
  ];

  return (
    <div className="relative w-full max-w-[440px]">
      <div className="absolute -inset-10 -z-10 rounded-[48px] bg-gold/12 blur-3xl" />

      <TiltCard max={6}>
        <div className="surface-raise overflow-hidden rounded-3xl border border-border p-5 elev-card">
          {/* staff header row */}
          <div className="mb-4 grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-cal-header flex items-center justify-center gap-2 rounded-lg py-2"
              >
                <span className="size-5 rounded-full border border-gold/40 bg-gold/15" />
                <span className="h-1.5 w-8 rounded-full bg-border-strong" />
              </div>
            ))}
          </div>

          {/* appointment columns */}
          <div className="grid grid-cols-3 gap-3">
            {columns.map((col, ci) => (
              <div key={ci} className="space-y-2.5">
                {col.map(([h, gold], bi) => (
                  <motion.div
                    key={bi}
                    initial={reduce ? false : { opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.5,
                      delay: 0.2 + ci * 0.12 + bi * 0.1,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    style={{ height: `${h}rem` }}
                    className={
                      gold
                        ? "rounded-xl border border-gold/40 bg-gold/15"
                        : "rounded-xl border border-border bg-surface-2"
                    }
                  >
                    <div className="p-2.5">
                      <div
                        className={
                          "h-1.5 w-2/3 rounded-full " +
                          (gold ? "bg-gold/60" : "bg-border-strong")
                        }
                      />
                      <div className="mt-1.5 h-1.5 w-1/3 rounded-full bg-border" />
                    </div>
                  </motion.div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </TiltCard>

      {/* new booking toast dropping in on loop */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 1.1, ease: [0.16, 1, 0.3, 1] }}
        className="absolute -right-3 top-8 z-10 sm:-right-10"
      >
        <motion.div
          animate={reduce ? undefined : { y: [0, -6, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2/95 px-4 py-3 shadow-xl shadow-black/50 backdrop-blur-md"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
            <CalendarCheck className="size-4" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">{toast.title}</p>
            <p className="text-xs text-muted">{toast.body}</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
