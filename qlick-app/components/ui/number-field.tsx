"use client";

import * as React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type NumberFieldProps = React.InputHTMLAttributes<HTMLInputElement>;

/**
 * Number input with themed up/down steppers instead of the browser's native
 * (white) spinner. The arrows call the native stepUp/stepDown (so they respect
 * min/max/step) and dispatch an `input` event so React's controlled onChange
 * fires normally.
 */
const NumberField = React.forwardRef<HTMLInputElement, NumberFieldProps>(
  ({ className, disabled, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);

    const step = (dir: 1 | -1) => {
      const el = innerRef.current;
      if (!el || disabled) return;
      if (dir > 0) el.stepUp();
      else el.stepDown();
      // React listens to the native `input` event for controlled onChange.
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.focus();
    };

    return (
      <div className="relative">
        <input
          ref={innerRef}
          type="number"
          disabled={disabled}
          className={cn(
            "flex h-11 w-full rounded-lg border border-border bg-surface py-2 pl-3.5 pr-9 text-sm text-foreground transition-colors",
            "placeholder:text-muted-2",
            "focus-visible:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            className,
          )}
          {...props}
        />
        <div className="absolute inset-y-px right-px flex w-7 flex-col overflow-hidden rounded-r-[9px] border-l border-border">
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => step(1)}
            aria-label="+"
            className="flex flex-1 items-center justify-center text-muted transition-colors hover:bg-surface-2 hover:text-gold disabled:opacity-40"
          >
            <ChevronUp className="size-3.5" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => step(-1)}
            aria-label="-"
            className="flex flex-1 items-center justify-center border-t border-border text-muted transition-colors hover:bg-surface-2 hover:text-gold disabled:opacity-40"
          >
            <ChevronDown className="size-3.5" />
          </button>
        </div>
      </div>
    );
  },
);
NumberField.displayName = "NumberField";

export { NumberField };
