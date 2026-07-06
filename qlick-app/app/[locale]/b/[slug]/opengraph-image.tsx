import { ImageResponse } from "next/og";
import {
  OG_SIZE,
  OG_BG,
  OG_GOLD,
  OG_MUTED,
  ogFonts,
  ogBusiness,
  ogFetchImage,
} from "@/lib/og";

export const alt = "Qlick";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const isEl = locale !== "en";
  const biz = await ogBusiness(slug);
  const name = biz?.name ?? "Qlick";
  const accent = biz?.accent || OG_GOLD;
  const tagline = isEl ? "Κλείσε ραντεβού online" : "Book online";
  const brandLine = isEl ? "με το Qlick" : "with Qlick";

  const logo = biz?.logoUrl ? await ogFetchImage(biz.logoUrl) : null;
  const monogram = name.trim().charAt(0).toUpperCase() || "Q";

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
          padding: "88px",
          fontFamily: "Noto Sans",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "48px" }}>
          {logo ? (
            <div
              style={{
                display: "flex",
                width: "168px",
                height: "168px",
                borderRadius: "32px",
                background: "#ffffff",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <img
                src={logo as unknown as string}
                width={168}
                height={168}
                style={{ objectFit: "contain" }}
              />
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                width: "168px",
                height: "168px",
                borderRadius: "50%",
                border: `4px solid ${accent}`,
                background: "rgba(212,168,87,0.12)",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "88px",
                fontWeight: 700,
                color: accent,
              }}
            >
              {monogram}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: "80px",
                fontWeight: 700,
                color: "#ffffff",
                lineHeight: 1.05,
              }}
            >
              {name}
            </div>
            <div style={{ fontSize: "38px", color: accent, marginTop: "12px" }}>
              {tagline}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginTop: "auto",
          }}
        >
          <div style={{ fontSize: "34px", fontWeight: 700, color: accent }}>
            Qlick
          </div>
          <div style={{ fontSize: "28px", color: OG_MUTED }}>
            {`${brandLine} · qlick.gr`}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
