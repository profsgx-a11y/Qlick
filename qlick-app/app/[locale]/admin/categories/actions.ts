"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Res = { ok: boolean; error?: string };

export interface SaveCategoryInput {
  id?: string;
  nameEl: string;
  nameEn: string;
  slug: string;
  parentId: string | null;
}

export async function saveCategory(
  locale: string,
  input: SaveCategoryInput,
): Promise<Res> {
  const nameEl = input.nameEl.trim();
  const nameEn = input.nameEn.trim();
  const slug = input.slug.trim().toLowerCase();
  if (!nameEl || !nameEn) return { ok: false, error: "enter_name" };
  if (!slug) return { ok: false, error: "enter_slug" };

  const supabase = await createClient();

  // Slug must be unique (excluding the row being edited).
  const { data: dup } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug);
  if (dup && dup.some((d) => d.id !== input.id)) {
    return { ok: false, error: "slug_taken" };
  }

  if (input.id) {
    const { error } = await supabase
      .from("categories")
      .update({ name_el: nameEl, name_en: nameEn, slug })
      .eq("id", input.id);
    if (error) return { ok: false, error: "save_failed" };
  } else {
    // Append at the end within the chosen parent (max order_index + 1).
    const sibQuery = input.parentId
      ? supabase.from("categories").select("order_index").eq("parent_id", input.parentId)
      : supabase.from("categories").select("order_index").is("parent_id", null);
    const { data: siblings } = await sibQuery;
    const maxOi = (siblings ?? []).reduce(
      (m, r) => Math.max(m, r.order_index ?? 0),
      0,
    );
    const { error } = await supabase.from("categories").insert({
      name_el: nameEl,
      name_en: nameEn,
      slug,
      parent_id: input.parentId,
      order_index: maxOi + 1,
      icon: "tag",
    });
    if (error) {
      return { ok: false, error: error.code === "23505" ? "slug_taken" : "save_failed" };
    }
  }

  revalidatePath(`/${locale}/admin/categories`);
  return { ok: true };
}

export async function deleteCategory(locale: string, id: string): Promise<Res> {
  const supabase = await createClient();

  // Block deleting a parent that still has subcategories.
  const { data: children } = await supabase
    .from("categories")
    .select("id")
    .eq("parent_id", id)
    .limit(1);
  if (children && children.length > 0) {
    return { ok: false, error: "category_has_children" };
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { ok: false, error: "delete_failed" };

  revalidatePath(`/${locale}/admin/categories`);
  return { ok: true };
}
