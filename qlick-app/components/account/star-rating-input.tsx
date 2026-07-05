"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { useDict } from "@/i18n/provider";

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  size?: number;
}

/** Star picker supporting half steps (click left half = .5, right half = full). */
export function StarRatingInput({
  value,
  onChange,
  disabled,
  size = 34,
}: StarRatingInputProps) {
  const stars = useDict().account.stars;
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, shown - i)); // 0 | 0.5 | 1
        return (
          <div
            key={i}
            className="relative"
            style={{ width: size, height: size }}
          >
            <Star
              className="absolute inset-0 text-muted/40"
              style={{ width: size, height: size }}
            />
            <div
              className="absolute inset-y-0 left-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star
                className="fill-gold text-gold"
                style={{ width: size, height: size, maxWidth: "none" }}
              />
            </div>
            <button
              type="button"
              disabled={disabled}
              aria-label={`${i + 0.5} ${stars}`}
              onMouseEnter={() => setHover(i + 0.5)}
              onMouseLeave={() => setHover(0)}
              onClick={() => onChange(i + 0.5)}
              className="absolute inset-y-0 left-0 z-10 w-1/2"
            />
            <button
              type="button"
              disabled={disabled}
              aria-label={`${i + 1} ${stars}`}
              onMouseEnter={() => setHover(i + 1)}
              onMouseLeave={() => setHover(0)}
              onClick={() => onChange(i + 1)}
              className="absolute inset-y-0 right-0 z-10 w-1/2"
            />
          </div>
        );
      })}
      <span className="ml-2 text-sm tabular-nums text-muted">
        {shown ? shown.toFixed(1) : "—"}
      </span>
    </div>
  );
}
