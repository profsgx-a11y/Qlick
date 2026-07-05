import "server-only";
import QRCode from "qrcode";
import {
  buildIconSvg,
  buildTableSvg,
  tableHeight,
  parseFontStyle,
  type QrDesign,
  type AnyElement,
} from "./qr-template";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function weightStyle(fontStyle: string): string {
  const { weight, italic } = parseFontStyle(fontStyle);
  return `font-weight="${weight}"${italic ? ' font-style="italic"' : ""}`;
}

async function elementToSvg(el: AnyElement): Promise<string> {
  const rot = el.rotation
    ? ` transform="rotate(${el.rotation} ${el.x} ${el.y})"`
    : "";
  const op =
    el.opacity != null && el.opacity !== 1 ? ` opacity="${el.opacity}"` : "";

  switch (el.type) {
    case "rect": {
      const stroke = el.stroke
        ? ` stroke="${el.stroke}" stroke-width="${el.strokeWidth ?? 1}"`
        : "";
      return `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${el.cornerRadius ?? 0}" fill="${el.fill ?? "none"}"${stroke}${op}${rot}/>`;
    }
    case "line": {
      const [x1, y1, x2, y2] = el.points;
      return `<line x1="${el.x + x1}" y1="${el.y + y1}" x2="${el.x + x2}" y2="${el.y + y2}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}" stroke-linecap="round"${op}${rot}/>`;
    }
    case "ellipse": {
      const stroke = el.stroke
        ? ` stroke="${el.stroke}" stroke-width="${el.strokeWidth ?? 0}"`
        : "";
      return `<ellipse cx="${el.x}" cy="${el.y}" rx="${el.radiusX}" ry="${el.radiusY}" fill="${el.fill ?? "none"}"${stroke}${op}${rot}/>`;
    }
    case "text": {
      const lines = el.text.split("\n");
      const anchor =
        el.align === "center" ? "middle" : el.align === "right" ? "end" : "start";
      const w = el.width ?? 0;
      const tx =
        el.align === "center" ? el.x + w / 2 : el.align === "right" ? el.x + w : el.x;
      const ls = el.letterSpacing ? ` letter-spacing="${el.letterSpacing}"` : "";
      const lh = el.fontSize * el.lineHeight;
      const tspans = lines
        .map(
          (ln, i) =>
            `<tspan x="${tx}" y="${el.y + el.fontSize * 0.85 + i * lh}">${esc(ln)}</tspan>`,
        )
        .join("");
      return `<text font-family="${esc(el.fontFamily)}" font-size="${el.fontSize}" fill="${el.fill}" text-anchor="${anchor}" ${weightStyle(el.fontStyle)}${ls}${op}${rot}>${tspans}</text>`;
    }
    case "image": {
      return `<image href="${esc(el.src)}" x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" preserveAspectRatio="xMidYMid meet"${op}${rot}/>`;
    }
    case "qr": {
      const dataUrl = await QRCode.toDataURL(el.data || " ", {
        margin: 1,
        width: 600,
        errorCorrectionLevel: "H",
        color: { dark: el.fill, light: el.background },
      });
      return `<image href="${dataUrl}" x="${el.x}" y="${el.y}" width="${el.size}" height="${el.size}"${op}${rot}/>`;
    }
    case "icon": {
      const svg = buildIconSvg(
        el.iconKey,
        el.color,
        el.bg,
        256,
        el.borderColor ?? "none",
        el.borderWidth ?? 0,
      );
      const href = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
      return `<image href="${href}" x="${el.x}" y="${el.y}" width="${el.size}" height="${el.size}"${op}${rot}/>`;
    }
    case "table": {
      const svg = buildTableSvg(el);
      const href = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
      const h = tableHeight(el);
      return `<image href="${href}" x="${el.x}" y="${el.y}" width="${el.width}" height="${h}"${op}${rot}/>`;
    }
    default:
      return "";
  }
}

/** Renders a full QR poster design to a standalone SVG string (server-side). */
export async function renderDesignToSvg(design: QrDesign): Promise<string> {
  const parts = await Promise.all(design.elements.map(elementToSvg));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${design.width} ${design.height}" preserveAspectRatio="xMidYMid meet" width="100%" height="100%"><rect x="0" y="0" width="${design.width}" height="${design.height}" fill="${design.background}"/>${parts.join("")}</svg>`;
}
