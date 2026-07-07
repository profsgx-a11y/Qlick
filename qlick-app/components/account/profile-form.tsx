"use client";

import { useState, useTransition } from "react";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IntlPhoneInput } from "@/components/ui/intl-phone-input";
import {
  AddressAutocomplete,
  type SelectedAddress,
} from "@/components/ui/address-autocomplete";
import { useDict } from "@/i18n/provider";
import { PasswordStrength } from "@/components/auth/password-strength";
import { authDict } from "@/lib/i18n-dict";
import { updateProfile, changePassword } from "@/app/[locale]/account/actions";

/** Stored E.164 → display string; empty → erasable "+30 " prefill. */
function initPhone(e164: string): string {
  if (e164) {
    const p = parsePhoneNumberFromString(e164);
    if (p) return p.formatInternational();
  }
  return "+30 ";
}

interface ProfileFormProps {
  locale: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: {
    city: string;
    street: string;
    postcode: string;
    lat: number | null;
    lng: number | null;
  };
}

export function ProfileForm({
  locale,
  email,
  firstName,
  lastName,
  phone,
  address,
}: ProfileFormProps) {
  const t = useDict().account;
  const profileErr = (code: string | undefined) =>
    code === "enter_first_name"
      ? t.enterFirstName
      : code === "enter_last_name"
        ? t.enterLastName
        : code === "enter_mobile"
          ? t.enterMobile
          : code === "invalid_mobile"
            ? t.invalidMobile
            : t.saveFailed;
  const [first, setFirst] = useState(firstName);
  const [last, setLast] = useState(lastName);
  const [phoneVal, setPhoneVal] = useState(() => initPhone(phone));
  const [city, setCity] = useState(address.city);
  const [street, setStreet] = useState(address.street);
  const [postcode, setPostcode] = useState(address.postcode);
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>(
    { lat: address.lat, lng: address.lng },
  );
  const [savedInfo, setSavedInfo] = useState(false);
  const [infoErr, setInfoErr] = useState<string | null>(null);
  const [infoPending, startInfo] = useTransition();

  const [oldPass, setOldPass] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [savedPass, setSavedPass] = useState(false);
  const [passErr, setPassErr] = useState<string | null>(null);
  const [passPending, startPass] = useTransition();
  const strengthLabels = authDict[locale === "en" ? "en" : "el"].passwordStrength;

  const onCitySelect = (a: SelectedAddress) => {
    setCity(a.city || a.label.split(",")[0]);
    if (a.postcode) setPostcode(a.postcode);
    setCoords({ lat: a.lat, lng: a.lng });
    setSavedInfo(false);
  };

  const onAddressSelect = (a: SelectedAddress) => {
    setStreet(a.street || a.label.split(",")[0]);
    if (a.city) setCity(a.city);
    if (a.postcode) setPostcode(a.postcode);
    setCoords({ lat: a.lat, lng: a.lng });
    setSavedInfo(false);
  };

  const saveInfo = () => {
    setInfoErr(null);
    setSavedInfo(false);
    startInfo(async () => {
      const res = await updateProfile(locale, {
        firstName: first,
        lastName: last,
        // A bare country code ("+30") counts as "no phone entered".
        phone: phoneVal.replace(/\D/g, "").length > 4 ? phoneVal.trim() : "",
        city,
        street,
        postcode,
        lat: coords.lat,
        lng: coords.lng,
      });
      if (!res.ok) setInfoErr(profileErr(res.error));
      else setSavedInfo(true);
    });
  };

  const passErrText = (code: string | undefined) =>
    code === "enter_current_password"
      ? t.enterCurrentPassword
      : code === "wrong_current_password"
        ? t.wrongCurrentPassword
        : code === "weak_password"
          ? t.passwordMin
          : t.genericError;

  const savePass = () => {
    setPassErr(null);
    setSavedPass(false);
    if (!oldPass) {
      setPassErr(t.enterCurrentPassword);
      return;
    }
    if (pass.length < 8) {
      setPassErr(t.passwordMin);
      return;
    }
    if (pass !== pass2) {
      setPassErr(t.passwordMismatch);
      return;
    }
    startPass(async () => {
      const res = await changePassword(locale, oldPass, pass);
      if (!res.ok) {
        setPassErr(passErrText(res.error));
        return;
      }
      setSavedPass(true);
      setOldPass("");
      setPass("");
      setPass2("");
    });
  };

  return (
    <div className="space-y-10">
      {/* Personal info */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-foreground">
          {t.profileInfo}
        </h2>

        <Field label={t.email} htmlFor="pf-email">
          <Input id="pf-email" value={email} disabled readOnly />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.firstName} htmlFor="pf-first" required>
            <Input
              id="pf-first"
              value={first}
              autoComplete="given-name"
              onChange={(e) => {
                setFirst(e.target.value);
                setSavedInfo(false);
              }}
              disabled={infoPending}
            />
          </Field>

          <Field label={t.lastName} htmlFor="pf-last" required>
            <Input
              id="pf-last"
              value={last}
              autoComplete="family-name"
              onChange={(e) => {
                setLast(e.target.value);
                setSavedInfo(false);
              }}
              disabled={infoPending}
            />
          </Field>
        </div>

        <Field label={t.mobile} htmlFor="pf-phone" required>
          <IntlPhoneInput
            id="pf-phone"
            value={phoneVal}
            onChange={(v) => {
              setPhoneVal(v);
              setSavedInfo(false);
            }}
            disabled={infoPending}
          />
        </Field>

        <Field label={t.cityOptional} htmlFor="pf-city" hint={t.cityHint}>
          <AddressAutocomplete
            id="pf-city"
            kind="city"
            value={city}
            onChange={(v) => {
              setCity(v);
              setSavedInfo(false);
            }}
            onSelect={onCitySelect}
            disabled={infoPending}
            placeholder={t.cityPlaceholder}
          />
        </Field>

        <Field label={t.addressOptional} htmlFor="pf-street">
          <AddressAutocomplete
            id="pf-street"
            city={city}
            value={street}
            onChange={(v) => {
              setStreet(v);
              setSavedInfo(false);
            }}
            onSelect={onAddressSelect}
            disabled={infoPending}
            placeholder={t.addressPlaceholder}
          />
        </Field>

        <Field label={t.postcodeOptional} htmlFor="pf-postcode">
          <Input
            id="pf-postcode"
            value={postcode}
            onChange={(e) => {
              setPostcode(e.target.value);
              setSavedInfo(false);
            }}
            disabled={infoPending}
          />
        </Field>

        {infoErr && (
          <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {infoErr}
          </p>
        )}
        {savedInfo && (
          <p className="rounded-md border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-foreground">
            {t.saved}
          </p>
        )}

        <Button onClick={saveInfo} disabled={infoPending}>
          {infoPending ? t.saving : t.save}
        </Button>
      </section>

      {/* Password */}
      <section className="space-y-4 border-t border-border pt-8">
        <h2 className="font-display text-lg font-semibold text-foreground">
          {t.changePassword}
        </h2>

        <Field label={t.currentPassword} htmlFor="pf-oldpass">
          <Input
            id="pf-oldpass"
            type="password"
            value={oldPass}
            autoComplete="current-password"
            onChange={(e) => setOldPass(e.target.value)}
            disabled={passPending}
          />
        </Field>

        <div>
          <Field label={t.newPassword} htmlFor="pf-pass" hint={t.passwordHint}>
            <Input
              id="pf-pass"
              type="password"
              value={pass}
              autoComplete="new-password"
              onChange={(e) => setPass(e.target.value)}
              disabled={passPending}
            />
          </Field>
          <PasswordStrength password={pass} labels={strengthLabels} />
        </div>

        <Field label={t.confirmPassword} htmlFor="pf-pass2">
          <Input
            id="pf-pass2"
            type="password"
            value={pass2}
            autoComplete="new-password"
            onChange={(e) => setPass2(e.target.value)}
            disabled={passPending}
          />
        </Field>

        {passErr && (
          <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {passErr}
          </p>
        )}
        {savedPass && (
          <p className="rounded-md border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-foreground">
            {t.passwordChanged}
          </p>
        )}

        <Button variant="secondary" onClick={savePass} disabled={passPending}>
          {passPending ? t.changingPassword : t.changePassword}
        </Button>
      </section>
    </div>
  );
}
