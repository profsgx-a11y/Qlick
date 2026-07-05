import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** Line-style lucide icon, rendered inside a gold chip. */
  icon: React.ReactNode;
  /** Optional bold display title. */
  title?: string;
  /** The main explanatory sentence. */
  message: string;
  /** Optional CTA (usually a gold <Button>). */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Premium empty state — a centred card with a gold icon chip, a faint gold
 * glow at the top edge, and an optional CTA. Rises in on first paint. Shared
 * across the dashboard so every "nothing here yet" screen feels intentional.
 */
export function EmptyState({
  icon,
  title,
  message,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "animate-rise relative overflow-hidden rounded-2xl border border-border bg-surface px-6 py-14 text-center elev-card",
        className,
      )}
    >
      {/* Faint gold halo bleeding from the top edge. */}
      <div
        aria-hidden
        className="glow-gold pointer-events-none absolute inset-x-0 top-0 h-32 opacity-70"
      />
      <div className="relative mx-auto flex max-w-sm flex-col items-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-gold/10 text-gold ring-1 ring-gold/20 [&_svg]:size-6">
          {icon}
        </span>
        {title && (
          <h3 className="mt-5 font-display text-lg font-bold text-foreground">
            {title}
          </h3>
        )}
        <p
          className={cn(
            "text-sm text-muted",
            title ? "mt-1.5" : "mt-5",
          )}
        >
          {message}
        </p>
        {action && <div className="mt-6">{action}</div>}
      </div>
    </div>
  );
}
