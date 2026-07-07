import { NextResponse } from "next/server";
import { loadInstruments } from "@/lib/angelone/instruments";

/**
 * GET /api/angel/preload
 * Warms the scrip master cache in the background.
 * Call fire-and-forget when opening StockDetailScreen so the
 * option chain is fast when the user switches tabs.
 */
export async function GET() {
  // Don't await — start the download and return immediately
  loadInstruments().catch((e) =>
    console.warn("[preload] scrip master warm failed:", e),
  );
  return NextResponse.json({ ok: true });
}
