import Image from "next/image";

type ShotProps = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

// A real product screenshot in a browser chrome, with a soft gold glow.
export function BrowserShot({ src, width, height, alt }: ShotProps) {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-4 -z-10 rounded-[28px] bg-gold/10 blur-2xl"
      />
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-black/50 ring-1 ring-gold/10">
        <div className="flex items-center gap-1.5 border-b border-border bg-surface-2/60 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
        </div>
        <Image
          src={src}
          width={width}
          height={height}
          alt={alt}
          className="w-full"
          sizes="(min-width: 1024px) 40rem, 100vw"
        />
      </div>
    </div>
  );
}

// A real product screenshot in a phone frame.
export function PhoneShot({ src, width, height, alt }: ShotProps) {
  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[48px] bg-gold/10 blur-2xl"
      />
      <div className="overflow-hidden rounded-[1.8rem] border-[6px] border-surface-2 bg-background shadow-2xl shadow-black/60 ring-1 ring-gold/15">
        <Image
          src={src}
          width={width}
          height={height}
          alt={alt}
          className="w-full"
          sizes="300px"
        />
      </div>
    </div>
  );
}
