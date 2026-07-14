"use client";

import { useState, useEffect, useMemo, useCallback, useTransition } from "react";
import { X, CalendarPlus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { SelectMenu } from "@/components/ui/select-menu";
import { DatePicker } from "../calendar/date-picker";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { dashErr } from "@/lib/dash-error";
import { availableNewSlots, bookCustomerAppointment } from "./recurring-actions";

export interface ServiceOption {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
}
export interface StaffOption {
  id: string;
  name: string;
}

interface Props {
  locale: string;
  tz: string;
  businessCustomerId: string;
  services: ServiceOption[];
  staff: StaffOption[];
  onClose: () => void;
  onBooked: () => void;
}

function todayInZone(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function AppointmentBooker({
  locale,
  tz,
  businessCustomerId,
  services,
  staff,
  onClose,
  onBooked,
}: Props) {
  const d = useDict().dashboard;
  const tb = d.customers.booker;

  const today = useMemo(() => todayInZone(tz), [tz]);

  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [staffId, setStaffId] = useState(""); // "" = anyone
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState<{ iso: string; label: string }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [bookedCount, setBookedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadSlots = useCallback((svcId: string, stfId: string, day: string) => {
    startTransition(async () => {
      setSlotsLoading(true);
      setSelectedIso(null);
      const res = await availableNewSlots({
        serviceId: svcId,
        staffId: stfId || null,
        date: day,
      });
      setSlotsLoading(false);
      setSlots(res.ok ? res.slots ?? [] : []);
    });
  }, []);

  // Reload available times whenever the service, staff or day changes.
  useEffect(() => {
    if (serviceId) loadSlots(serviceId, staffId, date);
  }, [serviceId, staffId, date, loadSlots]);

  const book = () => {
    if (!selectedIso) return;
    setError(null);
    startTransition(async () => {
      const res = await bookCustomerAppointment(locale, {
        businessCustomerId,
        serviceId,
        staffId: staffId || null,
        startIso: selectedIso,
      });
      if (!res.ok) {
        setError(dashErr(d.errors, res.error, d.genericError));
        return;
      }
      setBookedCount((c) => c + 1);
      onBooked();
      loadSlots(serviceId, staffId, date); // drop the just-booked slot
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-[90] flex max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="inline-flex items-center gap-2 font-display text-lg font-bold text-foreground">
            <CalendarPlus className="size-5 text-gold" />
            {tb.title}
          </h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground"
            aria-label={d.close}
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tb.service} htmlFor="bk-service">
                <SelectMenu
                  id="bk-service"
                  value={serviceId}
                  onChange={setServiceId}
                  disabled={isPending}
                  options={services.map((s) => ({ value: s.id, label: s.name }))}
                />
              </Field>
              <Field label={tb.staff} htmlFor="bk-staff">
                <SelectMenu
                  id="bk-staff"
                  value={staffId}
                  onChange={setStaffId}
                  disabled={isPending}
                  options={[
                    { value: "", label: tb.anyStaff },
                    ...staff.map((s) => ({ value: s.id, label: s.name })),
                  ]}
                />
              </Field>
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium text-foreground">
                {tb.day}
              </p>
              <DatePicker
                value={date}
                today={today}
                locale={locale}
                todayLabel={tb.today}
                prevLabel={tb.prevMonth}
                nextLabel={tb.nextMonth}
                onSelect={setDate}
              />
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium text-foreground">
                {tb.times}
              </p>
              {slotsLoading ? (
                <p className="text-xs text-muted">{tb.loading}</p>
              ) : slots.length === 0 ? (
                <p className="text-xs text-muted">{tb.noSlots}</p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                  {slots.map((s) => (
                    <button
                      key={s.iso}
                      onClick={() => setSelectedIso(s.iso)}
                      className={cn(
                        "rounded-lg border px-2 py-1.5 text-xs tabular-nums transition-colors",
                        selectedIso === s.iso
                          ? "border-gold bg-gold font-semibold text-black"
                          : "border-border text-foreground hover:border-gold/40",
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
          <div className="flex items-center gap-2">
            {bookedCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-success">
                <CheckCircle2 className="size-4" />
                {tb.bookedN.replace("{n}", String(bookedCount))}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isPending}
            >
              {tb.done}
            </Button>
            <Button onClick={book} disabled={isPending || !selectedIso}>
              {isPending ? tb.booking : tb.book}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
