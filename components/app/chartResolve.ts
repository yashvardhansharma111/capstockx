/**
 * Normalize any symbol shape the dashboard returns (Yahoo like "^NSEI" /
 * "RELIANCE.NS" / "GC=F", TradingView like "NSE:NIFTY") into the {symbol,
 * exchange} pair Angel One's /api/angel/candles + /api/angel/stream expect.
 */

const HOME_CHART_MAP: Record<string, { symbol: string; exchange: string }> = {
  "^NSEI": { symbol: "NIFTY", exchange: "NSE" },
  "^NSEBANK": { symbol: "BANKNIFTY", exchange: "NSE" },
  "^BSESN": { symbol: "SENSEX", exchange: "BSE" },
  "GC=F": { symbol: "GOLD", exchange: "MCX" },
  "SI=F": { symbol: "SILVER", exchange: "MCX" },
  "CL=F": { symbol: "CRUDEOIL", exchange: "MCX" },
  "NG=F": { symbol: "NATURALGAS", exchange: "MCX" },
  "HG=F": { symbol: "COPPER", exchange: "MCX" },
};

/** TradingView synthetic commodity symbols → Angel MCX equivalents. */
const TVC_MAP: Record<string, string> = {
  GOLD: "GOLD",
  SILVER: "SILVER",
  USOIL: "CRUDEOIL",
  UKOIL: "CRUDEOIL",
  NATGAS: "NATURALGAS",
  COPPER: "COPPER",
};

export function resolveChartSymbol(
  raw: string | undefined | null,
): { symbol: string; exchange: string } {
  if (!raw) return { symbol: "NIFTY", exchange: "NSE" };

  const mapped = HOME_CHART_MAP[raw];
  if (mapped) return mapped;

  if (raw.endsWith(".NS")) {
    return { symbol: raw.replace(".NS", ""), exchange: "NSE" };
  }
  if (raw.endsWith(".BO")) {
    return { symbol: raw.replace(".BO", ""), exchange: "BSE" };
  }

  if (raw.includes(":")) {
    const [exRaw, symRaw] = raw.split(":");
    const ex = (exRaw || "NSE").toUpperCase();
    const sym = (symRaw || "").toUpperCase();
    if (ex === "TVC") {
      const mcxSym = TVC_MAP[sym] || sym;
      return { symbol: mcxSym, exchange: "MCX" };
    }
    if (ex === "NSE" || ex === "BSE" || ex === "MCX" || ex === "NFO") {
      return { symbol: sym, exchange: ex };
    }
    // Unknown exchange token — fall through to default.
    return { symbol: sym, exchange: "NSE" };
  }

  return { symbol: raw, exchange: "NSE" };
}

export function buildStockHref(
  raw: string | undefined | null,
  name: string,
  ltp: number | undefined,
  changePct: number | undefined,
): string {
  const { symbol, exchange } = resolveChartSymbol(raw);
  const params = new URLSearchParams({
    exchange,
    name,
    price: String(ltp ?? 0),
    changePct: String(changePct ?? 0),
  });
  return `/app/stock/${encodeURIComponent(symbol)}?${params.toString()}`;
}
