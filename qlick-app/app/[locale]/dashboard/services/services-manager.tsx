"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Clock, X, Tag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { SelectMenu } from "@/components/ui/select-menu";
import { NumberField } from "@/components/ui/number-field";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { dashErr } from "@/lib/dash-error";
import { formatPrice, formatDuration, eurosToCents, centsToEuros } from "@/lib/format";
import {
  createService,
  updateService,
  deleteService,
  toggleService,
} from "./actions";

export interface ServiceRow {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  is_active: boolean;
}

interface Props {
  locale: string;
  initialServices: ServiceRow[];
}

const DURATIONS = [15, 20, 30, 45, 60, 90, 120];

const emptyForm = {
  name: "",
  duration: 30,
  price: "",
  description: "",
  isActive: true,
};

export function ServicesManager({ locale, initialServices }: Props) {
  const d = useDict().dashboard;
  const t = d.services;
  const [services, setServices] = useState<ServiceRow[]>(initialServices);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<ServiceRow | null>(null);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (s: ServiceRow) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      duration: s.duration_minutes,
      price: centsToEuros(s.price_cents),
      description: s.description ?? "",
      isActive: s.is_active,
    });
    setError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setError(null);
  };

  const submit = () => {
    setError(null);
    const input = {
      name: form.name,
      durationMinutes: form.duration,
      priceCents: eurosToCents(form.price || "0"),
      description: form.description,
      isActive: form.isActive,
    };
    startTransition(async () => {
      const res = editingId
        ? await updateService(locale, editingId, input)
        : await createService(locale, input);
      if (!res.ok) {
        setError(dashErr(d.errors, res.error, d.genericError));
        return;
      }
      // Optimistic local update
      if (editingId) {
        setServices((prev) =>
          prev.map((s) =>
            s.id === editingId
              ? {
                  ...s,
                  name: input.name,
                  description: input.description || null,
                  duration_minutes: input.durationMinutes,
                  price_cents: input.priceCents,
                  is_active: input.isActive,
                }
              : s,
          ),
        );
      } else {
        setServices((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            name: input.name,
            description: input.description || null,
            duration_minutes: input.durationMinutes,
            price_cents: input.priceCents,
            is_active: input.isActive,
          },
        ]);
      }
      closeForm();
    });
  };

  const onToggle = (s: ServiceRow) => {
    setServices((prev) =>
      prev.map((x) => (x.id === s.id ? { ...x, is_active: !x.is_active } : x)),
    );
    startTransition(() => {
      void toggleService(locale, s.id, !s.is_active);
    });
  };

  const onDelete = (s: ServiceRow) => {
    setConfirmDelete(null);
    setServices((prev) => prev.filter((x) => x.id !== s.id));
    startTransition(() => {
      void deleteService(locale, s.id);
    });
  };

  return (
    <div className="space-y-6">
      {/* Add button */}
      {!showForm && (
        <Button onClick={openAdd}>
          <Plus />
          {t.new}
        </Button>
      )}

      {/* Form */}
      {showForm && (
        <Card className="border-gold/30">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-foreground">
              {editingId ? t.editTitle : t.new}
            </h3>
            <button
              onClick={closeForm}
              className="text-muted hover:text-foreground"
              aria-label={d.close}
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="grid gap-4">
            <Field label={t.name} htmlFor="svc-name" required>
              <Input
                id="svc-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t.namePlaceholder}
                disabled={isPending}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.duration} htmlFor="svc-duration" required>
                <SelectMenu
                  id="svc-duration"
                  value={String(form.duration)}
                  onChange={(v) => setForm({ ...form, duration: Number(v) })}
                  disabled={isPending}
                  options={DURATIONS.map((d) => ({
                    value: String(d),
                    label: formatDuration(d, locale),
                  }))}
                />
              </Field>

              <Field label={t.price} htmlFor="svc-price" required>
                <NumberField
                  id="svc-price"
                  inputMode="decimal"
                  min="0"
                  step="0.50"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="15.00"
                  disabled={isPending}
                />
              </Field>
            </div>

            <Field label={t.descOptional} htmlFor="svc-desc">
              <Textarea
                id="svc-desc"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder={t.descPlaceholder}
                disabled={isPending}
              />
            </Field>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2/40 px-4 py-3">
              <span className="text-sm text-foreground">{t.activeLabel}</span>
              <Switch
                checked={form.isActive}
                onChange={(v) => setForm({ ...form, isActive: v })}
                disabled={isPending}
                aria-label={t.activeLabel}
              />
            </div>

            {error && (
              <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <Button onClick={submit} disabled={isPending}>
                {isPending ? d.saving : editingId ? d.save : d.add}
              </Button>
              <Button variant="ghost" onClick={closeForm} disabled={isPending}>
                {d.cancel}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* List */}
      {services.length === 0 && !showForm ? (
        <EmptyState
          icon={<Tag />}
          message={t.empty}
          action={
            <Button onClick={openAdd}>
              <Plus />
              {t.new}
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {services.map((s, i) => (
            <Card
              key={s.id}
              style={{ animationDelay: `${i * 55}ms` }}
              className={cn(
                "group flex items-center gap-4 py-4",
                !s.is_active && "opacity-60",
              )}
            >
              {/* Gold signature chip */}
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold/10 text-gold ring-1 ring-inset ring-gold/20 transition-transform duration-300 ease-[var(--ease-out)] group-hover:scale-105">
                <Tag className="size-5" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="truncate font-semibold text-foreground">
                    {s.name}
                  </h4>
                  {!s.is_active && (
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">
                      {t.inactive}
                    </span>
                  )}
                </div>
                {s.description && (
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {s.description}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-muted">
                    <Clock className="size-3.5" />
                    {formatDuration(s.duration_minutes, locale)}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-gold/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-gold ring-1 ring-inset ring-gold/20">
                    {formatPrice(s.price_cents, locale)}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Switch
                  checked={s.is_active}
                  onChange={() => onToggle(s)}
                  disabled={isPending}
                  title={s.is_active ? t.disable : t.enable}
                />
                <button
                  onClick={() => openEdit(s)}
                  disabled={isPending}
                  className="grid size-9 place-items-center rounded-lg text-muted transition-[transform,background-color,color] duration-200 ease-[var(--ease-out)] hover:bg-gold/10 hover:text-gold active:scale-95"
                  aria-label={d.edit}
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  onClick={() => setConfirmDelete(s)}
                  disabled={isPending}
                  className="grid size-9 place-items-center rounded-lg text-muted transition-[transform,background-color,color] duration-200 ease-[var(--ease-out)] hover:bg-danger/10 hover:text-danger active:scale-95"
                  aria-label={d.delete}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={d.delete}
          message={t.deleteConfirm.replace("{name}", confirmDelete.name)}
          danger
          pending={isPending}
          onConfirm={() => onDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
