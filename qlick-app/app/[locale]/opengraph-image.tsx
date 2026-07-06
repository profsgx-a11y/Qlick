import { ImageResponse } from "next/og";
import { OG_SIZE, OG_BG, OG_GOLD, OG_MUTED, OG_REVALIDATE, ogFonts } from "@/lib/og";

export const alt = "Qlick";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = OG_REVALIDATE;

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isEl = locale !== "en";
  const tagline = isEl
    ? "Κλείσε ραντεβού online — χωρίς τηλέφωνα"
    : "Online booking — no phone calls";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: OG_BG,
          padding: "96px",
          fontFamily: "Noto Sans",
        }}
      >
        <div
          style={{
            fontSize: "132px",
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1,
          }}
        >
          Qlick
        </div>
        <div style={{ fontSize: "44px", color: OG_GOLD, marginTop: "24px" }}>
          {tagline}
        </div>
        <div
          style={{
            fontSize: "30px",
            color: OG_MUTED,
            marginTop: "auto",
          }}
        >
          qlick.gr
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
