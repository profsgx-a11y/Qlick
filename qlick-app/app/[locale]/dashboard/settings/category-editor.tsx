"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CategoryPicker } from "@/components/dashboard/category-picker";
import { useDict } from "@/i18n/provider";
import { dashErr } from "@/lib/dash-error";
import { saveBusinessCategories } from "./actions";

export interface CategoryGroup {
  label: string;
  options: { id: string; name: string }[];
}

interface CategoryEditorProps {
  locale: string;
  groups: CategoryGroup[];
  selected: string[];
}

export function CategoryEditor({ locale, groups, selected }: CategoryEditorProps) {
  const dd = useDict().dashboard;
  const s = dd.settings;
  const [sel, setSel] = useState<string[]>(selected);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    setSaved(false);
    if (sel.length === 0) {
      setError(s.catPickOne);
      return;
    }
    startTransition(async () => {
      const res = await saveBusinessCategories(locale, sel);
      if (!res.ok) {
        setError(dashErr(dd.errors, res.error, s.catError));
        return;
      }
      setSaved(true);
    });
  };

  return (
    <Card className="max-w-2xl">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">
        {s.catTitle}
      </h3>
      <p className="mb-4 mt-1 text-sm text-muted">{s.catSubtitle}</p>

      <CategoryPicker
        groups={groups}
        value={sel}
        onChange={(ids) => {
          setSel(ids);
          setSaved(false);
        }}
        disabled={isPending}
      />

      {error && (
        <p className="mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={save} disabled={isPending}>
          {isPending ? dd.saving : s.saveCategories}
        </Button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm text-success">
            <Check className="size-4" /> {dd.saved}
          </span>
        )}
      </div>
    </Card>
  );
}
