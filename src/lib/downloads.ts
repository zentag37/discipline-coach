import { supabase } from "@/integrations/supabase/client";

export const DOWNLOAD_MAC =
  "https://github.com/zentag37/tradewithace-releases/releases/latest/download/TradeWithAce-1.0.0-arm64.dmg";
export const DOWNLOAD_WIN =
  "https://github.com/zentag37/tradewithace-releases/releases/latest/download/TradeWithAce.Setup.1.0.0.exe";

export function pickDownloadUrl(): string {
  if (typeof navigator === "undefined") return DOWNLOAD_WIN;
  const p = navigator.platform?.toLowerCase() || "";
  const ua = navigator.userAgent?.toLowerCase() || "";
  if (p.includes("mac") || ua.includes("mac")) return DOWNLOAD_MAC;
  return DOWNLOAD_WIN;
}

export async function trackDownload(platform: "mac" | "windows"): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    await supabase.from("download_events" as any).insert({
      platform,
      user_id: data.session?.user.id ?? null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
      referrer: typeof document !== "undefined" ? document.referrer.slice(0, 500) : null,
    });
  } catch {
    // analytics is fire-and-forget; never block the download
  }
}
