"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Scissors,
  Camera,
  Loader2,
  Star,
  CalendarClock,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useDict } from "@/i18n/provider";
import { dashErr } from "@/lib/dash-error";
import {
  createStaff,
  updateStaff,
  deleteStaff,
  toggleStaffActive,
} from "./actions";

export interface StaffRow {
  id: string;
  name: string;
  title: string | null;
  color: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_bookable: boolean;
  service_ids: string[];
}

export interface ServiceOption {
  id: string;
  name: string;
}

interface Props {
  locale: string;
  businessId: string;
  initialStaff: StaffRow[];
  services: ServiceOption[];
  ratings?: Record<string, { avg: number; count: number }>;
}

/** Calendar colors offered for a staff member. */
const STAFF_COLORS = [
  "#d4a857", // gold
  "#5b9bd5", // blue
  "#5fb98e", // green
  "#c97b9e", // pink
  "#b07cc6", // purple
  "#e08a5b", // orange
  "#5cc1c9", // teal
  "#a0a3ab", // grey
];

const emptyForm = {
  name: "",
  title: "",
  color: STAFF_COLORS[0],
  avatar: "",
  isBookable: true,
  serviceIds: [] as string[],
};

export function StaffManager({
  locale,
  businessId,
  initialStaff,
  services,
  ratings = {},
}: Props) {
  const dd = useDict().dashboard;
  const t = dd.staff;
  const [staff, setStaff] = useState<StaffRow[]>(initialStaff);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<StaffRow | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm, serviceIds: services.map((s) => s.id) });
    setError(null);
    setShowForm(true);
  };

  const openEdit = (m: StaffRow) => {
    setEditingId(m.id);
    setForm({
      name: m.name,
      title: m.title ?? "",
      color: m.color ?? STAFF_COLORS[0],
      avatar: m.avatar_url ?? "",
      isBookable: m.is_bookable,
      serviceIds: m.service_ids,
    });
    setError(null);
    setShowForm(true);
  };

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t.pickImage);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(t.imageTooBig);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${businessId}/staff/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("business-assets")
        .upload(path, file, { upsert: true });
      if (upErr) {
        setError(t.uploadFailed + upErr.message);
        return;
      }
      const { data } = supabase.storage
        .from("business-assets")
        .getPublicUrl(path);
      setForm((f) => ({ ...f, avatar: data.publicUrl }));
    } finally {
      setUploading(false);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setError(null);
  };

  const toggleService = (id: string) => {
    setForm((f) => ({
      ...f,
      serviceIds: f.serviceIds.includes(id)
        ? f.serviceIds.filter((x) => x !== id)
        : [...f.serviceIds, id],
    }));
  };

  const submit = () => {
    setError(null);
    const input = {
      name: form.name,
      title: form.title,
      color: form.color,
      avatarUrl: form.avatar,
      isBookable: form.isBookable,
      serviceIds: form.serviceIds,
    };
    startTransition(async () => {
      const res = editingId
        ? await updateStaff(locale, editingId, input)
        : await createStaff(locale, input);
      if (!res.ok || !res.id) {
        setError(dashErr(dd.errors, res.error, dd.genericError));
        return;
      }
      if (editingId) {
        setStaff((prev) =>
          prev.map((m) =>
            m.id === editingId
              ? {
                  ...m,
                  name: input.name,
                  title: input.title || null,
                  color: input.color,
                  avatar_url: input.avatarUrl || null,
                  is_bookable: input.isBookable,
                  service_ids: input.serviceIds,
                }
              : m,
          ),
        );
      } else {
        setStaff((prev) => [
          ...prev,
          {
            id: res.id!,
            name: input.name,
            title: input.title || null,
            color: input.color,
            avatar_url: input.avatarUrl || null,
            is_active: true,
            is_bookable: input.isBookable,
            service_ids: input.serviceIds,
          },
        ]);
      }
      closeForm();
    });
  };

  const onToggleActive = (m: StaffRow) => {
    setStaff((prev) =>
      prev.map((x) => (x.id === m.id ? { ...x, is_active: !x.is_active } : x)),
    );
    startTransition(() => {
      void toggleStaffActive(locale, m.id, !m.is_active);
    });
  };

  const onDelete = (m: StaffRow) => {
    setConfirmDelete(null);
    setStaff((prev) => prev.filter((x) => x.id !== m.id));
    startTransition(() => {
      void deleteStaff(locale, m.id);
    });
  };

  const serviceCount = (m: StaffRow) => m.service_ids.length;

  return (
    <div className="space-y-6">
      {!showForm && (
        <Button onClick={openAdd}>
          <Plus />
          {t.new}
        </Button>
      )}

      {showForm && (
        <Card className="border-gold/30">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-foreground">
              {editingId ? t.editTitle : t.new}
            </h3>
            <button
              onClick={closeForm}
              className="text-muted hover:text-foreground"
              aria-label={dd.close}
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="grid gap-4">
            {/* Photo */}
            <div className="flex items-center gap-4">
              <span
                className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full text-xl font-bold text-black"
                style={{ backgroundColor: form.color }}
              >
                {form.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.avatar}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  (form.name.slice(0, 1) || "?").toUpperCase()
                )}
              </span>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={onPickPhoto}
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => fileRef.current?.click()}
                    disabled={isPending || uploading}
                  >
                    {uploading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Camera />
                    )}
                    {form.avatar ? t.changePhoto : t.addPhoto}
                  </Button>
                  {form.avatar && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, avatar: "" })}
                      disabled={isPending || uploading}
                      className="text-xs text-muted hover:text-danger"
                    >
                      {dd.remove}
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-muted">{t.photoHint}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.name} htmlFor="staff-name" required>
                <Input
                  id="staff-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t.namePlaceholder}
                  disabled={isPending}
                />
              </Field>

              <Field label={t.titleOptional} htmlFor="staff-title">
                <Input
                  id="staff-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder={t.titlePlaceholder}
                  disabled={isPending}
                />
              </Field>
            </div>

            <Field label={t.color} htmlFor="staff-color">
              <div className="flex flex-wrap gap-2">
                {STAFF_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    disabled={isPending}
                    aria-label={`${t.colorAria} ${c}`}
                    className={cn(
                      "size-8 rounded-full border-2 transition-transform",
                      form.color === c
                        ? "scale-110 border-foreground"
                        : "border-transparent hover:scale-105",
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </Field>

            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                {t.servicesPerformed}
              </p>
              {services.length === 0 ? (
                <p className="text-xs text-muted">{t.noServices}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {services.map((s) => {
                    const on = form.serviceIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleService(s.id)}
                        disabled={isPending}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition-[transform,background-color,border-color,color,box-shadow] duration-200 ease-[var(--ease-out)] active:scale-95",
                          on
                            ? "border-gold bg-gold/15 text-gold [box-shadow:var(--glow-nav)]"
                            : "border-border text-muted hover:border-gold-soft hover:bg-gold/5 hover:text-foreground",
                        )}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2/40 px-4 py-3">
              <span className="text-sm text-foreground">{t.acceptsOnline}</span>
              <Switch
                checked={form.isBookable}
                onChange={(v) => setForm({ ...form, isBookable: v })}
                disabled={isPending}
                aria-label={t.acceptsOnline}
              />
            </div>

            {error && (
              <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <Button onClick={submit} disabled={isPending}>
                {isPending ? dd.saving : editingId ? dd.save : dd.add}
              </Button>
              <Button variant="ghost" onClick={closeForm} disabled={isPending}>
                {dd.cancel}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {staff.length === 0 && !showForm ? (
        <EmptyState
          icon={<Users />}
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
          {staff.map((m, i) => (
            <Card
              key={m.id}
              style={{ animationDelay: `${i * 55}ms` }}
              className={cn(
                "group flex flex-wrap items-center justify-between gap-3 py-4",
                !m.is_active && "opacity-60",
              )}
            >
              <div className="flex min-w-0 basis-full items-center gap-3 sm:basis-auto sm:flex-1">
                <span
                  className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full text-sm font-bold text-black ring-2 ring-transparent transition-[transform,box-shadow] duration-300 ease-[var(--ease-out)] group-hover:scale-105 group-hover:ring-gold/40 group-hover:[box-shadow:var(--glow-nav)]"
                  style={{ backgroundColor: m.color ?? "#a0a3ab" }}
                >
                  {m.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.avatar_url}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    m.name.slice(0, 1).toUpperCase()
                  )}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="truncate font-semibold text-foreground">
                      {m.name}
                    </h4>
                    {!m.is_active && (
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">
                        {t.inactive}
                      </span>
                    )}
                    {!m.is_bookable && (
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">
                        {t.notOnline}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                    {m.title && <span className="text-muted">{m.title}</span>}
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-0.5 text-muted">
                      <Scissors className="size-3.5" />
                      {serviceCount(m)} {t.servicesCount}
                    </span>
                    {ratings[m.id] && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2.5 py-0.5 font-semibold tabular-nums text-gold ring-1 ring-inset ring-gold/20">
                        <Star className="size-3.5 fill-gold" />
                        {ratings[m.id].avg.toFixed(1)} ({ratings[m.id].count})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1 ml-auto sm:ml-0">
                <Switch
                  checked={m.is_active}
                  onChange={() => onToggleActive(m)}
                  disabled={isPending}
                  title={m.is_active ? t.disable : t.enable}
                />
                <Link
                  href={`/${locale}/dashboard/staff/${m.id}`}
                  title={t.scheduleLeave}
                  className="grid size-9 place-items-center rounded-lg text-muted transition-[transform,background-color,color] duration-200 ease-[var(--ease-out)] hover:bg-gold/10 hover:text-gold active:scale-95"
                  aria-label={t.scheduleLeave}
                >
                  <CalendarClock className="size-4" />
                </Link>
                <button
                  onClick={() => openEdit(m)}
                  disabled={isPending}
                  className="grid size-9 place-items-center rounded-lg text-muted transition-[transform,background-color,color] duration-200 ease-[var(--ease-out)] hover:bg-gold/10 hover:text-gold active:scale-95"
                  aria-label={dd.edit}
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  onClick={() => setConfirmDelete(m)}
                  disabled={isPending}
                  className="grid size-9 place-items-center rounded-lg text-muted transition-[transform,background-color,color] duration-200 ease-[var(--ease-out)] hover:bg-danger/10 hover:text-danger active:scale-95"
                  aria-label={dd.delete}
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
          title={dd.delete}
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
