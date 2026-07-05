"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface SocialAuthButtonsProps {
  locale: string;
  /**
   * Optional deep-link to return to after a successful OAuth login (e.g. a
   * booking page). When omitted, the callback routes by account type.
   */
  next?: string;
  labels: {
    google: string;
    facebook: string;
    or: string;
  };
  /** Which providers to show */
  providers?: Array<"google" | "facebook">;
}

export function SocialAuthButtons({
  locale,
  next,
  labels,
  providers = ["google", "facebook"],
}: SocialAuthButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handle = async (provider: "google" | "facebook") => {
    setLoading(provider);
    setError(null);
    const supabase = createClient();
    const redirectTo = next
      ? `${window.location.origin}/${locale}/auth/callback?next=${encodeURIComponent(next)}`
      : `${window.location.origin}/${locale}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) {
      setError(
        provider === "google"
          ? "Η σύνδεση με Google δεν είναι ακόμα ενεργή."
          : "Η σύνδεση με Facebook δεν είναι ακόμα ενεργή.",
      );
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {providers.includes("google") && (
        <button
          type="button"
          onClick={() => handle("google")}
          disabled={loading !== null}
          className="flex h-11 items-center justify-center gap-2.5 rounded-full border border-border bg-surface text-sm font-medium text-foreground transition-colors hover:border-gold-soft hover:bg-surface-2 disabled:opacity-50"
        >
          <GoogleIcon />
          {loading === "google" ? "..." : labels.google}
        </button>
      )}

      {providers.includes("facebook") && (
        <button
          type="button"
          onClick={() => handle("facebook")}
          disabled={loading !== null}
          className="flex h-11 items-center justify-center gap-2.5 rounded-full border border-border bg-surface text-sm font-medium text-foreground transition-colors hover:border-gold-soft hover:bg-surface-2 disabled:opacity-50"
        >
          <FacebookIcon />
          {loading === "facebook" ? "..." : labels.facebook}
        </button>
      )}

      {error && (
        <p className="text-center text-xs text-danger">{error}</p>
      )}

      <div className="flex items-center gap-3 py-1">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-2">{labels.or}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#1877F2"
        d="M24 12c0-6.63-5.37-12-12-12S0 5.37 0 12c0 5.99 4.39 10.95 10.13 11.85v-8.38H7.08V12h3.05V9.36c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.23 2.69.23v2.95h-1.51c-1.49 0-1.95.93-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.38C19.61 22.95 24 17.99 24 12z"
      />
    </svg>
  );
}
