import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * CSS-only endless marquee. Children are rendered twice inside a track that
 * translates by 50%, so the loop is seamless. Server-safe (no JS).
 */
export function Marquee({
  children,
  reverse = false,
  duration = 42,
  className,
}: {
  children: React.ReactNode;
  reverse?: boolean;
  duration?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "marquee-group overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]",
        className,
      )}
    >
      <div
        style={{ "--marquee-duration": `${duration}s` } as React.CSSProperties}
        className={cn(
          "animate-marquee flex w-max items-center gap-3 pr-3",
          reverse && "animate-marquee-reverse",
        )}
      >
        {children}
        {children}
      </div>
    </div>
  );
}
