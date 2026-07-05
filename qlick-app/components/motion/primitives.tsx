"use client";

/**
 * Motion primitives — the shared animation vocabulary of the marketing pages.
 * All primitives respect prefers-reduced-motion and degrade to static output.
 */

import * as React from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
  useReducedMotion,
  useInView,
  animate,
} from "motion/react";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────
   Reveal — fade + rise when the element scrolls into view.
   ──────────────────────────────────────────────────────────────── */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
  once = true,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.25, margin: "0px 0px -40px 0px" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────
   TiltCard — 3D perspective tilt that follows the pointer.
   Driven by motion values (no React re-renders per frame).
   ──────────────────────────────────────────────────────────────── */
export function TiltCard({
  children,
  className,
  max = 9,
}: {
  children: React.ReactNode;
  className?: string;
  /** max tilt in degrees */
  max?: number;
}) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), {
    stiffness: 140,
    damping: 18,
  });
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), {
    stiffness: 140,
    damping: 18,
  });

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <div style={{ perspective: 1000 }} className={className}>
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          px.set((e.clientX - r.left) / r.width);
          py.set((e.clientY - r.top) / r.height);
        }}
        onPointerLeave={() => {
          px.set(0.5);
          py.set(0.5);
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Parallax — element drifts vertically as the page scrolls past it.
   ──────────────────────────────────────────────────────────────── */
export function Parallax({
  children,
  className,
  distance = 40,
}: {
  children: React.ReactNode;
  className?: string;
  /** total px of drift across the element's scroll journey */
  distance?: number;
}) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────
   CountUp — number animates from 0 when it enters the viewport.
   ──────────────────────────────────────────────────────────────── */
export function CountUp({
  to,
  className,
  duration = 1.4,
}: {
  to: number;
  className?: string;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });

  React.useEffect(() => {
    if (!ref.current) return;
    if (reduce || !inView) {
      if (reduce) ref.current.textContent = String(to);
      return;
    }
    const controls = animate(0, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = String(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [inView, reduce, to, duration]);

  return (
    <span ref={ref} className={className}>
      {reduce ? to : 0}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────
   Magnetic — the element leans toward the pointer (for primary CTAs).
   ──────────────────────────────────────────────────────────────── */
export function Magnetic({
  children,
  className,
  strength = 0.25,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 180, damping: 16 });
  const sy = useSpring(y, { stiffness: 180, damping: 16 });

  if (reduce) return <div className={cn("inline-block", className)}>{children}</div>;

  return (
    <motion.div
      className={cn("inline-block", className)}
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}
