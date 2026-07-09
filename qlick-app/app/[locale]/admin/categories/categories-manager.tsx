"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import { useDict } from "@/i18n/provider";
import { adminErr } from "@/lib/admin-error";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { saveCategory, deleteCategory } from "./actions";

interface Cat {
  id: string;
  slug: string;
  name_el: string;
  name_en: string;
  parent_id: string | null;
  order_index: number;
}

type FormState =
  | { mode: "new-parent"; parentId: null; cat?: undefined }
  | { mode: "new-child"; parentId: string; cat?: undefined }
  | { mode: "edit"; parentId: string | null; cat: Cat };

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function CategoriesManager({
  locale,
  categories,
}: {
  locale: string;
  categories: Cat[];
}) {
  const t = useDict().admin.categories;
  const errs = useDict().admin.errors;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState<FormState | null>(null);
  const [nameEl, setNameEl] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");
  const [slugAuto, setSlugAuto] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<Cat | null>(null);

  const dn = (c: Cat) => (locale === "el" ? c.name_el : c.name_en);
  const parents = categories
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.order_index - b.order_index);
  const childrenOf = (id: string) =>
    categories
      .filter((c) => c.parent_id === id)
      .sort((a, b) => a.order_index - b.order_index);

  const open = (next: FormState) => {
    setForm(next);
    if (next.mode === "edit") {
      setNameEl(next.cat.name_el);
      setNameEn(next.cat.name_en);
      setSlug(next.cat.slug);
      setSlugAuto(false);
    } else {
      setNameEl("");
      setNameEn("");
      setSlug("");
      setSlugAuto(true);
    }
  };
  const close = () => setForm(null);

  const onNameEn = (v: string) => {
    setNameEn(v);
    if (slugAuto) setSlug(slugify(v));
  };

  const onSave = () => {
    if (!form) return;
    startTransition(async () => {
      const res = await saveCategory(locale, {
        id: form.mode === "edit" ? form.cat.id : undefined,
        nameEl,
        nameEn,
        slug,
        parentId: form.mode === "edit" ? form.cat.parent_id : form.parentId,
      });
      if (!res.ok) alert(adminErr(errs, res.error, errs.save_failed));
      else {
        close();
        router.refresh();
      }
    });
  };

  const onDelete = (c: Cat) => {
    startTransition(async () => {
      const res = await deleteCategory(locale, c.id);
      setConfirmDelete(null);
      if (!res.ok) alert(adminErr(errs, res.error, errs.delete_failed));
      else router.refresh();
    });
  };

  const parentName =
    form && form.mode === "new-child"
      ? categories.find((c) => c.id === form.parentId)
      : form && form.mode === "edit" && form.cat.parent_id
        ? categories.find((c) => c.id === form.cat.parent_id)
        : null;

  const rowActions = (c: Cat) => (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => open({ mode: "edit", parentId: c.parent_id, cat: c })}
        title={t.edit}
        className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
      >
        <Pencil className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setConfirmDelete(c)}
        disabled={pending}
        title={t.delete}
        className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-danger/15 hover:text-danger disabled:opacity-50"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => open({ mode: "new-parent", parentId: null })}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-gold px-4 text-sm font-semibold text-black transition-colors hover:bg-gold-bright"
        >
          <Plus className="size-4" />
          {t.addParent}
        </button>
      </div>

      <div className="space-y-3">
        {parents.map((p) => (
          <div key={p.id} className="rounded-xl border border-border bg-surface">
            {/* Parent header */}
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{dn(p)}</p>
                <p className="truncate text-xs text-muted-2">
                  {p.name_el} · {p.name_en} · /{p.slug}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => open({ mode: "new-child", parentId: p.id })}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-medium text-muted transition-colors hover:border-gold-soft hover:text-gold"
                >
                  <Plus className="size-3.5" />
                  {t.addChild}
                </button>
                {rowActions(p)}
              </div>
            </div>

            {/* Children */}
            <div className="divide-y divide-border">
              {childrenOf(p.id).length === 0 ? (
                <p className="px-4 py-3 text-xs text-muted-2">{t.noChildren}</p>
              ) : (
                childrenOf(p.id).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 pl-6"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{dn(c)}</p>
                      <p className="truncate text-xs text-muted-2">
                        {c.name_el} · {c.name_en} · /{c.slug}
                      </p>
                    </div>
                    {rowActions(c)}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add / edit form */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={close} aria-hidden />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl shadow-black/60">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-foreground">
                {form.mode === "edit"
                  ? t.editTitle
                  : form.mode === "new-child"
                    ? t.newChildTitle
                    : t.newParentTitle}
              </h3>
              <button onClick={close} className="text-muted hover:text-foreground">
                <X className="size-5" />
              </button>
            </div>

            {parentName && (
              <p className="mb-3 text-sm text-muted">
                {t.parent}: <span className="text-foreground">{dn(parentName)}</span>
              </p>
            )}

            <div className="space-y-3">
              <Field label={t.nameEl}>
                <input
                  value={nameEl}
                  onChange={(e) => setNameEl(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label={t.nameEn}>
                <input
                  value={nameEn}
                  onChange={(e) => onNameEn(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label={t.slug} hint={t.slugHint}>
                <input
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugAuto(false);
                  }}
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={pending}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-gold px-4 text-sm font-semibold text-black transition-colors hover:bg-gold-bright disabled:opacity-50"
              >
                {pending && <Loader2 className="size-4 animate-spin" />}
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={t.delete}
          message={t.confirmDelete.replace("{name}", dn(confirmDelete))}
          danger
          pending={pending}
          onConfirm={() => onDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

const inputCls =
  "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-2 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted-2">{hint}</p>}
    </div>
  );
}
