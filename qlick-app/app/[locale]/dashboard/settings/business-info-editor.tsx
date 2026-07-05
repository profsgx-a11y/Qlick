"use client";

import { useState, useTransition, useRef } from "react";
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import { CheckCircle, ImagePlus, Loader2, MapPin, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  AddressAutocomplete,
  type SelectedAddress,
} from "@/components/ui/address-autocomplete";
import { createClient } from "@/lib/supabase/client";
import { useDict } from "@/i18n/provider";
import { dashErr } from "@/lib/dash-error";
import { isMobilePhone, isLandlinePhone, isValidEmail } from "@/lib/validation";
import { saveBusinessInfo } from "./actions";

interface Props {
  locale: string;
  slug: string;
  status: string;
  businessId: string;
  initial: {
    name: string;
    ownerFirstName: string;
    ownerLastName: string;
    email: string;
    mobile: string | null;
    landline: string | null;
    street: string;
    city: string;
    area: string;
    postcode: string;
    lat: number | null;
    lng: number | null;
    logoUrl: string | null;
    coverUrl: string | null;
  };
}

export function BusinessInfoEditor({
  locale,
  slug,
  status,
  businessId,
  initial,
}: Props) {
  const dd = useDict().dashboard;
  const t = dd.settings.bizInfo;
  const [name, setName] = useState(initial.name);
  const [ownerFirst, setOwnerFirst] = useState(initial.ownerFirstName);
  const [ownerLast, setOwnerLast] = useState(initial.ownerLastName);
  const [email, setEmail] = useState(initial.email);
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl);
  const [coverUrl, setCoverUrl] = useState<string | null>(initial.coverUrl);
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);

  const mob = initial.mobile ? parsePhoneNumberFromString(initial.mobile) : null;
  const [mobileCountry, setMobileCountry] = useState<CountryCode>(
    (mob?.country as CountryCode) ?? "GR",
  );
  const [mobileNational, setMobileNational] = useState(
    mob ? mob.formatNational() : "",
  );
  const [mobileTouched, setMobileTouched] = useState(false);

  const land = initial.landline
    ? parsePhoneNumberFromString(initial.landline)
    : null;
  const [landlineCountry, setLandlineCountry] = useState<CountryCode>(
    (land?.country as CountryCode) ?? "GR",
  );
  const [landlineNational, setLandlineNational] = useState(
    land ? land.formatNational() : "",
  );
  const [landlineTouched, setLandlineTouched] = useState(false);
  const [street, setStreet] = useState(initial.street);
  const [city, setCity] = useState(initial.city);
  const [area, setArea] = useState(initial.area);
  const [postcode, setPostcode] = useState(initial.postcode);
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>(
    { lat: initial.lat, lng: initial.lng },
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsOk, setGpsOk] = useState(false);
  const gpsOkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSetGps = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    setGpsOk(false);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        // Also reverse-geocode so city field stays in sync with the new coords.
        try {
          const res = await fetch(
            `/api/reverse-geocode?lat=${lat}&lng=${lng}&lang=${locale === "el" ? "el" : "en"}`,
          );
          const data = (await res.json()) as { label?: string };
          if (data.label) {
            // Nominatim returns "suburb, city" — take the last part as city.
            const parts = data.label.split(",").map((s: string) => s.trim());
            const detectedCity = parts[parts.length - 1] || parts[0];
            if (detectedCity) setCity(detectedCity);
          }
        } catch {
          // keep existing city if reverse-geocode fails
        }
        setGpsLoading(false);
        setGpsOk(true);
        dirty();
        if (gpsOkTimer.current) clearTimeout(gpsOkTimer.current);
        gpsOkTimer.current = setTimeout(() => setGpsOk(false), 4000);
      },
      () => {
        setGpsLoading(false);
        setError(t.gpsFailed);
      },
      { timeout: 10000, maximumAge: 0 },
    );
  };

  const mobileValid =
    !mobileNational.trim() || isMobilePhone(mobileNational, mobileCountry);
  const landlineValid =
    !landlineNational.trim() ||
    isLandlinePhone(landlineNational, landlineCountry);

  const dirty = () => setSaved(false);

  const onCitySelect = (a: SelectedAddress) => {
    setCity(a.city || a.label.split(",")[0]);
    if (a.postcode) setPostcode(a.postcode);
    setCoords({ lat: a.lat, lng: a.lng });
    dirty();
  };

  const onSelect = (a: SelectedAddress) => {
    setStreet(a.street || a.label.split(",")[0]);
    if (a.city) setCity(a.city);
    if (a.postcode) setPostcode(a.postcode);
    setCoords({ lat: a.lat, lng: a.lng });
    dirty();
  };

  const onPickImage =
    (kind: "logo" | "cover") =>
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
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
      setUploading(kind);
      try {
        const supabase = createClient();
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${businessId}/${kind}/${crypto.randomUUID()}.${ext}`;
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
        if (kind === "logo") setLogoUrl(data.publicUrl);
        else setCoverUrl(data.publicUrl);
        dirty();
      } finally {
        setUploading(null);
      }
    };

  const save = () => {
    setError(null);
    setSaved(false);
    if (!name.trim()) {
      setError(t.errName);
      return;
    }
    if (!ownerFirst.trim()) {
      setError(t.errFirstName);
      return;
    }
    if (!ownerLast.trim()) {
      setError(t.errLastName);
      return;
    }
    if (!email.trim()) {
      setError(t.errEmail);
      return;
    }
    if (!isValidEmail(email)) {
      setError(t.errEmailInvalid);
      return;
    }
    if (!mobileNational.trim()) {
      setMobileTouched(true);
      setError(t.errMobile);
      return;
    }
    if (!mobileValid) {
      setError(t.mobileInvalid);
      return;
    }
    if (landlineNational.trim() && !landlineValid) {
      setError(t.errLandline);
      return;
    }
    if (!city.trim()) {
      setError(t.errCity);
      return;
    }
    if (!street.trim()) {
      setError(t.errAddress);
      return;
    }
    if (!postcode.trim()) {
      setError(t.errPostcode);
      return;
    }
    startTransition(async () => {
      const res = await saveBusinessInfo(locale, {
        name,
        mobileNational,
        mobileCountry,
        landlineNational,
        landlineCountry,
        street,
        city,
        area,
        postcode,
        lat: coords.lat,
        lng: coords.lng,
        logoUrl,
        coverUrl,
        email,
        ownerFirstName: ownerFirst,
        ownerLastName: ownerLast,
      });
      if (!res.ok) {
        setError(dashErr(dd.errors, res.error, t.errGeneric));
        return;
      }
      setSaved(true);
    });
  };

  return (
    <Card className="max-w-2xl">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">
        {t.title}
      </h3>

      <div className="mt-4 grid gap-4">
        <div>
          <Label>{t.logo}</Label>
          <div className="mt-1.5 flex items-center gap-3">
            <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-surface-2">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={t.logoAlt}
                  className="size-full object-cover"
                />
              ) : (
                <ImagePlus className="size-6 text-muted-2" />
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-[transform,background-color,border-color,color] duration-200 ease-[var(--ease-out)] hover:border-gold hover:bg-gold/5 hover:text-gold active:scale-95">
                {uploading === "logo" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ImagePlus className="size-4" />
                )}
                {logoUrl ? t.change : t.upload}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={!!uploading || isPending}
                  onChange={onPickImage("logo")}
                />
              </label>
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setLogoUrl(null);
                    dirty();
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-danger"
                >
                  <X className="size-3.5" /> {dd.settings.remove}
                </button>
              )}
            </div>
          </div>
          <p className="mt-1.5 text-xs text-muted-2">{t.logoHint}</p>
        </div>

        <div>
          <Label>{t.cover}</Label>
          <div className="mt-1.5">
            <div className="relative aspect-[16/6] w-full overflow-hidden rounded-xl border border-border bg-surface-2">
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt={t.coverAlt}
                  className="size-full object-cover"
                />
              ) : (
                <div className="grid size-full place-items-center">
                  <ImagePlus className="size-6 text-muted-2" />
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-[transform,background-color,border-color,color] duration-200 ease-[var(--ease-out)] hover:border-gold hover:bg-gold/5 hover:text-gold active:scale-95">
                {uploading === "cover" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ImagePlus className="size-4" />
                )}
                {coverUrl ? t.change : t.upload}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={!!uploading || isPending}
                  onChange={onPickImage("cover")}
                />
              </label>
              {coverUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setCoverUrl(null);
                    dirty();
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-danger"
                >
                  <X className="size-3.5" /> {dd.settings.remove}
                </button>
              )}
            </div>
          </div>
          <p className="mt-1.5 text-xs text-muted-2">{t.coverHint}</p>
        </div>

        <Field label={t.nameBrand} htmlFor="biz-name" required>
          <Input
            id="biz-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              dirty();
            }}
            disabled={isPending}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t.ownerFirst}
            htmlFor="biz-owner-first"
            required
            hint={t.ownerFirstHint}
          >
            <Input
              id="biz-owner-first"
              value={ownerFirst}
              autoComplete="given-name"
              onChange={(e) => {
                setOwnerFirst(e.target.value);
                dirty();
              }}
              disabled={isPending}
            />
          </Field>

          <Field label={t.ownerLast} htmlFor="biz-owner-last" required>
            <Input
              id="biz-owner-last"
              value={ownerLast}
              autoComplete="family-name"
              onChange={(e) => {
                setOwnerLast(e.target.value);
                dirty();
              }}
              disabled={isPending}
            />
          </Field>
        </div>

        <Field
          label={t.email}
          htmlFor="biz-email"
          required
          hint={t.emailHint}
        >
          <Input
            id="biz-email"
            type="email"
            value={email}
            autoComplete="email"
            onChange={(e) => {
              setEmail(e.target.value);
              dirty();
            }}
            disabled={isPending}
          />
        </Field>

        <Field
          label={t.mobile}
          htmlFor="biz-mobile"
          required
          error={
            mobileTouched && mobileNational.trim() && !mobileValid
              ? t.mobileInvalid
              : undefined
          }
        >
          <div onBlur={() => setMobileTouched(true)}>
            <PhoneInput
              id="biz-mobile"
              value={mobileNational}
              country={mobileCountry}
              onChange={(national, c) => {
                setMobileNational(national);
                setMobileCountry(c);
                dirty();
              }}
              disabled={isPending}
              invalid={mobileTouched && !!mobileNational.trim() && !mobileValid}
            />
          </div>
        </Field>

        <Field
          label={t.landline}
          htmlFor="biz-landline"
          error={
            landlineTouched && landlineNational.trim() && !landlineValid
              ? t.landlineInvalid
              : undefined
          }
        >
          <div onBlur={() => setLandlineTouched(true)}>
            <PhoneInput
              id="biz-landline"
              placeholder="21 1234 5678"
              value={landlineNational}
              country={landlineCountry}
              onChange={(national, c) => {
                setLandlineNational(national);
                setLandlineCountry(c);
                dirty();
              }}
              disabled={isPending}
              invalid={
                landlineTouched && !!landlineNational.trim() && !landlineValid
              }
            />
          </div>
        </Field>

        <Field
          label={t.city}
          htmlFor="biz-city"
          required
          hint={t.cityHint}
        >
          <AddressAutocomplete
            id="biz-city"
            kind="city"
            value={city}
            onChange={(v) => {
              setCity(v);
              dirty();
            }}
            onSelect={onCitySelect}
            disabled={isPending}
            placeholder={t.cityPlaceholder}
          />
        </Field>

        <Field
          label={t.area}
          htmlFor="biz-area"
          hint={t.areaHint}
        >
          <Input
            id="biz-area"
            value={area}
            onChange={(e) => {
              setArea(e.target.value);
              dirty();
            }}
            disabled={isPending}
          />
        </Field>

        <Field
          label={t.address}
          htmlFor="biz-address"
          required
          hint={t.addressHint}
        >
          <AddressAutocomplete
            id="biz-address"
            city={city}
            value={street}
            onChange={(v) => {
              setStreet(v);
              dirty();
            }}
            onSelect={onSelect}
            disabled={isPending}
            placeholder={t.addressPlaceholder}
          />
        </Field>

        {/* GPS location pin — lets the owner stand at their shop and set exact coords */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSetGps}
              disabled={gpsLoading || isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-[transform,background-color,border-color,color] duration-200 ease-[var(--ease-out)] hover:border-gold hover:bg-gold/5 hover:text-gold active:scale-95 disabled:opacity-50"
            >
              {gpsLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MapPin className="size-4" />
              )}
              {gpsLoading ? t.gpsLocating : t.gpsSet}
            </button>
            {gpsOk && (
              <span className="inline-flex items-center gap-1 text-sm text-success">
                <CheckCircle className="size-4" />
                {t.gpsDone}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-2">{t.gpsHint}</p>
        </div>

        <Field label={t.postcode} htmlFor="biz-postcode" required>
          <Input
            id="biz-postcode"
            value={postcode}
            onChange={(e) => {
              setPostcode(e.target.value);
              dirty();
            }}
            disabled={isPending}
          />
        </Field>

        {/* Read-only context */}
        <dl className="divide-y divide-border rounded-lg border border-border text-sm">
          <div className="flex items-center justify-between px-3 py-2.5">
            <dt className="text-muted">{t.link}</dt>
            <dd className="font-medium text-gold">/b/{slug}</dd>
          </div>
          <div className="flex items-center justify-between px-3 py-2.5">
            <dt className="text-muted">{t.statusLabel}</dt>
            <dd className="font-medium text-foreground">
              {status === "active" ? dd.active : dd.draft}
            </dd>
          </div>
        </dl>

        {error && (
          <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={isPending}>
            {isPending ? dd.saving : t.saveInfo}
          </Button>
          {saved && <span className="text-sm text-success">{dd.saved} ✓</span>}
        </div>
      </div>
    </Card>
  );
}
