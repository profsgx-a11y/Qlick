"use client";

import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";
import { useDict } from "@/i18n/provider";

export function ComingSoon({ note }: { note?: string }) {
  const t = useDict().dashboard.comingSoon;
  return (
    <div className="p-8">
      <Card className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-gold/15 text-gold">
          <Construction className="size-6" />
        </span>
        <h3 className="font-display text-lg font-bold text-foreground">
          {t.title}
        </h3>
        <p className="max-w-sm text-sm text-muted">{note ?? t.note}</p>
      </Card>
    </div>
  );
}
