import { Star } from "lucide-react";

interface StarRatingDisplayProps {
  rating: number;
  /** Star size in px. */
  size?: number;
  /** Show the numeric value (e.g. "4.5") after the stars. */
  showValue?: boolean;
}

/** Read-only star row with true fractional fill (e.g. 4.5 → 4 full + 1 half). */
export function StarRatingDisplay({
  rating,
  size = 14,
  showValue = false,
}: StarRatingDisplayProps) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, rating - i)); // 0..1 per star
        return (
          <span
            key={i}
            className="relative inline-block"
            style={{ width: size, height: size }}
          >
            <Star
              className="absolute inset-0 text-muted/40"
              style={{ width: size, height: size }}
            />
            <span
              className="absolute inset-y-0 left-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star
                className="fill-gold text-gold"
                style={{ width: size, height: size, maxWidth: "none" }}
              />
            </span>
          </span>
        );
      })}
      {showValue && (
        <span className="ml-1 text-xs font-medium text-gold tabular-nums">
          {rating.toFixed(1)}
        </span>
      )}
    </span>
  );
}
