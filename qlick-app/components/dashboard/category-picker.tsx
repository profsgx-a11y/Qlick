"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";

export interface CategoryPickerGroup {
  label: string;
  options: { id: string; name: string }[];
}

/**
 * Controlled searchable multi-select for service categories.
 * Selected items show as removable chips; the rest are searched in a dropdown.
 */
export function CategoryPicker({
  groups,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  groups: CategoryPickerGroup[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const t = useDict().dashboard;
  const ph = placeholder ?? t.picker.placeholder;
  const allOptions = useMemo(
    () => groups.flatMap((g) => g.options.map((o) => ({ ...o, group: g.label }))),
    [groups],
  );
  const nameById = useMemo(
    () => new Map(allOptions.map((o) => [o.id, o.name])),
    [allOptions],
  );

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selSet = new Set(value);
  const q = query.trim().toLowerCase();
  const matches = allOptions.filter(
    (o) => !selSet.has(o.id) && (!q || o.name.toLowerCase().includes(q)),
  );
  const grouped: { label: string; options: { id: string; name: string }[] }[] =
    [];
  for (const g of groups) {
    const opts = matches.filter((m) => m.group === g.label);
    if (opts.length) grouped.push({ label: g.label, options: opts });
  }

  const add = (id: string) => {
    onChange([...value, id]);
    setQuery("");
  };
  const remove = (id: string) => onChange(value.filter((x) => x !== id));

  return (
    <div>
      {/* Selected chips */}
      <div className="mb-2 flex flex-wrap gap-2">
        {value.length === 0 && (
          <span className="text-sm text-muted-2">{t.picker.noneSelected}</span>
        )}
        {value.map((id) => (
          <span
            key={id}
            className="inline-flex items-center gap-1.5 rounded-full border border-gold bg-gold/10 px-3 py-1.5 text-sm font-medium text-gold"
          >
            {nameById.get(id) ?? "—"}
            <button
              type="button"
              onClick={() => remove(id)}
              disabled={disabled}
              aria-label={t.remove}
              className="text-gold/70 hover:text-gold"
            >
              <X className="size-3.5" />
            </button>
          </span>
        ))}
      </div>

      {/* Search + dropdown */}
      <div ref={boxRef} className="relative">
        <div
          className={cn(
            "flex h-11 items-center gap-2 rounded-lg border bg-surface px-3 transition-colors",
            open ? "border-gold ring-2 ring-gold/30" : "border-border",
          )}
        >
          <Search className="size-4 shrink-0 text-muted-2" />
          <input
            value={query}
            disabled={disabled}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            placeholder={ph}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-2 focus:outline-none"
          />
        </div>

        {open && (
          <div className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border bg-surface p-1 shadow-2xl shadow-black/60">
            {grouped.length === 0 ? (
              <p className="px-3 py-3 text-sm text-muted">{t.picker.noneFound}</p>
            ) : (
              grouped.map((g) => (
                <div key={g.label}>
                  <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted-2">
                    {g.label}
                  </p>
                  {g.options.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => add(o.id)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-gold/10 hover:text-gold focus:bg-gold/10 focus:text-gold focus:outline-none"
                    >
                      {o.name}
                      <Plus className="size-4 shrink-0 text-gold" />
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
