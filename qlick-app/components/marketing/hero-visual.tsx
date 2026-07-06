"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { CalendarCheck, Star } from "lucide-react";
import { TiltCard } from "@/components/motion/primitives";

interface HeroVisualProps {
  /** flat PNG of the poster (preferred) */
  posterPng: string | null;
  /** rendered poster SVG markup (fallback) */
  posterSvg: string | null;
  /** plain QR svg markup (last resort) */
  qrSvg: string;
  toasts: { title: string; body: string }[];
}

/**
 * The hero's right side: the QR poster as a physical object — 3D tilt that
 * follows the pointer, a slow float, and booking/review notifications that
 * drift in around it so the product feels alive on first paint.
 */
export function HeroVisual({ posterPng, posterSvg, qrSvg, toasts }: HeroVisualProps) {
  const reduce = useReducedMotion();

  const poster = posterPng ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={posterPng}
      alt="Qlick QR poster"
      className="aspect-[794/1123] w-full rounded-2xl object-cover"
    />
  ) : posterSvg ? (
    <div
      className="aspect-[794/1123] w-full overflow-hidden rounded-2xl [&>svg]:h-full [&>svg]:w-full"
      dangerouslySetInnerHTML={{ __html: posterSvg }}
    />
  ) : (
    <div
      className="aspect-square w-full overflow-hidden rounded-2xl bg-white p-6 [&>svg]:h-full [&>svg]:w-full"
      dangerouslySetInnerHTML={{ __html: qrSvg }}
    />
  );

  return (
    <div className="relative w-full max-w-[380px]">
      {/* ambient gold halo behind the poster */}
      <div className="absolute -inset-10 -z-10 rounded-[48px] bg-gold/15 blur-3xl" />

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 40, rotate: 2 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      >
        <TiltCard max={7}>
          <motion.div
            animate={reduce ? undefined : { y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="overflow-hidden rounded-2xl shadow-2xl shadow-black/70 ring-1 ring-white/10"
          >
            {poster}
          </motion.div>
        </TiltCard>
      </motion.div>

      {/* floating booking toast — top left */}
      {toasts[0] && (
        <motion.div
          initial={reduce ? false : { opacity: 0, x: -24, y: 12 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="absolute -left-6 top-10 z-10 sm:-left-14"
        >
          <motion.div
            animate={reduce ? undefined : { y: [0, -7, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2/30 px-4 py-3 shadow-xl shadow-black/50 backdrop-blur-sm"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
              <CalendarCheck className="size-4" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">{toasts[0].title}</p>
              <p className="text-xs text-muted">{toasts[0].body}</p>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* floating review toast — bottom right */}
      {toasts[1] && (
        <motion.div
          initial={reduce ? false : { opacity: 0, x: 24, y: 12 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.7, delay: 1.3, ease: [0.16, 1, 0.3, 1] }}
          className="absolute -right-4 bottom-16 z-10 sm:-right-12"
        >
          <motion.div
            animate={reduce ? undefined : { y: [0, 8, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2/30 px-4 py-3 shadow-xl shadow-black/50 backdrop-blur-sm"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
              <Star className="size-4 fill-gold" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">{toasts[1].title}</p>
              <p className="text-xs text-muted">{toasts[1].body}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
