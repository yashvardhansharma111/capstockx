import { NextRequest, NextResponse } from "next/server";
import { angelPost } from "@/lib/angelone/session";
import { INDEX_TOKENS, resolveTradable } from "@/lib/angelone/instruments";

/**
 * GET /api/angel/candles?symbol=RELIANCE&exchange=NSE&interval=ONE_DAY&range=1M
 *
 * Returns OHLCV candle array from Angel One historical API.
 * Supports: ONE_MINUTE, FIVE_MINUTE, FIFTEEN_MINUTE, THIRTY_MINUTE, ONE_HOUR, ONE_DAY
 */

const RANGE_MAP: Record<string, { days: number; interval: string }> = {
  "1D": { days: 1, interval: "FIVE_MINUTE" },
  "3D": { days: 3, interval: "ONE_MINUTE" },
  "5D": { days: 5, interval: "FIVE_MINUTE" },
  "1W": { days: 7, interval: "FIFTEEN_MINUTE" },
  "1M": { days: 30, interval: "ONE_DAY" },
  "3M": { days: 90, interval: "ONE_DAY" },
  "6M": { days: 180, interval: "ONE_DAY" },
  "1Y": { days: 365, interval: "ONE_DAY" },
};

// Cache TTL per range — intraday refreshes faster than daily/weekly
const CACHE_TTL_MS: Record<string, number> = {
  "1D": 30_000,
  "3D": 60_000,
  "5D": 60_000,
  "1W": 120_000,
  "1M": 300_000,
  "3M": 600_000,
  "6M": 1_200_000,
  "1Y": 3_600_000,
};

declare global {
  // eslint-disable-next-line no-var
  var __candleCache: Map<string, { payload: unknown; fetchedAt: number }> | undefined;
}
const candleCache: Map<string, { payload: unknown; fetchedAt: number }> =
  globalThis.__candleCache ?? (globalThis.__candleCache = new Map());

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}`;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const symbolName = sp.get("symbol") || "NIFTY";
  const exchange = sp.get("exchange") || "NSE";
  const range = sp.get("range") || "1D";
  const intervalOverride = sp.get("interval");

  try {
    // Resolve symbol token (handles indices, equities, options, MCX futures)
    let token: string | undefined;
    let resolvedExchange = exchange;
    const idxEntry = INDEX_TOKENS[symbolName.toUpperCase()];
    if (idxEntry) {
      token = idxEntry.token;
      resolvedExchange = idxEntry.exchange;
    } else {
      const inst = await resolveTradable(exchange, symbolName);
      if (inst) {
        token = inst.token;
        resolvedExchange = inst.exch_seg;
      }
    }

    if (!token) {
      console.warn(`[angel/candles] symbol not found: ${exchange}:${symbolName}`);
      return NextResponse.json(
        { error: `Symbol not found: ${exchange}:${symbolName}` },
        { status: 404 },
      );
    }

    const rangeConfig = RANGE_MAP[range] || RANGE_MAP["1D"];
    const interval = intervalOverride || rangeConfig.interval;
    const cacheKey = `${symbolName}:${resolvedExchange}:${range}:${interval}`;
    const ttl = CACHE_TTL_MS[range] ?? 60_000;

    // Serve from cache if fresh
    const hit = candleCache.get(cacheKey);
    if (hit && Date.now() - hit.fetchedAt < ttl) {
      console.log(`[angel/candles] CACHE HIT  ${cacheKey} age=${Math.round((Date.now() - hit.fetchedAt) / 1000)}s`);
      return NextResponse.json(hit.payload);
    }

    const toDate = new Date();
    const fromDate = new Date(toDate.getTime() - rangeConfig.days * 24 * 60 * 60 * 1000);

    // For single-day intraday: clamp fromDate to market open so we get today's candles only.
    if (range === "1D") {
      const mcx = resolvedExchange === "MCX";
      fromDate.setHours(mcx ? 9 : 9, mcx ? 0 : 15, 0, 0);
    }

    const body = {
      exchange: resolvedExchange,
      symboltoken: token,
      interval,
      fromdate: formatDate(fromDate),
      todate: formatDate(toDate),
    };

    console.log(`[angel/candles] FETCH ${cacheKey} from=${body.fromdate} to=${body.todate}`);

    const result = await angelPost(
      "/rest/secure/angelbroking/historical/v1/getCandleData",
      body,
    );

    console.log(`[angel/candles] ANGEL response status=${result?.status} msg=${result?.message ?? "—"} dataLen=${Array.isArray(result?.data) ? result.data.length : "none"}`);

    if (!result.status || !result.data) {
      return NextResponse.json(
        { error: result.message || "Failed to fetch candle data" },
        { status: 502 },
      );
    }

    // Angel returns [[timestamp, O, H, L, C, V], ...]
    const candles = (result.data as any[]).map(
      ([time, open, high, low, close, volume]: any[]) => ({
        time: new Date(time).getTime() / 1000, // Unix seconds
        open: Number(open),
        high: Number(high),
        low: Number(low),
        close: Number(close),
        volume: Number(volume),
      }),
    );

    const payload = { symbol: symbolName, exchange, range, interval, candles };
    candleCache.set(cacheKey, { payload, fetchedAt: Date.now() });
    console.log(`[angel/candles] CACHE SET  ${cacheKey} candles=${candles.length} ttl=${ttl / 1000}s`);

    return NextResponse.json(payload);
  } catch (err: any) {
    console.error(`[angel/candles] ERROR ${symbolName}:${exchange}:${range}`, err?.message ?? err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 },
    );
  }
}
