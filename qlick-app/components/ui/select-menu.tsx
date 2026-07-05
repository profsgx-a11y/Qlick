"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  /** Render as a sub-item (indented) — e.g. a child category. */
  indent?: boolean;
}

interface SelectMenuProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  /** Wrapper class — use for width/placement (e.g. "w-44"). */
  className?: string;
  /** Trigger button class — use for height/padding overrides (e.g. "h-9 px-2"). */
  triggerClassName?: string;
  ariaLabel?: string;
  /** Shown on the trigger when the current value has no matching option. */
  placeholder?: string;
  /** Centre the selected label in the trigger (e.g. for compact time pickers). */
  centerLabel?: boolean;
}

/**
 * Themed dropdown that replaces the native <select> (whose open menu is drawn by
 * the OS and can't be styled). Premium dark/gold look, keyboard-accessible,
 * closes on outside click / Escape. Mobile-friendly (tap targets + scroll).
 */
export function SelectMenu({
  id,
  value,
  onChange,
  options,
  disabled,
  className,
  triggerClassName,
  ariaLabel,
  placeholder,
  centerLabel,
}: SelectMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const label = selected?.label ?? placeholder ?? "";

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Land focus on the selected (or first) option when opening.
  useEffect(() => {
    if (!open) return;
    const el =
      panelRef.current?.querySelector<HTMLElement>(
        "[data-opt][data-selected='true']",
      ) ?? panelRef.current?.querySelector<HTMLElement>("[data-opt]");
    el?.focus();
  }, [open]);

  const move = (dir: 1 | -1) => {
    const opts = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>("[data-opt]") ?? [],
    );
    const idx = opts.findIndex((o) => o === document.activeElement);
    opts[(idx + dir + opts.length) % opts.length]?.focus();
  };

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (
            !disabled &&
            (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")
          ) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-foreground transition-colors hover:border-gold/50 focus-visible:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30 disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-gold ring-2 ring-gold/30",
          triggerClassName,
        )}
      >
        <span className={cn("truncate", centerLabel && "flex-1 text-center")}>
          {label}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted transition-transform",
            open && "rotate-180 text-gold",
          )}
        />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="listbox"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              move(1);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              move(-1);
            }
          }}
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-72 overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-2xl"
        >
          {options.map((o) => {
            const isSel = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={isSel}
                data-opt
                data-selected={isSel}
                onClick={() => pick(o.value)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-[color,background-color,box-shadow] duration-200 ease-[var(--ease-out)] focus:outline-none",
                  o.indent && "pl-6",
                  isSel
                    ? "bg-gold/10 font-medium text-gold"
                    : "text-foreground hover:bg-gold/10 hover:text-gold hover:[box-shadow:var(--glow-nav)] focus:bg-gold/10 focus:text-gold focus:[box-shadow:var(--glow-nav)]",
                )}
              >
                <span className="truncate">{o.label}</span>
                {isSel && <Check className="size-4 shrink-0 text-gold" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
