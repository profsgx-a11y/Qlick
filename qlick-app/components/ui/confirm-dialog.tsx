"use client";

import { X } from "lucide-react";
import { useDict } from "@/i18n/provider";

/**
 * Styled replacement for the native browser confirm(). Render it
 * conditionally (like the other dashboard modals) and close it from
 * onCancel / after onConfirm.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = false,
  pending = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useDict().confirmDialog;
  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/50"
        onClick={() => !pending && onCancel()}
      />
      <div className="fixed left-1/2 top-1/2 z-[70] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-5 shadow-2xl">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="font-display text-base font-bold text-foreground">
            {title}
          </h3>
          <button
            onClick={onCancel}
            disabled={pending}
            aria-label={cancelLabel ?? t.cancel}
            className="text-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="text-sm leading-relaxed text-muted">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={pending}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-40"
          >
            {cancelLabel ?? t.cancel}
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className={
              danger
                ? "rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-danger/90 disabled:opacity-40"
                : "rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-gold/90 disabled:opacity-40"
            }
          >
            {confirmLabel ?? t.confirm}
          </button>
        </div>
      </div>
    </>
  );
}
