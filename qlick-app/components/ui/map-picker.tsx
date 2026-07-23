"use client";

import "leaflet/dist/leaflet.css";
import * as L from "leaflet";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, MapPin, X } from "lucide-react";

export interface PickedLocation {
  lat: number;
  lng: number;
  street: string;
  city: string;
  postcode: string;
}

interface MapPickerProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (loc: PickedLocation) => void;
  /** Where to center first: saved coords, else geocode this text, else Athens. */
  initial: { lat: number | null; lng: number | null; query: string };
  locale: string;
  labels: {
    title: string;
    hint: string;
    confirm: string;
    cancel: string;
    searching: string;
  };
}

const ATHENS: [number, number] = [37.9838, 23.7275];

// Gold teardrop pin as a divIcon — avoids Leaflet's broken default image assets.
const PIN_HTML =
  '<svg width="34" height="44" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">' +
  '<path d="M12 0C5.4 0 0 5.4 0 12c0 8.5 12 20 12 20s12-11.5 12-20C24 5.4 18.6 0 12 0z" ' +
  'fill="#d9a94a" stroke="#0c0c0e" stroke-width="1.5"/>' +
  '<circle cx="12" cy="12" r="4.5" fill="#0c0c0e"/></svg>';

export function MapPicker({
  open,
  onClose,
  onConfirm,
  initial,
  locale,
  labels,
}: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [picked, setPicked] = useState<PickedLocation | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !containerRef.current) return;
    let cancelled = false;
    let map: L.Map | null = null;

    const resolve = async (lat: number, lng: number) => {
      setLoading(true);
      setPicked((p) => ({
        lat,
        lng,
        street: p?.street ?? "",
        city: p?.city ?? "",
        postcode: p?.postcode ?? "",
      }));
      try {
        const res = await fetch(
          `/api/reverse-geocode?lat=${lat}&lng=${lng}&lang=${locale === "el" ? "el" : "en"}`,
        );
        const d = (await res.json()) as {
          street?: string;
          city?: string;
          postcode?: string;
        };
        if (cancelled) return;
        setPicked({
          lat,
          lng,
          street: d.street ?? "",
          city: d.city ?? "",
          postcode: d.postcode ?? "",
        });
      } catch {
        if (!cancelled) setPicked({ lat, lng, street: "", city: "", postcode: "" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    (async () => {
      let center: [number, number] = ATHENS;
      let zoom = 12;
      if (initial.lat != null && initial.lng != null) {
        center = [initial.lat, initial.lng];
        zoom = 17;
      } else if (initial.query.trim().length >= 3) {
        try {
          const r = await fetch(
            `/api/geocode?${new URLSearchParams({ q: initial.query.trim() })}`,
          );
          const gd = (await r.json()) as {
            results?: { lat: number | null; lng: number | null }[];
          };
          const top = gd.results?.[0];
          if (top && top.lat != null && top.lng != null) {
            center = [top.lat, top.lng];
            zoom = 16;
          }
        } catch {
          /* ignore — fall back to Athens */
        }
      }
      if (cancelled || !containerRef.current) return;

      map = L.map(containerRef.current, { center, zoom });
      mapRef.current = map;
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 20,
        },
      ).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: PIN_HTML,
        iconSize: [34, 44],
        iconAnchor: [17, 44],
      });
      const marker = L.marker(center, { draggable: true, icon }).addTo(map);
      marker.on("dragend", () => {
        const ll = marker.getLatLng();
        void resolve(ll.lat, ll.lng);
      });
      map.on("click", (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        void resolve(e.latlng.lat, e.latlng.lng);
      });

      if (initial.lat != null && initial.lng != null) {
        void resolve(center[0], center[1]);
      } else {
        setPicked({ lat: center[0], lng: center[1], street: "", city: "", postcode: "" });
      }
      // The modal animates in — recalc tiles once it has its final size.
      setTimeout(() => map?.invalidateSize(), 80);
    })();

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, [open, initial.lat, initial.lng, initial.query, locale]);

  if (!open) return null;

  const preview = picked
    ? [picked.street, picked.city, picked.postcode].filter(Boolean).join(", ") ||
      `${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)}`
    : "";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold text-foreground">
              {labels.title}
            </h3>
            <p className="mt-0.5 text-xs text-muted">{labels.hint}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={labels.cancel}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <div ref={containerRef} className="h-[380px] w-full bg-surface-2" />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
          <p className="min-w-0 flex-1 text-sm">
            {loading ? (
              <span className="inline-flex items-center gap-1.5 text-muted">
                <Loader2 className="size-4 animate-spin" />
                {labels.searching}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <MapPin className="size-4 shrink-0 text-gold" />
                <span className="truncate">{preview}</span>
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
            >
              {labels.cancel}
            </button>
            <button
              type="button"
              disabled={!picked}
              onClick={() => {
                if (picked) {
                  onConfirm(picked);
                  onClose();
                }
              }}
              className="rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-black transition-colors hover:bg-gold-bright disabled:opacity-50"
            >
              {labels.confirm}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
