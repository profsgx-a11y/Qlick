"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeocodeResult } from "@/app/api/geocode/route";

export interface SelectedAddress {
  street: string;
  city: string;
  postcode: string;
  lat: number | null;
  lng: number | null;
  label: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (text: string) => void;
  onSelect: (address: SelectedAddress) => void;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  /** "city" searches settlements; "address" (default) searches streets. */
  kind?: "address" | "city";
  /** Scope street search to this city (structured query). */
  city?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  disabled,
  placeholder,
  id,
  kind = "address",
  city,
}: AddressAutocompleteProps) {
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const justSelected = useRef(false);
  // Only search after the user actually types — not on mount with a pre-filled
  // value, nor on programmatic changes (e.g. when the scoping city changes).
  const userTyped = useRef(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (justSelected.current) {
      justSelected.current = false;
      return;
    }
    if (!userTyped.current) return;
    const q = value.trim();
    if (q.length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q });
        if (kind === "city") params.set("kind", "city");
        else if (city?.trim()) params.set("city", city.trim());
        const res = await fetch(`/api/geocode?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as { results: GeocodeResult[] };
        setResults(data.results);
        setOpen(data.results.length > 0);
        setHighlight(-1);
      } catch {
        /* aborted or network error — ignore */
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, kind, city]);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const pick = (r: GeocodeResult) => {
    justSelected.current = true;
    userTyped.current = false;
    onChange(r.street || r.label.split(",")[0]);
    onSelect({
      street: r.street,
      city: r.city,
      postcode: r.postcode,
      lat: r.lat,
      lng: r.lng,
      label: r.label,
    });
    setOpen(false);
    setResults([]);
  };

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
        <input
          id={id}
          value={value}
          disabled={disabled}
          autoComplete="off"
          placeholder={placeholder}
          onChange={(e) => {
            userTyped.current = true;
            onChange(e.target.value);
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(results.length - 1, h + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(0, h - 1));
            } else if (e.key === "Enter" && highlight >= 0) {
              e.preventDefault();
              pick(results[highlight]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className={cn(
            "flex h-11 w-full rounded-lg border border-border bg-surface pl-9 pr-9 text-sm text-foreground transition-colors",
            "placeholder:text-muted-2",
            "focus-visible:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-2" />
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-surface-2 py-1 shadow-2xl shadow-black/60">
          {results.map((r, i) => (
            <li key={`${r.lat}-${r.lng}-${i}`}>
              <button
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(r)}
                className={cn(
                  "flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors",
                  i === highlight
                    ? "bg-surface-3 text-foreground"
                    : "text-muted hover:bg-surface-3 hover:text-foreground",
                )}
              >
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-gold" />
                <span className="line-clamp-2">{r.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
