"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { toggleFavorite } from "@/app/[locale]/account/actions";

interface FavoriteButtonProps {
  locale: string;
  businessId: string;
  initialFavorited: boolean;
  isAuthed: boolean;
  /** "button" = standalone pill (public page); "icon" = compact icon. */
  variant?: "button" | "icon";
}

export function FavoriteButton({
  locale,
  businessId,
  initialFavorited,
  isAuthed,
  variant = "button",
}: FavoriteButtonProps) {
  const router = useRouter();
  const t = useDict().account;
  const [fav, setFav] = useState(initialFavorited);
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    if (!isAuthed) {
      router.push(`/${locale}/login`);
      return;
    }
    // Optimistic flip; revert on error.
    const next = !fav;
    setFav(next);
    startTransition(async () => {
      const res = await toggleFavorite(locale, businessId);
      if (!res.ok) setFav(!next);
      else if (typeof res.favorited === "boolean") setFav(res.favorited);
    });
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-label={fav ? t.favRemove : t.favAdd}
        className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-gold hover:text-gold disabled:opacity-50"
      >
        <Heart className={cn("size-4", fav && "fill-gold text-gold")} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
        fav
          ? "border-gold bg-gold/10 text-gold"
          : "border-border text-muted hover:border-gold hover:text-foreground",
      )}
    >
      <Heart className={cn("size-4", fav && "fill-gold text-gold")} />
      {fav ? t.inFavorites : t.favAdd}
    </button>
  );
}
