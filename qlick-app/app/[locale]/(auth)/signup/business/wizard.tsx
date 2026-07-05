"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import Link from "next/link";
import { Check, ArrowLeft, ArrowRight, Mail, Search, MapPin, Loader2 } from "lucide-react";
import type { CountryCode } from "libphonenumber-js";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import { parseOsmOpeningHours } from "@/lib/osm-hours";
import type { PlaceResult } from "@/app/api/place-search/route";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { TimeSelect } from "@/components/ui/time-select";
import { CategoryPicker } from "@/components/dashboard/category-picker";
import {
  AddressAutocomplete,
  type SelectedAddress,
} from "@/components/ui/address-autocomplete";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { cn } from "@/lib/utils";
import {
  isValidEmail,
  isMobilePhone,
  isLandlinePhone,
  normalizePhone,
} from "@/lib/validation";
import {
  createAccountAndBusiness,
  checkEmailAvailable,
  type SignupResult,
} from "./actions";
import { PasswordStrength } from "@/components/auth/password-strength";
import type { AuthDict } from "@/lib/i18n-dict";

interface Category {
  id: string;
  slug: string;
  name: string;
  group: string;
}

interface WizardProps {
  locale: string;
  dict: AuthDict["signup"];
  social: AuthDict["social"];
  days: AuthDict["days"];
  strength: AuthDict["passwordStrength"];
  categories: Category[];
  isAuthenticated: boolean;
  userEmail: string;
}

interface DayHour {
  day_of_week: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
  // Optional second (afternoon) shift for split schedules
  open_time2?: string | null;
  close_time2?: string | null;
}

const defaultHours: DayHour[] = [
  { day_of_week: 0, is_closed: true,  open_time: null,    close_time: null },
  { day_of_week: 1, is_closed: false, open_time: "09:00", close_time: "18:00" },
  { day_of_week: 2, is_closed: false, open_time: "09:00", close_time: "18:00" },
  { day_of_week: 3, is_closed: false, open_time: "09:00", close_time: "18:00" },
  { day_of_week: 4, is_closed: false, open_time: "09:00", close_time: "20:00" },
  { day_of_week: 5, is_closed: false, open_time: "09:00", close_time: "20:00" },
  { day_of_week: 6, is_closed: false, open_time: "10:00", close_time: "16:00" },
];

type StepKey = "place" | "account" | "business" | "hours";

export function SignupWizard({
  locale,
  dict,
  social,
  days,
  strength,
  categories,
  isAuthenticated,
  userEmail,
}: WizardProps) {
  const stepKeys: StepKey[] = useMemo(
    () =>
      isAuthenticated
        ? ["place", "business", "hours"]
        : ["place", "account", "business", "hours"],
    [isAuthenticated],
  );

  const [stepIdx, setStepIdx] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SignupResult | null>(null);

  // Account
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);

  // Business
  const [businessName, setBusinessName] = useState("");
  // Business contact email. When already authenticated the account step (with
  // its email) is skipped, so we collect it here, prefilled with the session email.
  const [businessEmail, setBusinessEmail] = useState(userEmail);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [mobileNational, setMobileNational] = useState("");
  const [mobileCountry, setMobileCountry] = useState<CountryCode>("GR");
  const [mobileTouched, setMobileTouched] = useState(false);
  const [landlineNational, setLandlineNational] = useState("");
  const [landlineCountry, setLandlineCountry] = useState<CountryCode>("GR");
  const [landlineTouched, setLandlineTouched] = useState(false);
  const [addressText, setAddressText] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [postcode, setPostcode] = useState("");
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });

  // Hours
  const [hours, setHours] = useState<DayHour[]>(defaultHours);

  // Place search (free autofill via OpenStreetMap)
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [placePicked, setPlacePicked] = useState(false);

  const currentStep = stepKeys[stepIdx];

  // Debounced OSM business search while on the "place" step.
  useEffect(() => {
    if (currentStep !== "place") return;
    const q = placeQuery.trim();
    if (q.length < 3) {
      setPlaceResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setPlaceLoading(true);
      try {
        const res = await fetch(
          `/api/place-search?q=${encodeURIComponent(q)}`,
          { signal: ctrl.signal },
        );
        const data = (await res.json()) as { results: PlaceResult[] };
        setPlaceResults(data.results ?? []);
      } catch {
        /* aborted / network */
      } finally {
        setPlaceLoading(false);
      }
    }, 450);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [placeQuery, currentStep]);

  const applyPlace = (p: PlaceResult) => {
    if (p.name) setBusinessName(p.name);
    if (p.street) setAddressText(p.street);
    if (p.city) setCity(p.city);
    if (p.postcode) setPostcode(p.postcode);
    if (Number.isFinite(p.lat) && Number.isFinite(p.lng))
      setCoords({ lat: p.lat, lng: p.lng });

    if (p.phone) {
      const parsed = parsePhoneNumberFromString(p.phone, "GR");
      if (parsed?.isValid()) {
        const nat = parsed.nationalNumber;
        const c = (parsed.country ?? "GR") as CountryCode;
        if (parsed.getType() === "FIXED_LINE") {
          setLandlineNational(nat);
          setLandlineCountry(c);
        } else {
          setMobileNational(nat);
          setMobileCountry(c);
        }
      }
    }

    if (p.openingHours) {
      const parsedH = parseOsmOpeningHours(p.openingHours);
      if (parsedH) setHours(parsedH as DayHour[]);
    }

    setPlacePicked(true);
    goNext();
  };

  const emailValid = isValidEmail(email);
  const mobileValid = isMobilePhone(mobileNational, mobileCountry); // required
  const landlineValid =
    !landlineNational.trim() ||
    isLandlinePhone(landlineNational, landlineCountry);

  const canAdvance = (() => {
    if (currentStep === "account")
      return (
        emailValid &&
        password.length >= 8 &&
        !emailTaken &&
        !checkingEmail
      );
    if (currentStep === "business")
      return (
        firstName.trim() &&
        lastName.trim() &&
        businessName.trim() &&
        (!isAuthenticated || isValidEmail(businessEmail)) &&
        categoryIds.length > 0 &&
        mobileValid &&
        landlineValid &&
        addressText.trim() &&
        city.trim() &&
        postcode.trim()
      );
    return true;
  })();

  const goNext = () =>
    setStepIdx((s) => Math.min(stepKeys.length - 1, s + 1));

  // On the account step, verify the email is free before advancing
  const handleNext = async () => {
    if (currentStep === "account") {
      setCheckingEmail(true);
      const res = await checkEmailAvailable(email);
      setCheckingEmail(false);
      setEmailTouched(true);
      if (!res.validFormat || !res.available) {
        setEmailTaken(!res.available && res.validFormat);
        return;
      }
      setEmailTaken(false);
    }
    goNext();
  };

  const groupedCategories = useMemo(() => {
    return categories.reduce<Record<string, Category[]>>((acc, cat) => {
      (acc[cat.group] ??= []).push(cat);
      return acc;
    }, {});
  }, [categories]);

  const updateHour = (idx: number, patch: Partial<DayHour>) =>
    setHours((prev) => prev.map((h, i) => (i === idx ? { ...h, ...patch } : h)));

  const copyToAll = (idx: number) => {
    const source = hours[idx];
    setHours((prev) =>
      prev.map((h) =>
        h.is_closed
          ? h
          : {
              ...h,
              open_time: source.open_time,
              close_time: source.close_time,
              open_time2: source.open_time2 ?? null,
              close_time2: source.close_time2 ?? null,
            },
      ),
    );
  };

  const onAddressSelect = (a: SelectedAddress) => {
    setAddressText(a.street || a.label.split(",")[0]);
    setCity(a.city);
    setPostcode(a.postcode);
    setCoords({ lat: a.lat, lng: a.lng });
  };

  const handleSubmit = () => {
    startTransition(async () => {
      const res = await createAccountAndBusiness(locale, {
        firstName,
        lastName,
        email,
        password,
        businessEmail,
        businessName,
        categoryIds,
        phone: mobileNational.trim()
          ? normalizePhone(mobileNational, mobileCountry) ?? ""
          : "",
        landline: landlineNational.trim()
          ? normalizePhone(landlineNational, landlineCountry) ?? ""
          : "",
        city,
        area,
        address: addressText,
        postcode,
        lat: coords.lat,
        lng: coords.lng,
        hours,
      });
      setResult(res);
    });
  };

  // ── Email confirmation pending ────────────────────────────────
  if (result?.needsEmailConfirmation) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-gold/15 text-gold">
          <Mail className="size-7" />
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground">
          Έλεγξε το email σου
        </h2>
        <p className="mt-2 text-sm text-muted">
          Σου στείλαμε σύνδεσμο επιβεβαίωσης στο <strong>{email}</strong>.
          <br />
          Κάνε κλικ για να ενεργοποιήσεις τον λογαριασμό σου.
        </p>
      </div>
    );
  }

  const stepLabels: Record<StepKey, string> = {
    place: locale === "el" ? "Εύρεση" : "Find",
    account: dict.steps.account,
    business: dict.steps.business,
    hours: dict.steps.hours,
  };

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {stepKeys.map((key, i) => (
          <div key={key} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors",
                i < stepIdx
                  ? "bg-gold text-black"
                  : i === stepIdx
                  ? "border-2 border-gold bg-gold/15 text-gold"
                  : "border border-border bg-surface text-muted-2",
              )}
            >
              {i < stepIdx ? <Check className="size-3.5" /> : i + 1}
            </div>
            <span
              className={cn(
                "hidden text-xs font-medium tracking-tight sm:inline",
                i <= stepIdx ? "text-foreground" : "text-muted-2",
              )}
            >
              {stepLabels[key]}
            </span>
            {i < stepKeys.length - 1 && (
              <div
                className={cn(
                  "ml-1 h-px flex-1",
                  i < stepIdx ? "bg-gold" : "bg-border",
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* ── Step: place (free autofill via OpenStreetMap) ── */}
      {currentStep === "place" && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">
              {locale === "el"
                ? "Βρες την επιχείρησή σου"
                : "Find your business"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {locale === "el"
                ? "Ψάξε με το όνομα & την πόλη για να συμπληρωθούν αυτόματα τα στοιχεία (από OpenStreetMap). Ό,τι λείπει, το προσθέτεις μετά."
                : "Search by name & city to autofill your details (from OpenStreetMap). Add anything missing afterwards."}
            </p>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
            <Input
              value={placeQuery}
              onChange={(e) => setPlaceQuery(e.target.value)}
              placeholder={
                locale === "el"
                  ? "π.χ. Barber House Κομοτηνή"
                  : "e.g. Barber House Athens"
              }
              className="pl-9"
              disabled={isPending}
            />
            {placeLoading && (
              <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-2" />
            )}
          </div>

          {placeQuery.trim().length >= 3 &&
            !placeLoading &&
            placeResults.length === 0 && (
              <p className="text-sm text-muted">
                {locale === "el"
                  ? "Δεν βρέθηκε. Συνέχισε χειροκίνητα με «Επόμενο»."
                  : "Not found. Continue manually with “Next”."}
              </p>
            )}

          {placeResults.length > 0 && (
            <div className="space-y-2">
              {placeResults.map((p, i) => (
                <button
                  key={`${p.lat}-${p.lng}-${i}`}
                  type="button"
                  onClick={() => applyPlace(p)}
                  className="flex w-full items-start gap-3 rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:border-gold hover:bg-surface-2"
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-gold" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {p.name}
                    </p>
                    <p className="truncate text-xs text-muted">{p.label}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {p.phone && (
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">
                          ☎ {p.phone}
                        </span>
                      )}
                      {p.openingHours && (
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">
                          {locale === "el" ? "ωράριο ✓" : "hours ✓"}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {placePicked && (
            <p className="rounded-md border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-foreground">
              {locale === "el"
                ? "Συμπληρώθηκαν τα στοιχεία — έλεγξέ τα στα επόμενα βήματα."
                : "Details filled in — review them in the next steps."}
            </p>
          )}

          <p className="text-xs text-muted-2">
            {locale === "el"
              ? "Δεν θες αναζήτηση; Πάτα «Επόμενο» και συμπλήρωσε χειροκίνητα."
              : "Prefer manual entry? Just press “Next”."}
          </p>
        </div>
      )}

      {/* ── Step: account ── */}
      {currentStep === "account" && (
        <div className="flex flex-col gap-4">
          <SocialAuthButtons
            locale={locale}
            next={`/${locale}/signup/business`}
            labels={{
              google: social.googleSignup,
              facebook: social.facebookSignup,
              or: social.or,
            }}
          />

          <h2 className="font-display text-lg font-bold text-foreground">
            {dict.account.title}
          </h2>

          <Field
            label={dict.account.email}
            htmlFor="email"
            required
            error={
              emailTouched && email.trim() && !emailValid
                ? dict.account.emailInvalid
                : emailTaken
                ? dict.account.emailTaken
                : undefined
            }
          >
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailTaken(false);
              }}
              onBlur={() => setEmailTouched(true)}
              autoComplete="email"
              disabled={isPending}
              className={
                (emailTouched && email.trim() && !emailValid) || emailTaken
                  ? "border-danger"
                  : undefined
              }
            />
          </Field>

          <div>
            <Field
              label={dict.account.password}
              htmlFor="password"
              hint={password ? undefined : dict.account.passwordHint}
              required
            >
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                disabled={isPending}
              />
            </Field>
            <PasswordStrength password={password} labels={strength} />
          </div>
        </div>
      )}

      {/* ── Step: business ── */}
      {currentStep === "business" && (
        <div className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-bold text-foreground">
            {dict.business.title}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={dict.account.firstName + (locale === "el" ? " (δικό σου)" : " (yours)")}
              htmlFor="firstName"
              hint={
                locale === "el"
                  ? "Το προσωπικό σου όνομα — και για ραντεβού ως πελάτης."
                  : "Your personal name — also used when you book as a customer."
              }
              required
            >
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                disabled={isPending}
              />
            </Field>

            <Field
              label={dict.account.lastName + (locale === "el" ? " (δικό σου)" : " (yours)")}
              htmlFor="lastName"
              required
            >
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                disabled={isPending}
              />
            </Field>
          </div>

          <Field
            label={dict.business.name + (locale === "el" ? " (brand)" : " (brand)")}
            htmlFor="businessName"
            hint={dict.business.nameHint}
            required
          >
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              disabled={isPending}
            />
          </Field>

          {isAuthenticated && (
            <Field
              label={locale === "el" ? "Email καταστήματος" : "Business email"}
              htmlFor="businessEmail"
              required
              hint={
                locale === "el"
                  ? "Email επικοινωνίας — εμφανίζεται στη δημόσια σελίδα."
                  : "Contact email — shown on your public page."
              }
            >
              <Input
                id="businessEmail"
                type="email"
                value={businessEmail}
                onChange={(e) => setBusinessEmail(e.target.value)}
                autoComplete="email"
                disabled={isPending}
              />
            </Field>
          )}

          <Field
            label={dict.business.category}
            htmlFor="categoryIds"
            hint={
              locale === "el"
                ? "Διάλεξε ένα ή περισσότερα — θα εμφανίζεσαι στην αναζήτηση για καθένα."
                : "Pick one or more — you'll show up in search for each."
            }
            required
          >
            <CategoryPicker
              groups={Object.entries(groupedCategories).map(
                ([label, items]) => ({
                  label,
                  options: items.map((c) => ({ id: c.id, name: c.name })),
                }),
              )}
              value={categoryIds}
              onChange={setCategoryIds}
              disabled={isPending}
            />
          </Field>

          <Field
            label={dict.business.mobile}
            htmlFor="mobile"
            required
            error={
              mobileTouched && mobileNational.trim() && !mobileValid
                ? dict.business.mobileInvalid
                : undefined
            }
          >
            <div onBlur={() => setMobileTouched(true)}>
              <PhoneInput
                id="mobile"
                value={mobileNational}
                country={mobileCountry}
                onChange={(national, c) => {
                  setMobileNational(national);
                  setMobileCountry(c);
                }}
                disabled={isPending}
                invalid={
                  mobileTouched && !!mobileNational.trim() && !mobileValid
                }
              />
            </div>
          </Field>

          <Field
            label={`${dict.business.landline} ${dict.business.phoneOptional}`}
            htmlFor="landline"
            error={
              landlineTouched && landlineNational.trim() && !landlineValid
                ? dict.business.landlineInvalid
                : undefined
            }
          >
            <div onBlur={() => setLandlineTouched(true)}>
              <PhoneInput
                id="landline"
                placeholder="21 1234 5678"
                value={landlineNational}
                country={landlineCountry}
                onChange={(national, c) => {
                  setLandlineNational(national);
                  setLandlineCountry(c);
                }}
                disabled={isPending}
                invalid={
                  landlineTouched &&
                  !!landlineNational.trim() &&
                  !landlineValid
                }
              />
            </div>
          </Field>

          <Field
            label={dict.business.address}
            htmlFor="address"
            hint={dict.business.addressHint}
            required
          >
            <AddressAutocomplete
              id="address"
              value={addressText}
              onChange={setAddressText}
              onSelect={onAddressSelect}
              disabled={isPending}
              placeholder={dict.business.addressPlaceholder}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={dict.business.city} htmlFor="city" required>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={isPending}
              />
            </Field>
            <Field label={dict.business.postcode} htmlFor="postcode" required>
              <Input
                id="postcode"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                disabled={isPending}
              />
            </Field>
          </div>

          <Field
            label={dict.business.area + (locale === "el" ? " (προαιρετικό)" : " (optional)")}
            htmlFor="area"
            hint={
              locale === "el"
                ? "Η γειτονιά/περιοχή σου (π.χ. Κουκάκι)."
                : "Your neighborhood/area (e.g. Koukaki)."
            }
          >
            <Input
              id="area"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              disabled={isPending}
            />
          </Field>
        </div>
      )}

      {/* ── Step: hours ── */}
      {currentStep === "hours" && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">
              {dict.hours.title}
            </h2>
            <p className="mt-1 text-sm text-muted">{dict.hours.subtitle}</p>
          </div>

          <div className="space-y-2">
            {hours.map((h, idx) => (
              <div
                key={h.day_of_week}
                className="rounded-lg border border-border bg-surface px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <Label className="w-[88px] shrink-0 text-xs uppercase tracking-wider">
                    {days[h.day_of_week]}
                  </Label>
                  {h.is_closed ? (
                    <span className="flex-1 text-xs italic text-muted">
                      {dict.hours.closed}
                    </span>
                  ) : (
                    <div className="order-last flex w-full flex-wrap items-center justify-center gap-2 sm:order-none sm:w-auto sm:flex-1 sm:flex-nowrap sm:justify-start">
                      <TimeSelect
                        value={h.open_time ?? "09:00"}
                        onChange={(v) => updateHour(idx, { open_time: v })}
                        className="w-[88px] shrink-0 sm:w-28"
                        triggerClassName="h-9 px-2"
                        disabled={isPending}
                      />
                      <span className="text-muted-2">—</span>
                      <TimeSelect
                        value={h.close_time ?? "18:00"}
                        onChange={(v) => updateHour(idx, { close_time: v })}
                        className="w-[88px] shrink-0 sm:w-28"
                        triggerClassName="h-9 px-2"
                        disabled={isPending}
                      />
                      <button
                        type="button"
                        onClick={() => copyToAll(idx)}
                        className="ml-1 shrink-0 text-[10px] text-gold hover:underline"
                      >
                        {dict.hours.copyToAll}
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => updateHour(idx, { is_closed: !h.is_closed })}
                    className="ml-auto shrink-0 text-xs font-medium text-muted hover:text-foreground"
                    disabled={isPending}
                  >
                    {h.is_closed ? dict.hours.open : dict.hours.closed}
                  </button>
                </div>

                {/* Second (afternoon) shift */}
                {!h.is_closed && (
                  <div className="mt-2 sm:pl-[100px]">
                    {h.open_time2 != null ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-12 shrink-0 text-[10px] uppercase text-muted-2">
                          {dict.hours.afternoon}
                        </span>
                        <TimeSelect
                          value={h.open_time2 ?? "18:00"}
                          onChange={(v) => updateHour(idx, { open_time2: v })}
                          className="w-[88px] shrink-0 sm:w-28"
                          triggerClassName="h-9 px-2"
                          disabled={isPending}
                        />
                        <span className="text-muted-2">—</span>
                        <TimeSelect
                          value={h.close_time2 ?? "21:00"}
                          onChange={(v) => updateHour(idx, { close_time2: v })}
                          className="w-[88px] shrink-0 sm:w-28"
                          triggerClassName="h-9 px-2"
                          disabled={isPending}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateHour(idx, {
                              open_time2: null,
                              close_time2: null,
                            })
                          }
                          className="basis-full text-center text-[10px] text-danger hover:underline sm:basis-auto sm:text-left"
                          disabled={isPending}
                        >
                          {dict.hours.remove}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          updateHour(idx, {
                            open_time2: "18:00",
                            close_time2: "21:00",
                          })
                        }
                        className="text-[11px] font-medium text-gold hover:underline"
                        disabled={isPending}
                      >
                        {dict.hours.addAfternoon}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {result?.error && (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {result.error}
        </p>
      )}

      {/* Navigation */}
      <div className="mt-2 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setStepIdx((s) => Math.max(0, s - 1))}
          disabled={stepIdx === 0 || isPending}
        >
          <ArrowLeft />
          {dict.back}
        </Button>

        {stepIdx < stepKeys.length - 1 ? (
          <Button
            type="button"
            onClick={handleNext}
            disabled={!canAdvance || isPending || checkingEmail}
          >
            {checkingEmail ? "Έλεγχος..." : dict.next}
            {!checkingEmail && <ArrowRight />}
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? dict.submitting : dict.submit}
          </Button>
        )}
      </div>

      {!isAuthenticated && (
        <p className="text-center text-sm text-muted">
          {dict.haveAccount}{" "}
          <Link
            href={`/${locale}/login`}
            className="font-medium text-gold hover:underline"
          >
            {dict.logIn}
          </Link>
        </p>
      )}
    </div>
  );
}
