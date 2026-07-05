import "server-only";
import QRCode from "qrcode";

export interface QrOptions {
  dark?: string;
  light?: string;
  margin?: number;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
}

export async function generateQrSvg(
  data: string,
  options: QrOptions = {},
): Promise<string> {
  const {
    dark = "#000000",
    light = "#ffffff",
    margin = 1,
    errorCorrectionLevel = "H",
  } = options;

  return QRCode.toString(data, {
    type: "svg",
    margin,
    errorCorrectionLevel,
    color: { dark, light },
  });
}
