export const DOWNLOAD_MAC =
  "https://github.com/zentag37/discipline-coach/releases/download/v1.0.0/TradeWithAce-1.0.0-arm64.dmg";
export const DOWNLOAD_WIN =
  "https://github.com/zentag37/discipline-coach/releases/download/v1.0.0/TradeWithAce.Setup.1.0.0.exe";

export function pickDownloadUrl(): string {
  if (typeof navigator === "undefined") return DOWNLOAD_WIN;
  const p = navigator.platform?.toLowerCase() || "";
  const ua = navigator.userAgent?.toLowerCase() || "";
  if (p.includes("mac") || ua.includes("mac")) return DOWNLOAD_MAC;
  return DOWNLOAD_WIN;
}
