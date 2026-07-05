"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Loader2, Monitor } from "lucide-react";
import { useDict } from "@/i18n/provider";
import type { QrDesign, TableRow } from "@/lib/qr-template";

const QrEditor = dynamic(
  () => import("./qr-editor").then((m) => m.QrEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[60vh] items-center justify-center text-muted">
        <Loader2 className="mr-2 size-5 animate-spin" /> …
      </div>
    ),
  },
);

interface Props {
  locale: string;
  businessId: string;
  businessName: string;
  bookingUrl: string;
  initialDesign: QrDesign;
  scheduleRows: TableRow[];
}

export function QrEditorLoader(props: Props) {
  const t = useDict().dashboard.qr;
  // The canvas editor is a precision desktop tool (drag/drop on an A4 canvas +
  // side properties panel) — impractical with a finger. On small screens we
  // show a friendly notice instead of mounting the heavy Konva editor.
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (isDesktop === null) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted">
        <Loader2 className="mr-2 size-5 animate-spin" />
      </div>
    );
  }

  if (!isDesktop) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <span className="grid size-14 place-items-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
          <Monitor className="size-7" />
        </span>
        <h2 className="font-display text-xl font-bold text-foreground">
          {t.mobileTitle}
        </h2>
        <p className="max-w-sm text-sm leading-relaxed text-muted">
          {t.mobileBody}
        </p>
      </div>
    );
  }

  return <QrEditor {...props} />;
}
