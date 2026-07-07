"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SelectMenu } from "@/components/ui/select-menu";
import { useDict } from "@/i18n/provider";
import {
  AddressAutocomplete,
  type SelectedAddress,
} from "@/components/ui/address-autocomplete";

export interface CategoryOption {
  id: string;
  label: string;
  isParent: boolean;
}

interface BusinessSearchProps {
  locale: string;
  categories: CategoryOption[];
  initial: { cat: string; q: string; lat: string; lng: string };
  /** Page to redirect to on search. Defaults to account search. */
  basePath?: string;
}

export function BusinessSearch({
  locale,
  categories,
  initial,
  basePath,
}: BusinessSearchProps) {
  const router = useRouter();
  const t = useDict().search;
  const [cat, setCat] = useState(initial.cat);
  const [locText, setLocText] = useState(initial.q);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initial.lat && initial.lng
      ? { lat: parseFloat(initial.lat), lng: parseFloat(initial.lng) }
      : null,
  );
  const [err, setErr] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  // Auto-detect location via GPS on first load — only when no location is
  // already set (e.g. from a previous search or saved home address).
  useEffect(() => {
    if (coords || !navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        let label = t.myLocation;
        try {
          const res = await fetch(
            `/api/reverse-geocode?lat=${lat}&lng=${lng}&lang=${locale === "el" ? "el" : "en"}`,
          );
          const data = (await res.json()) as { label?: string };
          if (data.label) label = data.label;
        } catch {
          // keep default label
        }
        setCoords({ lat, lng });
        setLocText(label);
        setGpsLoading(false);
      },
      () => {
        // Silently ignore — user denied or unavailable; they can type manually.
        setGpsLoading(false);
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSelect = (a: SelectedAddress) => {
    if (a.lat != null && a.lng != null) {
      setCoords({ lat: a.lat, lng: a.lng });
      setLocText(a.label.split(",").slice(0, 2).join(",").trim() || a.city);
      setErr(null);
    }
  };

  const search = async () => {
    setErr(null);
    let c = coords;
    // If the user typed a city but didn't pick a suggestion, resolve it to
    // coordinates on the fly so they don't have to click the dropdown.
    if (!c && locText.trim().length >= 3) {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/geocode?q=${encodeURIComponent(locText.trim())}&kind=city`,
        );
        const data = (await res.json()) as {
          results?: { lat: number; lng: number }[];
        };
        const first = data.results?.[0];
        if (first) c = { lat: first.lat, lng: first.lng };
      } catch {
        // fall through to the pick-area message
      }
      setSearching(false);
    }
    if (!c) {
      setErr(t.pickArea);
      return;
    }
    const params = new URLSearchParams();
    if (cat) params.set("cat", cat);
    params.set("lat", String(c.lat));
    params.set("lng", String(c.lng));
    if (locText) params.set("q", locText);
    const target = basePath ?? `/${locale}/account/search`;
    router.push(`${target}?${params.toString()}`);
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label={t.serviceType} htmlFor="bs-cat">
          <SelectMenu
            id="bs-cat"
            value={cat}
            onChange={setCat}
            ariaLabel={t.serviceType}
            options={[
              { value: "", label: t.allTypes },
              ...categories.map((c) => ({
                value: c.id,
                label: c.label,
                indent: !c.isParent,
              })),
            ]}
          />
        </Field>

        <Field label={t.cityOrArea} htmlFor="bs-loc">
          <AddressAutocomplete
            id="bs-loc"
            kind="city"
            value={locText}
            onChange={(v) => {
              setLocText(v);
              setCoords(null);
            }}
            onSelect={onSelect}
            placeholder={gpsLoading ? t.gpsLocating : t.cityPlaceholder}
          />
        </Field>

        <Button onClick={search} disabled={searching} className="sm:h-11">
          <Search className="size-4" />
          {t.searchBtn}
        </Button>
      </div>

      {err && <p className="mt-3 text-sm text-danger">{err}</p>}
    </div>
  );
}
