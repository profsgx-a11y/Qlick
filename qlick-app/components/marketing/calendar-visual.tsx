"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { CalendarCheck } from "lucide-react";
import { TiltCard } from "@/components/motion/primitives";

/**
 * "Live calendar" visual for the for-business hero: a real screenshot of the
 * dashboard calendar inside a tilting card, with one new-booking toast
 * floating in on a loop.
 */
export function CalendarVisual({ toast }: { toast: { title: string; body: string } }) {
  const reduce = useReducedMotion();

  return (
    <div className="relative w-full max-w-[680px]">
      <div className="absolute -inset-10 -z-10 rounded-[48px] bg-gold/12 blur-3xl" />

      <TiltCard max={6}>
        <div className="surface-raise overflow-hidden rounded-3xl border border-border elev-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/7.png"
            alt={toast.title}
            className="block h-auto w-full"
            draggable={false}
          />
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
          className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2/70 px-4 py-3 shadow-xl shadow-black/50"
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
