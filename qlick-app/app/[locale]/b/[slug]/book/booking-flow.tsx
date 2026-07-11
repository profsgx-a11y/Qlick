"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import {
  Clock,
  Check,
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  Loader2,
  Users,
  Tag,
} from "lucide-react";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { IntlPhoneInput } from "@/components/ui/intl-phone-input";
import { Logo } from "@/components/brand/logo";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { formatPrice, formatDuration } from "@/lib/format";
import { isValidEmail, isValidPhone, normalizePhone } from "@/lib/validation";
import { createClient } from "@/lib/supabase/client";
import {
  getAvailableSlots,
  getAvailableStaffForSlot,
  submitBooking,
} from "./actions";
import type { Slot } from "@/lib/availability";

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
}

interface StaffOpt {
  id: string;
  name: string;
  title: string | null;
  avatarUrl: string | null;
  color: string | null;
}

interface Props {
  locale: string;
  business: { id: string; name: string; slug: string };
  services: Service[];
  staff: StaffOpt[];
  serviceStaff: Record<string, string[]>;
  isAuthenticated: boolean;
  defaultName: string;
  defaultPhone: string;
  source: string;
  // When rendered inside the store-page modal we drop the standalone header
  // (the modal supplies its own chrome + close button) and trim outer padding.
  embedded?: boolean;
}

type Step = "service" | "staff" | "datetime" | "auth" | "confirm" | "done";

// Max length of the customer's free-text note. Kept in sync with the server-side
// cap in ./actions.ts (submitBooking).
const NOTE_MAX_LENGTH = 300;

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function BookingFlow({
  locale,
  business,
  services,
  staff,
  serviceStaff,
  isAuthenticated,
  defaultName,
  defaultPhone,
  source,
  embedded = false,
}: Props) {
  const t = useDict().booking;

  const capableStaffFor = (sid: string) =>
    staff.filter((s) => (serviceStaff[sid] ?? []).includes(s.id));

  // Always start from the service step (predictable on refresh / direct link).
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("service");

  const [date, setDate] = useState<string>(todayIso());
  const [cur, setCur] = useState(() => {
    const [y, m] = todayIso().split("-").map(Number);
    return { y, m };
  });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slot, setSlot] = useState<Slot | null>(null);

  // Staff available for the chosen slot (null = not fetched yet).
  const [availStaffIds, setAvailStaffIds] = useState<string[] | null>(null);
  const [loadingStaff, setLoadingStaff] = useState(false);

  const [authed, setAuthed] = useState(isAuthenticated);
  const [name, setName] = useState(defaultName);
  // Full international phone, prefilled with the saved number or the Greek
  // code (erasable, so visitors from abroad can type their own).
  const [phone, setPhone] = useState<string>(() => {
    const p = defaultPhone ? parsePhoneNumberFromString(defaultPhone) : null;
    return p ? p.formatInternational() : "+30 ";
  });
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const tIso = todayIso();
  const daysInMonth = new Date(cur.y, cur.m, 0).getDate();
  const firstWeekday = (new Date(cur.y, cur.m - 1, 1).getDay() + 6) % 7; // Mon-first
  const atCurrentMonth = (() => {
    const [y, m] = tIso.split("-").map(Number);
    return cur.y === y && cur.m === m;
  })();
  const prevMonth = () =>
    setCur((c) => (c.m === 1 ? { y: c.y - 1, m: 12 } : { y: c.y, m: c.m - 1 }));
  const nextMonth = () =>
    setCur((c) => (c.m === 12 ? { y: c.y + 1, m: 1 } : { y: c.y, m: c.m + 1 }));

  const service = services.find((s) => s.id === serviceId);
  // A bare country code ("+30") counts as "no phone entered". Phone is required
  // for a booking, so a valid number must be present to submit.
  const hasPhone = phone.replace(/\D/g, "").length > 4;
  const phoneValid = hasPhone && isValidPhone(phone);

  // Fetch slots whenever we're on the datetime step (and date/staff change).
  useEffect(() => {
    if (step !== "datetime" || !date || !serviceId) return;
    setLoadingSlots(true);
    setSlot(null);
    getAvailableSlots(business.id, serviceId, date, staffId)
      .then((res) => {
        setSlots(res.slots);
        if (res.error) setError(res.error);
      })
      .finally(() => setLoadingSlots(false));
  }, [step, date, serviceId, staffId, business.id]);

  const pickService = (id: string) => {
    setServiceId(id);
    const cap = capableStaffFor(id);
    // Flow is service → day/time → staff. Times reflect "any available" when
    // ≥2 can do it; with exactly 1 capable we book that person directly.
    setStaffId(cap.length === 1 ? cap[0].id : null);
    const [y, m] = todayIso().split("-").map(Number);
    setCur({ y, m });
    setDate(todayIso());
    setStep("datetime");
  };

  const selectedStaff = staffId
    ? (staff.find((s) => s.id === staffId) ?? null)
    : null;
  const staffLabel = selectedStaff?.name ?? t.anyAvailable;
  const showStaffStep = capableStaffFor(serviceId).length >= 2;

  const pickSlot = (s: Slot) => {
    setSlot(s);
    setError(null);
    // 0/1 capable for the whole service → staff already decided in pickService.
    if (!showStaffStep) {
      setStep(authed ? "confirm" : "auth");
      return;
    }
    // ≥2 can do it: check who is actually free for THIS slot. Only ask if more
    // than one is free — otherwise assign the single person (or leave as "any").
    setLoadingStaff(true);
    setAvailStaffIds(null);
    setStep("staff");
    getAvailableStaffForSlot(business.id, serviceId, date, s.iso)
      .then((res) => {
        setAvailStaffIds(res.staffIds);
        if (res.staffIds.length === 0) {
          // The slot was free when listed but got taken meanwhile → go back.
          setSlot(null);
          setError(t.slotTaken);
          setStep("datetime");
        } else if (res.staffIds.length === 1) {
          setStaffId(res.staffIds[0]);
          setStep(authed ? "confirm" : "auth");
        }
        // ≥2 → stay on the staff step so the customer can choose.
      })
      .finally(() => setLoadingStaff(false));
  };

  const pickStaff = (id: string | null) => {
    setStaffId(id);
    setStep(authed ? "confirm" : "auth");
  };

  // Going back to change the time: re-open datetime as "any available".
  const backToDatetime = () => {
    if (showStaffStep) setStaffId(null);
    setStep("datetime");
  };

  // The staff step is a real stop only when ≥2 people are free for the slot;
  // otherwise it was auto-skipped, so "back" should land on the time picker.
  const staffStepActive = showStaffStep && (availStaffIds?.length ?? 0) >= 2;
  const backFromAfterStaff = () =>
    staffStepActive ? setStep("staff") : backToDatetime();

  const confirm = () => {
    if (!slot || !service) return;
    setError(null);
    startTransition(async () => {
      const res = await submitBooking({
        businessId: business.id,
        serviceId: service.id,
        staffId,
        startsAtIso: slot.iso,
        customerName: name,
        customerPhone: hasPhone ? normalizePhone(phone) ?? "" : "",
        notes,
        source,
      });
      if (!res.ok) {
        if (res.error === "not_authenticated") {
          setAuthed(false);
          setStep("auth");
          return;
        }
        const errMap: Record<string, string> = {
          slot_taken: t.slotTaken,
          slot_in_past: t.slotInPast,
          service_unavailable: t.serviceUnavailable,
          blocked: t.blocked,
          bookings_paused: t.bookingsPaused,
          email_not_confirmed: t.emailNotConfirmed,
          account_suspended: t.accountSuspended,
          too_many_active: t.tooManyActive,
          customer_busy: t.customerBusy,
          failed: t.failed,
        };
        setError((res.error && errMap[res.error]) || t.somethingWrong);
        // If the slot was taken meanwhile, send them back to pick another.
        // backToDatetime resets to "any available" so the refreshed times are
        // complete, and the datetime effect refetches (single source, no race).
        if (res.error === "slot_taken") {
          setSlot(null);
          backToDatetime();
        }
        return;
      }
      setBookingId(res.bookingId ?? null);
      setStep("done");
    });
  };

  const selectedDateLabel = (() => {
    if (!date) return "";
    const [y, mo, dd] = date.split("-").map(Number);
    const d = new Date(y, mo - 1, dd);
    return `${t.weekdaysShort[d.getDay()]} ${dd} ${t.monthsShort[mo - 1]}`;
  })();

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-2xl",
        embedded ? "px-4 pb-8 pt-2" : "px-4 py-8",
      )}
    >
      {/* Header — hidden when embedded in the store-page modal */}
      {!embedded && (
        <div className="mb-6 flex items-center justify-between">
          <Link href={`/${locale}/b/${business.slug}`} className="inline-flex">
            <Logo />
          </Link>
          <Link
            href={`/${locale}/b/${business.slug}`}
            className="text-sm text-muted hover:text-foreground"
          >
            {business.name}
          </Link>
        </div>
      )}

      {step !== "done" && (
        <StepBar step={step} authed={authed} showStaff={showStaffStep} />
      )}

      {/* ── Service selection ── */}
      {step === "service" && (
        <div className="mx-auto mt-6 max-w-md space-y-3">
          <h1 className="text-center font-display text-2xl font-bold text-foreground">
            {t.pickService}
          </h1>
          {services.map((s, i) => (
            <button
              key={s.id}
              onClick={() => pickService(s.id)}
              style={{ animationDelay: `${i * 60}ms` }}
              className="group flex w-full animate-rise items-center gap-4 rounded-2xl border border-border bg-surface p-5 text-left elev-card transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-gold-soft hover:[box-shadow:var(--shadow-card-hover)]"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold/10 text-gold ring-1 ring-inset ring-gold/20 transition-transform duration-300 ease-[var(--ease-out)] group-hover:scale-105">
                <Tag className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground">{s.name}</h3>
                {s.description && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted">
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
              <ArrowRight className="size-4 shrink-0 text-gold transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>
      )}

      {/* ── Staff selection (after the time is chosen) ── */}
      {step === "staff" && service && slot && (
        <div className="mt-6">
          <button
            onClick={backToDatetime}
            className="group mb-4 inline-flex items-center gap-1 text-sm text-muted transition-colors duration-200 ease-[var(--ease-out)] hover:text-gold"
          >
            <ArrowLeft className="size-4 transition-transform duration-200 ease-[var(--ease-out)] group-hover:-translate-x-0.5" />{" "}
            {t.back}
          </button>
          <h1 className="text-center font-display text-2xl font-bold text-foreground">
            {t.pickStaff}
          </h1>
          <p className="mt-1 text-center text-sm text-muted">
            {service.name} · {selectedDateLabel} · {slot.label}
          </p>

          <div className="mx-auto mt-5 max-w-md space-y-3">
            <button
              onClick={() => pickStaff(null)}
              className="group flex w-full animate-rise items-center gap-4 rounded-2xl border border-border bg-surface p-4 text-left elev-card transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-gold-soft hover:[box-shadow:var(--shadow-card-hover)]"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-gold/15 text-gold ring-1 ring-inset ring-gold/20 transition-transform duration-300 ease-[var(--ease-out)] group-hover:scale-105">
                <Users className="size-6" />
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground">
                  {t.anyAvailable}
                </h3>
                <p className="text-sm text-muted">
                  {t.anyAvailableSub}
                </p>
              </div>
              <ArrowRight className="ml-auto size-4 shrink-0 text-gold transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-0.5" />
            </button>

            {loadingStaff && (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted">
                <Loader2 className="size-4 animate-spin" /> {t.checkingAvailability}
              </div>
            )}

            {!loadingStaff &&
              capableStaffFor(serviceId)
                .filter((s) => (availStaffIds ?? []).includes(s.id))
                .map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => pickStaff(s.id)}
                    style={{ animationDelay: `${i * 60}ms` }}
                    className="group flex w-full animate-rise items-center gap-4 rounded-2xl border border-border bg-surface p-4 text-left elev-card transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-gold-soft hover:[box-shadow:var(--shadow-card-hover)]"
                  >
                    <span
                      className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full text-base font-bold text-black ring-2 ring-transparent transition-[transform,box-shadow] duration-300 ease-[var(--ease-out)] group-hover:scale-105 group-hover:ring-gold/40 group-hover:[box-shadow:var(--glow-nav)]"
                      style={{ backgroundColor: s.color ?? "#a0a3ab" }}
                    >
                      {s.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.avatarUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        s.name.slice(0, 1).toUpperCase()
                      )}
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-foreground">
                        {s.name}
                      </h3>
                      {s.title && (
                        <p className="truncate text-sm text-muted">{s.title}</p>
                      )}
                    </div>
                    <ArrowRight className="ml-auto size-4 shrink-0 text-gold transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-0.5" />
                  </button>
                ))}

            {!loadingStaff &&
              availStaffIds !== null &&
              capableStaffFor(serviceId).filter((s) =>
                availStaffIds.includes(s.id),
              ).length === 0 && (
                <p className="text-center text-sm text-muted">
                  {t.noStaffFree}
                </p>
              )}
          </div>
        </div>
      )}

      {/* ── Date & time ── */}
      {step === "datetime" && service && (
        <div className="mt-6">
          <button
            onClick={() => setStep("service")}
            className="group mb-4 inline-flex items-center gap-1 text-sm text-muted transition-colors duration-200 ease-[var(--ease-out)] hover:text-gold"
          >
            <ArrowLeft className="size-4 transition-transform duration-200 ease-[var(--ease-out)] group-hover:-translate-x-0.5" />{" "}
            {t.back}
          </button>

          <h1 className="text-center font-display text-2xl font-bold text-foreground">
            {t.pickDateTime}
          </h1>
          <p className="mt-1 text-center text-sm text-muted">
            {service.name} ·{" "}
            {formatDuration(service.duration_minutes, locale)} ·{" "}
            {formatPrice(service.price_cents, locale)}
          </p>

          {/* Month calendar */}
          <div className="mx-auto mt-5 max-w-xs rounded-2xl border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={prevMonth}
                disabled={atCurrentMonth}
                aria-label={t.prevMonth}
                className="grid size-8 place-items-center rounded-lg border border-border text-muted transition-[transform,background-color,border-color,color] duration-200 ease-[var(--ease-out)] enabled:hover:border-gold-soft enabled:hover:bg-gold/5 enabled:hover:text-gold enabled:active:scale-95 disabled:opacity-30"
              >
                <ArrowLeft className="size-4" />
              </button>
              <span className="text-sm font-semibold capitalize text-foreground">
                {t.monthsShort[cur.m - 1]} {cur.y}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                aria-label={t.nextMonth}
                className="grid size-8 place-items-center rounded-lg border border-border text-muted transition-[transform,background-color,border-color,color] duration-200 ease-[var(--ease-out)] hover:border-gold-soft hover:bg-gold/5 hover:text-gold active:scale-95"
              >
                <ArrowRight className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
              {t.calWeekdays.map((w) => (
                <div key={w} className="py-1">
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstWeekday }).map((_, i) => (
                <div key={`blank-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dnum = i + 1;
                const iso = `${cur.y}-${String(cur.m).padStart(2, "0")}-${String(dnum).padStart(2, "0")}`;
                const past = iso < tIso;
                const selected = iso === date;
                const isToday = iso === tIso;
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={past}
                    onClick={() => {
                      setError(null);
                      setDate(iso);
                    }}
                    className={cn(
                      "grid aspect-square place-items-center rounded-lg text-sm transition-[transform,background-color,color,box-shadow] duration-200 ease-[var(--ease-out)] enabled:active:scale-95",
                      past && "text-muted-2 opacity-40",
                      !past && !selected && "text-foreground hover:bg-gold/10",
                      selected &&
                        "bg-gold font-bold text-black [box-shadow:0_4px_14px_-4px_var(--gold-glow)]",
                      !selected && isToday && "ring-1 ring-gold",
                    )}
                  >
                    {dnum}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slots */}
          <div className="mx-auto mt-6 max-w-lg text-center">
            {error && (
              <p className="mb-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
            {!date && (
              <p className="text-sm text-muted">{t.pickDayForTimes}</p>
            )}
            {date && loadingSlots && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted">
                <Loader2 className="size-4 animate-spin" /> {t.loadingTimes}
              </div>
            )}
            {date && !loadingSlots && slots.length === 0 && (
              <p className="text-sm text-muted">
                {t.noTimes}
              </p>
            )}
            {date && !loadingSlots && slots.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((s, i) => (
                  <button
                    key={s.iso}
                    onClick={() => pickSlot(s)}
                    style={{ animationDelay: `${Math.min(i, 16) * 18}ms` }}
                    className="animate-rise rounded-lg border border-border bg-surface py-2.5 text-sm font-medium text-foreground transition-[transform,background-color,border-color,color] duration-200 ease-[var(--ease-out)] hover:border-gold hover:bg-gold/10 hover:text-gold active:scale-95"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Auth (only if not logged in) ── */}
      {step === "auth" && (
        <AuthStep
          locale={locale}
          slug={business.slug}
          source={source}
          onAuthed={(displayName) => {
            setAuthed(true);
            if (displayName && !name) setName(displayName);
            setStep("confirm");
          }}
          onBack={backFromAfterStaff}
        />
      )}

      {/* ── Confirm ── */}
      {step === "confirm" && service && slot && (
        <div className="mt-6">
          <button
            onClick={backFromAfterStaff}
            className="group mb-4 inline-flex items-center gap-1 text-sm text-muted transition-colors duration-200 ease-[var(--ease-out)] hover:text-gold"
          >
            <ArrowLeft className="size-4 transition-transform duration-200 ease-[var(--ease-out)] group-hover:-translate-x-0.5" />{" "}
            {t.back}
          </button>

          <h1 className="text-center font-display text-2xl font-bold text-foreground">
            {t.confirm}
          </h1>

          {/* Summary */}
          <div className="mx-auto mt-4 max-w-md animate-rise rounded-2xl border border-gold/30 bg-surface p-5 [box-shadow:var(--shadow-card-gold)]">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">{t.service}</span>
              <span className="font-medium text-foreground">{service.name}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted">{t.staff}</span>
              <span className="font-medium text-foreground">{staffLabel}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted">{t.dayTime}</span>
              <span className="font-medium text-foreground">
                {selectedDateLabel} · {slot.label}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted">{t.duration}</span>
              <span className="font-medium text-foreground">
                {formatDuration(service.duration_minutes, locale)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="text-muted">{t.total}</span>
              <span className="font-display text-xl font-bold text-gold">
                {formatPrice(service.price_cents, locale)}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-2">{t.payAtShop}</p>
          </div>

          <div className="mx-auto mt-5 grid max-w-md gap-4">
            <Field label={t.name} htmlFor="bk-name" required>
              <Input
                id="bk-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
              />
            </Field>
            <Field
              label={t.phone}
              htmlFor="bk-phone"
              required
              error={
                phoneTouched && !phoneValid
                  ? hasPhone
                    ? t.invalidPhone
                    : t.phoneRequired
                  : undefined
              }
            >
              <div onBlur={() => setPhoneTouched(true)}>
                <IntlPhoneInput
                  id="bk-phone"
                  value={phone}
                  onChange={setPhone}
                  disabled={isPending}
                  invalid={phoneTouched && !phoneValid}
                />
              </div>
            </Field>
            <Field label={t.noteOptional} htmlFor="bk-notes">
              <Textarea
                id="bk-notes"
                value={notes}
                onChange={(e) =>
                  setNotes(e.target.value.slice(0, NOTE_MAX_LENGTH))
                }
                maxLength={NOTE_MAX_LENGTH}
                placeholder={t.notePlaceholder}
                disabled={isPending}
              />
              <p className="mt-1 text-right text-xs text-muted">
                {notes.length}/{NOTE_MAX_LENGTH}
              </p>
            </Field>

            {error && (
              <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <Button
              size="lg"
              onClick={confirm}
              disabled={isPending || !name.trim() || !phoneValid}
            >
              {isPending ? t.confirming : t.confirmBooking}
            </Button>
          </div>
        </div>
      )}

      {/* ── Done ── */}
      {step === "done" && service && slot && (
        <div className="mt-10 flex animate-rise flex-col items-center text-center">
          <div className="grid size-16 place-items-center rounded-full bg-success/15 text-success ring-1 ring-success/30 [box-shadow:0_0_34px_-6px_color-mix(in_srgb,var(--success)_55%,transparent)]">
            <CalendarCheck className="size-8" />
          </div>
          <h1 className="mt-5 font-display text-3xl font-bold text-foreground">
            {t.booked}
          </h1>
          <p className="mt-2 text-muted">
            {service.name} · {selectedDateLabel} · {slot.label}
          </p>
          <div className="mt-8 flex gap-3">
            <Button asChild variant="secondary">
              <Link href={`/${locale}/account`}>{t.myBookings}</Link>
            </Button>
            <Button asChild>
              <Link href={`/${locale}/b/${business.slug}`}>
                {t.backToShop}
              </Link>
            </Button>
          </div>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted">
            {t.rebookHint}
          </p>
          {bookingId && (
            <p className="mt-6 text-xs text-muted-2">{t.code}: {bookingId.slice(0, 8)}</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────── Step indicator ─────────────── */
function StepBar({
  step,
  authed,
  showStaff,
}: {
  step: Step;
  authed: boolean;
  showStaff: boolean;
}) {
  const t = useDict().booking;
  const base = showStaff
    ? ["service", "datetime", "staff"]
    : ["service", "datetime"];
  const steps = authed ? [...base, "confirm"] : [...base, "auth", "confirm"];
  const labels: Record<string, string> = {
    service: t.stepService,
    datetime: t.stepDatetime,
    staff: t.stepStaff,
    auth: t.stepAuth,
    confirm: t.stepConfirm,
  };
  const currentIdx = steps.indexOf(step);
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s} className="flex flex-1 items-center gap-2">
          <div
            className={cn(
              "grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold transition-[background-color,color,border-color,box-shadow] duration-300 ease-[var(--ease-out)]",
              i < currentIdx
                ? "bg-gold text-black"
                : i === currentIdx
                ? "border-2 border-gold bg-gold/15 text-gold [box-shadow:var(--glow-nav)]"
                : "border border-border bg-surface text-muted-2",
            )}
          >
            {i < currentIdx ? <Check className="size-3" /> : i + 1}
          </div>
          <span
            className={cn(
              "hidden text-xs sm:inline",
              i <= currentIdx ? "text-foreground" : "text-muted-2",
            )}
          >
            {labels[s]}
          </span>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "ml-1 h-px flex-1 transition-colors duration-500 ease-[var(--ease-out)]",
                i < currentIdx ? "bg-gold" : "bg-border",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─────────────── Inline auth step ─────────────── */
function AuthStep({
  locale,
  slug,
  source,
  onAuthed,
  onBack,
}: {
  locale: string;
  slug: string;
  source: string;
  onAuthed: (displayName: string) => void;
  onBack: () => void;
}) {
  const t = useDict().booking;
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    if (!isValidEmail(email)) {
      setError(t.invalidEmail);
      return;
    }
    if (password.length < 8) {
      setError(t.passwordMin);
      return;
    }
    if (mode === "signup" && !fullName.trim()) {
      setError(t.enterName);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (error) {
        setError(
          error.message.toLowerCase().includes("already")
            ? t.emailExists
            : error.message,
        );
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setError(t.wrongCredentials);
        setLoading(false);
        return;
      }
    }
    setLoading(false);
    onAuthed(fullName.trim());
  };

  return (
    <div className="mt-6">
      <button
        onClick={onBack}
        className="group mb-4 inline-flex items-center gap-1 text-sm text-muted transition-colors duration-200 ease-[var(--ease-out)] hover:text-gold"
      >
        <ArrowLeft className="size-4" /> {t.back}
      </button>

      <h1 className="text-center font-display text-2xl font-bold text-foreground">
        {mode === "signup" ? t.createAccountTitle : t.loginTitle}
      </h1>
      <p className="mt-1 text-center text-sm text-muted">{t.authNeeded}</p>

      <div className="mx-auto mt-5 max-w-md">
        <SocialAuthButtons
          locale={locale}
          next={`/${locale}/b/${slug}/book${source === "qr" ? "?src=qr" : ""}`}
          labels={{
            google: t.continueGoogle,
            facebook: t.continueFacebook,
            or: t.orEmail,
          }}
        />
      </div>

      <div className="mx-auto mt-2 grid max-w-md gap-4">
        {mode === "signup" && (
          <Field label={t.name} htmlFor="au-name" required>
            <Input
              id="au-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
            />
          </Field>
        )}
        <Field label="Email" htmlFor="au-email" required>
          <Input
            id="au-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </Field>
        <Field label={t.password} htmlFor="au-pass" required>
          <Input
            id="au-pass"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </Field>

        {error && (
          <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <Button size="lg" onClick={submit} disabled={loading}>
          {loading ? "…" : mode === "signup" ? t.continue : t.login}
        </Button>

        <p className="text-center text-sm text-muted">
          {mode === "signup" ? t.haveAccount : t.noAccount}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signup" ? "login" : "signup");
              setError(null);
            }}
            className="font-medium text-gold hover:underline"
          >
            {mode === "signup" ? t.login : t.signup}
          </button>
        </p>
      </div>
    </div>
  );
}
