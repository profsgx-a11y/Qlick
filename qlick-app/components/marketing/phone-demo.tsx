"use client";

import * as React from "react";
import { motion, useReducedMotion, useInView } from "motion/react";

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
 * A looping, self-playing preview of the *real* booking flow inside a phone
 * frame. These are actual screenshots of the live /b/[slug]/book journey
 * (shop → service → day & time → staff → confirm → booked), cross-fading so
 * visitors see the genuine product rather than a stylised mock.
 */
const FRAMES = ["/1.jpg", "/2.jpg", "/3.jpg"];
// shop → pick day & time → confirm. Linger a touch on the confirmation.
const DELAYS = [2600, 2600, 3200];

export function PhoneDemo({ s }: { s: PhoneDemoStrings }) {
  const reduce = useReducedMotion();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.4 });
  const [i, setI] = React.useState(0);

  React.useEffect(() => {
    if (reduce || !inView) return;
    const t = setTimeout(() => setI((p) => (p + 1) % FRAMES.length), DELAYS[i]);
    return () => clearTimeout(t);
  }, [i, reduce, inView]);

  return (
    <div
      ref={rootRef}
      className="relative mx-auto w-[300px] rounded-[44px] border border-border-strong bg-surface p-2.5 shadow-2xl shadow-black/70 ring-1 ring-white/5 sm:w-[320px]"
    >
      <div className="relative h-[540px] overflow-hidden rounded-[34px] bg-background sm:h-[578px]">
        {FRAMES.map((src, idx) => (
          <motion.img
            // eslint-disable-next-line @next/next/no-img-element
            key={src}
            src={src}
            alt={s.shopName}
            aria-hidden={idx !== i}
            initial={false}
            animate={{ opacity: idx === i ? 1 : 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="absolute inset-0 h-full w-full object-cover object-center"
            draggable={false}
          />
        ))}
      </div>
    </div>
  );
}
