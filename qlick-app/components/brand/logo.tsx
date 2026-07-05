import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  withWordmark?: boolean;
}

export function Logo({ className, withWordmark = true }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden="true"
        className="grid h-8 w-8 place-items-center rounded-lg bg-gold text-black"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" />
          <rect
            x="14"
            y="3"
            width="7"
            height="7"
            rx="1.5"
            fill="currentColor"
          />
          <rect
            x="3"
            y="14"
            width="7"
            height="7"
            rx="1.5"
            fill="currentColor"
          />
          <path
            d="M14 14h4v2h2v2h-2v3h-4v-7z"
            fill="currentColor"
          />
        </svg>
      </span>
      {withWordmark && (
        <span className="text-xl font-semibold tracking-tight text-foreground">
          Qlick
        </span>
      )}
    </span>
  );
}
