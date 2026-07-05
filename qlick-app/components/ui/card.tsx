import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-rise rounded-2xl border border-border bg-surface p-6 elev-card transition-[transform,box-shadow] duration-300 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:[box-shadow:var(--shadow-card-hover)]",
        className,
      )}
      {...props}
    />
  );
}
