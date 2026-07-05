import { Calendar, RefreshCcw, X, Check, ArrowDown } from "lucide-react";

interface QrPreviewProps {
  brandName?: string;
  est?: string;
  qrSvg: string;
  hours?: Array<{ day: string; time: string; closed?: boolean }>;
}

export const defaultHours = [
  { day: "ΔΕΥΤΕΡΑ", time: "09:00 - 18:00" },
  { day: "ΤΡΙΤΗ", time: "09:00 - 18:00" },
  { day: "ΤΕΤΑΡΤΗ", time: "09:00 - 18:00" },
  { day: "ΠΕΜΠΤΗ", time: "09:00 - 20:00" },
  { day: "ΠΑΡΑΣΚΕΥΗ", time: "09:00 - 20:00" },
  { day: "ΣΑΒΒΑΤΟ", time: "10:00 - 16:00" },
  { day: "ΚΥΡΙΑΚΗ", time: "ΚΛΕΙΣΤΑ", closed: true },
];

export function QrPreview({
  brandName = "BARBER HOUSE",
  est = "EST. 2020",
  qrSvg,
  hours = defaultHours,
}: QrPreviewProps) {
  return (
    <div className="relative w-full max-w-[360px]">
      {/* Soft gold glow */}
      <div className="absolute -inset-8 -z-10 rounded-[40px] bg-gold/15 blur-3xl" />

      {/* Poster (white) */}
      <div className="relative overflow-hidden rounded-3xl bg-white p-4 shadow-2xl shadow-black/60 ring-1 ring-black/10">
        {/* Double gold border */}
        <div className="relative rounded-2xl border-[1.5px] border-[#c9a35a]">
          <div className="overflow-hidden rounded-xl p-5 text-black">
            {/* ── Brand block ── */}
            <div className="flex flex-col items-center">
              <Scissors />
              <div className="font-display mt-1 text-[20px] font-extrabold leading-none tracking-[0.05em] text-black">
                {brandName}
              </div>
              <div className="mt-1 flex items-center gap-2 text-[8px] font-medium tracking-[0.18em] text-neutral-500">
                <span className="h-px w-5 bg-neutral-400" />
                {est}
                <span className="h-px w-5 bg-neutral-400" />
              </div>
            </div>

            {/* ── Headline ── */}
            <div className="mt-3 text-center">
              <div className="text-[13px] font-extrabold tracking-wide text-black">
                ΚΛΕΙΣΤΕ ΤΟ ΡΑΝΤΕΒΟΥ ΣΑΣ
              </div>
              <div className="font-display mt-0.5 text-[12px] italic text-[#c9a35a]">
                σε 10 δευτερόλεπτα
              </div>
            </div>

            {/* ── Body: hours (left) + QR (right) ── */}
            <div className="mt-3 grid grid-cols-[1fr_1px_1fr] gap-3">
              {/* Hours */}
              <div>
                <div className="mb-1.5 flex items-center gap-1">
                  <Calendar className="size-2.5 text-[#c9a35a]" strokeWidth={2.5} />
                  <span className="text-[7px] font-bold tracking-widest text-black">
                    ΩΡΑΡΙΟ ΛΕΙΤΟΥΡΓΙΑΣ
                  </span>
                </div>
                <div className="space-y-[3px]">
                  {hours.map((h) => (
                    <div
                      key={h.day}
                      className="flex items-center justify-between border-b border-neutral-200 pb-[2px] text-[7px]"
                    >
                      <span className="font-bold tracking-tight text-black">
                        {h.day}
                      </span>
                      <span
                        className={
                          h.closed
                            ? "font-bold text-[#c9a35a]"
                            : "text-neutral-700"
                        }
                      >
                        {h.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vertical divider */}
              <div className="bg-neutral-200" />

              {/* QR block */}
              <div className="flex flex-col items-center">
                <div className="font-display text-[11px] italic text-black">
                  Σκανάρετε &amp;
                </div>
                <div className="relative mt-1">
                  <div className="rounded-md bg-black px-2 py-0.5 text-[7px] font-bold tracking-widest text-white">
                    ΚΛΕΙΣΤΕ ONLINE
                  </div>
                  <ArrowDown className="absolute -right-3 top-2 size-3 -rotate-[20deg] text-[#c9a35a]" />
                </div>

                <div className="relative mt-2 rounded-md p-1 ring-[1.5px] ring-[#c9a35a]">
                  {/* Real QR as inline SVG */}
                  <div
                    aria-label={`QR code for ${brandName}`}
                    role="img"
                    className="size-20 [&>svg]:size-full [&>svg]:rounded-sm"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                  {/* Center calendar badge */}
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="grid size-5 place-items-center rounded-md border-[1.5px] border-[#c9a35a] bg-white">
                      <Calendar
                        className="size-2.5 text-[#c9a35a]"
                        strokeWidth={2.5}
                      />
                    </div>
                  </div>
                </div>

                {/* Action icons */}
                <div className="mt-2 flex gap-1.5">
                  {[
                    { Icon: Calendar, label: "ΚΛΕΙΣΕ" },
                    { Icon: RefreshCcw, label: "ΑΛΛΑΞΕ" },
                    { Icon: X, label: "ΑΚΥΡΩΣΕ" },
                  ].map(({ Icon, label }) => (
                    <div key={label} className="flex flex-col items-center gap-0.5">
                      <div className="grid size-4 place-items-center rounded-full bg-black text-white">
                        <Icon className="size-2" strokeWidth={3} />
                      </div>
                      <span className="text-[5px] font-bold leading-none tracking-tight text-black">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Features banner ── */}
            <div className="mt-3 rounded-md bg-black px-2 py-1.5">
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  "Άμεση\nεπιβεβαίωση",
                  "Διαθέσιμες ώρες\nσε πραγματικό χρόνο",
                  "Χωρίς αναμονή\nστο τηλέφωνο",
                ].map((text) => (
                  <div
                    key={text}
                    className="flex items-start gap-1 text-[5.5px] leading-tight text-white"
                  >
                    <span className="grid size-2 shrink-0 place-items-center rounded-full ring-[1px] ring-[#c9a35a]">
                      <Check className="size-1.5 text-[#c9a35a]" strokeWidth={4} />
                    </span>
                    <span className="whitespace-pre-line">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="font-display mt-2 text-center text-[7px] italic text-neutral-700">
              Σας ευχαριστούμε που μας εμπιστεύεστε!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Scissors() {
  // Decorative scissors icon with side lines, matching the poster style
  return (
    <div className="flex w-full items-center justify-center gap-2">
      <span className="h-px w-10 bg-black" />
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="6" cy="18" r="3" stroke="black" strokeWidth="1.5" />
        <circle cx="18" cy="18" r="3" stroke="black" strokeWidth="1.5" />
        <line x1="8.5" y1="15.5" x2="20" y2="4" stroke="black" strokeWidth="1.5" />
        <line x1="15.5" y1="15.5" x2="4" y2="4" stroke="black" strokeWidth="1.5" />
      </svg>
      <span className="h-px w-10 bg-black" />
    </div>
  );
}
