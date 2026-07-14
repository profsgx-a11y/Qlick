"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "@/i18n/config";
import { normalizePhone } from "@/lib/validation";

export interface CustomerListItem {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  hasAccount: boolean;
  visits: number; // completed appointments
  upcoming: number; // pending/confirmed in the future
  totalSpentCents: number;
  lastVisitIso: string | null;
  hasNote: boolean;
}

/** Resolves the signed-in owner/manager's business id, or null. */
async function getBiz() {
  const supabase = await createClient();
  const { data: biz } = await supabase
    .from("my_businesses")
    .select("id, my_role")
    .limit(1)
    .maybeSingle();
  const ok =
    !!biz?.id && (biz.my_role === "owner" || biz.my_role === "manager");
  return { supabase, businessId: ok ? (biz!.id as string) : null };
}

interface Card {
  id: string;
  customer_id: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

/**
 * Ensure every registered customer who has booked online has a card. New online
 * customers appear automatically without touching the core booking RPC. Cheap
 * at current scale (single business); revisit with a DB-side sync if it grows.
 */
async function syncRegisteredCustomers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
) {
  const [{ data: onlineRows }, { data: cardRows }, { data: memberRows }] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("customer_id")
        .eq("business_id", businessId)
        .in("source", ["qr", "web"]),
      supabase
        .from("business_customers")
        .select("customer_id")
        .eq("business_id", businessId)
        .not("customer_id", "is", null),
      supabase
        .from("business_members")
        .select("user_id")
        .eq("business_id", businessId),
    ]);

  const existing = new Set(
    (cardRows ?? []).map((r) => r.customer_id).filter(Boolean),
  );
  const members = new Set((memberRows ?? []).map((r) => r.user_id));
  const missing = [
    ...new Set(
      (onlineRows ?? [])
        .map((r) => r.customer_id)
        .filter(
          (id): id is string => !!id && !existing.has(id) && !members.has(id),
        ),
    ),
  ];
  if (missing.length === 0) return;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, phone")
    .in("id", missing);

  const rows = (profiles ?? []).map((p) => ({
    business_id: businessId,
    customer_id: p.id,
    first_name: p.first_name,
    last_name: p.last_name,
    phone: p.phone,
  }));
  if (rows.length) {
    await supabase.from("business_customers").upsert(rows, {
      onConflict: "business_id,customer_id",
      ignoreDuplicates: true,
    });
  }
}

export async function listCustomers(search?: string): Promise<{
  ok: boolean;
  error?: string;
  customers?: CustomerListItem[];
}> {
  const { supabase, businessId } = await getBiz();
  if (!businessId) return { ok: false, error: "no_permission" };

  await syncRegisteredCustomers(supabase, businessId);

  const { data: cardData } = await supabase
    .from("business_customers")
    .select("id, customer_id, first_name, last_name, phone, email, notes")
    .eq("business_id", businessId);
  const cards: Card[] = cardData ?? [];

  // Booking aggregates, computed in the app layer (fine at current scale).
  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "business_customer_id, customer_id, price_cents, starts_at, status, source",
    )
    .eq("business_id", businessId);

  const nowMs = Date.now();
  const byBcid = new Map<string, Card>();
  const byCustomerId = new Map<string, Card>();
  for (const c of cards) {
    byBcid.set(c.id, c);
    if (c.customer_id) byCustomerId.set(c.customer_id, c);
  }

  const agg = new Map<
    string,
    { visits: number; upcoming: number; spent: number; last: number }
  >();
  const bump = (cardId: string) => {
    let a = agg.get(cardId);
    if (!a) {
      a = { visits: 0, upcoming: 0, spent: 0, last: 0 };
      agg.set(cardId, a);
    }
    return a;
  };

  for (const b of bookings ?? []) {
    let card = b.business_customer_id
      ? byBcid.get(b.business_customer_id)
      : undefined;
    if (!card && b.customer_id && (b.source === "qr" || b.source === "web"))
      card = byCustomerId.get(b.customer_id);
    if (!card) continue;

    const a = bump(card.id);
    const startMs = new Date(b.starts_at).getTime();
    if (b.status === "completed") {
      a.visits += 1;
      a.spent += b.price_cents ?? 0;
      if (startMs > a.last) a.last = startMs;
    } else if (
      (b.status === "pending" || b.status === "confirmed") &&
      startMs >= nowMs
    ) {
      a.upcoming += 1;
    }
  }

  let customers: CustomerListItem[] = cards.map((c) => {
    const a = agg.get(c.id);
    return {
      id: c.id,
      firstName: c.first_name,
      lastName: c.last_name,
      phone: c.phone,
      email: c.email,
      hasAccount: !!c.customer_id,
      visits: a?.visits ?? 0,
      upcoming: a?.upcoming ?? 0,
      totalSpentCents: a?.spent ?? 0,
      lastVisitIso: a?.last ? new Date(a.last).toISOString() : null,
      hasNote: !!(c.notes && c.notes.trim()),
    };
  });

  const q = (search ?? "").trim().toLowerCase();
  if (q) {
    customers = customers.filter((c) => {
      const name = `${c.firstName ?? ""} ${c.lastName ?? ""}`.toLowerCase();
      const phone = (c.phone ?? "").toLowerCase();
      const email = (c.email ?? "").toLowerCase();
      return name.includes(q) || phone.includes(q) || email.includes(q);
    });
  }

  // Upcoming first, then most-recent visit, then name.
  customers.sort((a, b) => {
    if (b.upcoming !== a.upcoming) return b.upcoming - a.upcoming;
    const la = a.lastVisitIso ? Date.parse(a.lastVisitIso) : 0;
    const lb = b.lastVisitIso ? Date.parse(b.lastVisitIso) : 0;
    if (lb !== la) return lb - la;
    return `${a.firstName ?? ""}`.localeCompare(`${b.firstName ?? ""}`);
  });

  return { ok: true, customers };
}

export interface CustomerBooking {
  id: string;
  startsAtIso: string;
  endsAtIso: string;
  serviceName: string | null;
  staffName: string | null;
  priceCents: number;
  status: string;
  seriesId: string | null;
}

export interface CustomerSeries {
  id: string;
  serviceName: string | null;
  patternType: string;
  intervalN: number;
  weekday: number | null;
  nth: number | null;
  dayOfMonth: number | null;
  timeOfDay: string;
  nextIso: string | null;
}

export interface CustomerDetail {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  hasAccount: boolean;
  visits: number;
  totalSpentCents: number;
  lastVisitIso: string | null;
  bookings: CustomerBooking[];
  series: CustomerSeries[];
}

export async function getCustomer(
  id: string,
): Promise<{ ok: boolean; error?: string; customer?: CustomerDetail }> {
  const { supabase, businessId } = await getBiz();
  if (!businessId) return { ok: false, error: "no_permission" };

  const { data: card } = await supabase
    .from("business_customers")
    .select("id, customer_id, first_name, last_name, phone, email, notes")
    .eq("id", id)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!card) return { ok: false, error: "not_found" };

  // History: bookings linked by card id, or (for a linked account) online
  // bookings by customer_id.
  let query = supabase
    .from("bookings")
    .select(
      "id, starts_at, ends_at, service_name, price_cents, status, series_id, staff:staff(name)",
    )
    .eq("business_id", businessId)
    .order("starts_at", { ascending: false });

  if (card.customer_id) {
    query = query.or(
      `business_customer_id.eq.${card.id},customer_id.eq.${card.customer_id}`,
    );
  } else {
    query = query.eq("business_customer_id", card.id);
  }

  const { data: rows } = await query;

  const bookings: CustomerBooking[] = (rows ?? []).map((b) => {
    const st = b.staff as { name: string } | { name: string }[] | null;
    const staffName = Array.isArray(st) ? st[0]?.name ?? null : st?.name ?? null;
    return {
      id: b.id,
      startsAtIso: b.starts_at,
      endsAtIso: b.ends_at,
      serviceName: b.service_name,
      staffName,
      priceCents: b.price_cents ?? 0,
      status: b.status,
      seriesId: b.series_id,
    };
  });

  const completed = bookings.filter((b) => b.status === "completed");
  const totalSpentCents = completed.reduce((s, b) => s + b.priceCents, 0);
  const lastVisitIso =
    completed
      .map((b) => b.startsAtIso)
      .sort()
      .at(-1) ?? null;

  // Active recurring series for this customer, with their next upcoming date.
  const { data: seriesRows } = await supabase
    .from("recurring_series")
    .select(
      "id, service_name, pattern_type, interval_n, weekday, nth, day_of_month, time_of_day",
    )
    .eq("business_id", businessId)
    .eq("business_customer_id", card.id)
    .eq("status", "active");

  const nowMs = Date.now();
  const nextBySeriesId = new Map<string, string>();
  for (const b of (rows ?? [])
    .slice()
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))) {
    if (
      b.series_id &&
      (b.status === "pending" || b.status === "confirmed") &&
      new Date(b.starts_at).getTime() >= nowMs &&
      !nextBySeriesId.has(b.series_id)
    ) {
      nextBySeriesId.set(b.series_id, b.starts_at);
    }
  }

  const series: CustomerSeries[] = (seriesRows ?? []).map((s) => ({
    id: s.id,
    serviceName: s.service_name,
    patternType: s.pattern_type,
    intervalN: s.interval_n,
    weekday: s.weekday,
    nth: s.nth,
    dayOfMonth: s.day_of_month,
    timeOfDay: s.time_of_day,
    nextIso: nextBySeriesId.get(s.id) ?? null,
  }));

  return {
    ok: true,
    customer: {
      id: card.id,
      firstName: card.first_name,
      lastName: card.last_name,
      phone: card.phone,
      email: card.email,
      notes: card.notes,
      hasAccount: !!card.customer_id,
      visits: completed.length,
      totalSpentCents,
      lastVisitIso,
      bookings,
      series,
    },
  };
}

export interface CustomerInput {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  notes: string;
}

function cleanInput(input: CustomerInput) {
  const firstName = input.firstName.trim().slice(0, 80) || null;
  const lastName = input.lastName.trim().slice(0, 80) || null;
  const email = input.email.trim().slice(0, 160) || null;
  const notes = input.notes.trim().slice(0, 1000) || null;
  let phone: string | null = null;
  if (input.phone.trim()) {
    phone = normalizePhone(input.phone);
    if (!phone) return { error: "invalid_phone" as const };
  }
  return { firstName, lastName, phone, email, notes };
}

export async function createCustomer(
  locale: string,
  input: CustomerInput,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const { supabase, businessId } = await getBiz();
  if (!businessId) return { ok: false, error: "no_permission" };

  const cleaned = cleanInput(input);
  if ("error" in cleaned) return { ok: false, error: cleaned.error };
  if (!cleaned.firstName && !cleaned.lastName && !cleaned.phone)
    return { ok: false, error: "need_name_or_phone" };

  const { data: created, error } = await supabase
    .from("business_customers")
    .insert({
      business_id: businessId,
      first_name: cleaned.firstName,
      last_name: cleaned.lastName,
      phone: cleaned.phone,
      email: cleaned.email,
      notes: cleaned.notes,
    })
    .select("id")
    .single();
  if (error || !created) return { ok: false, error: "save_failed" };

  revalidatePath(`/${safeLocale}/dashboard/customers`);
  return { ok: true, id: created.id };
}

export async function updateCustomer(
  locale: string,
  id: string,
  input: CustomerInput,
): Promise<{ ok: boolean; error?: string }> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const { supabase, businessId } = await getBiz();
  if (!businessId) return { ok: false, error: "no_permission" };

  const { data: card } = await supabase
    .from("business_customers")
    .select("id, customer_id")
    .eq("id", id)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!card) return { ok: false, error: "not_found" };

  const cleaned = cleanInput(input);
  if ("error" in cleaned) return { ok: false, error: cleaned.error };

  // For accounts, the name/phone/email mirror the customer's own profile and
  // aren't ours to overwrite — only the private note is editable.
  const patch = card.customer_id
    ? { notes: cleaned.notes }
    : {
        first_name: cleaned.firstName,
        last_name: cleaned.lastName,
        phone: cleaned.phone,
        email: cleaned.email,
        notes: cleaned.notes,
      };

  const { error } = await supabase
    .from("business_customers")
    .update(patch)
    .eq("id", id)
    .eq("business_id", businessId);
  if (error) return { ok: false, error: "save_failed" };

  revalidatePath(`/${safeLocale}/dashboard/customers`);
  return { ok: true };
}

export async function deleteCustomer(
  locale: string,
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const safeLocale = hasLocale(locale) ? locale : "el";
  const { supabase, businessId } = await getBiz();
  if (!businessId) return { ok: false, error: "no_permission" };

  // Only manually-added cards (no linked account) can be deleted; account cards
  // are the customer's own record.
  const { data: card } = await supabase
    .from("business_customers")
    .select("id, customer_id")
    .eq("id", id)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!card) return { ok: false, error: "not_found" };
  if (card.customer_id) return { ok: false, error: "cannot_delete_account" };

  const { error } = await supabase
    .from("business_customers")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);
  if (error) return { ok: false, error: "delete_failed" };

  revalidatePath(`/${safeLocale}/dashboard/customers`);
  return { ok: true };
}
