import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";

/**
 * Branded 404 for anything under /[locale] (bad business slugs, dead links).
 * `not-found` receives no params, so the copy is bilingual (EL first).
 */
export default function NotFound() {
  return (
    <div className="bg-gold-glow relative flex min-h-screen flex-col">
      <div className="bg-hero-grid pointer-events-none absolute inset-0" />

      <header className="relative flex items-center px-6 py-5 md:px-10">
        <Link href="/" className="flex items-center">
          <Logo />
        </Link>
      </header>

      <main className="relative flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <p className="font-display text-[7rem] font-extrabold leading-none tracking-tight text-gold/25 md:text-[10rem]">
          404
        </p>
        <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
          Η σελίδα δεν βρέθηκε
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted md:text-base">
          Ο σύνδεσμος που άνοιξες δεν υπάρχει ή έχει αλλάξει.
          <br />
          <span className="text-muted-2">
            The page you were looking for doesn&apos;t exist or has moved.
          </span>
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-gold px-7 text-base font-semibold text-black shadow-[0_8px_24px_-8px_var(--gold-glow)] transition-[transform,background-color] duration-200 ease-[var(--ease-out)] hover:bg-gold-bright active:scale-[0.97]"
        >
          <ArrowLeft className="size-4" />
          Αρχική · Home
        </Link>
      </main>
    </div>
  );
}
