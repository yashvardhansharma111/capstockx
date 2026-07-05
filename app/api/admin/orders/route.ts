import { apiErrorResponse } from "@/lib/api-error";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { deleteScopedConfig, readScopedConfig, upsertScopedConfig } from "@/lib/scoped-config";
import { getEffectiveOrdersConfigForUser } from "@/lib/effective-orders-config";
import { broadcastEvent } from "@/lib/event-bus";
import { getRealPositions } from "@/lib/trades";

const LIVE_ROW_PREFIX = "live-";

function adminProductTypeFromEngine(p?: string): string {
  if (!p) return "Delivery";
  const upper = p.toUpperCase();
  if (upper === "CNC") return "Delivery";
  if (upper === "MIS") return "Intraday";
  if (upper === "NRML") return "F&O";
  return p;
}

async function buildLiveRows(scopeUserId: string): Promise<OrderRow[]> {
  try {
    const real = await getRealPositions(scopeUserId);
    return real.map((p) => {
      const qty = Number(p.qty ?? 0);
      const avgPrice = Number(p.avgPrice ?? 0);
      const ltp = Number(p.ltp ?? avgPrice);
      const pnl = Number(p.pnl ?? 0);
      const pnlPct = Number(p.pnlPct ?? 0);
      return {
        id: `${LIVE_ROW_PREFIX}pos:${p.id ?? p._id?.toString() ?? ""}`,
        segmentKey: "positions",
        market: p.exchange,
        symbol: p.symbol,
        side: p.side as "BUY" | "SELL",
        productType: adminProductTypeFromEngine(p.productType),
        optionType: p.optionType,
        strikePrice: p.strikePrice,
        exchange: p.exchange,
        qty,
        avgPrice,
        ltp,
        buyPrice: p.side === "BUY" ? avgPrice : 0,
        sellPrice: p.side === "SELL" ? avgPrice : 0,
        lots: qty,
        pnl,
        pnlPct,
        pnlManual: true,
        status: "OPEN",
      } satisfies OrderRow;
    });
  } catch (err) {
    console.error("[admin/orders] buildLiveRows failed:", err);
    return [];
  }
}

type OrderSegment = {
  key: string;
  label: string;
};

type OrderRow = {
  id: string;
  segmentKey: string;
  market?: string;
  symbol: string;
  side: "BUY" | "SELL";
  productType?: string;
  optionType?: string;
  strikePrice?: number;
  exchange?: string;
  orderTag?: string;
  changePct?: number;
  filledLots?: number;
  totalLots?: number;
  orderPrice?: number;
  qty: number;
  lotSize?: number;
  startDate?: string;
  avgPrice: number;
  ltp: number;
  buyPrice?: number;
  sellPrice?: number;
  lots?: number;
  pnlManual?: boolean;
  pnlPct?: number;
  pnl: number;
  status: "OPEN" | "CLOSED";
  time?: string;
};

type OrdersConfig = {
  summary?: {
    dayPnl: number;
    totalPnl: number;
  };
  segments: OrderSegment[];
  orders: OrderRow[];
  showOptionType?: boolean;
  showSide?: boolean;
};

async function requireAdmin() {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("ajx_admin");
  return !!adminCookie && adminCookie.value === "ok";
}

function getScopeUserId(request: Request) {
  const { searchParams } = new URL(request.url);
  return searchParams.get("scopeUserId");
}

export async function GET(request: Request) {
  try {
    const ok = await requireAdmin();
    if (!ok) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const scopeUserId = getScopeUserId(request);

    // When scoped to a user, return the effective (merged global+user) config
    // so admin sees exactly what the user sees in the app.
    if (scopeUserId) {
      const effective = await getEffectiveOrdersConfigForUser(scopeUserId);
      const configured: OrderRow[] = (effective.orders ?? []) as OrderRow[];
      const live = await buildLiveRows(scopeUserId);
      const orders: OrderRow[] = [...configured, ...live];

      function computePnl(o: OrderRow) {
        if (o.pnlManual && typeof o.pnl === "number" && Number.isFinite(o.pnl)) return o.pnl;
        const lots = Number(o.lots ?? o.qty ?? 0);
        const buy = Number(o.buyPrice ?? o.avgPrice ?? 0);
        const sell = Number(o.sellPrice ?? o.ltp ?? 0);
        return o.side === "SELL" ? (buy - sell) * lots : (sell - buy) * lots;
      }
      const derivedSummary = {
        dayPnl: orders.reduce((a, o) => a + computePnl(o), 0),
        totalPnl: orders.reduce((a, o) => a + computePnl(o), 0),
      };

      return NextResponse.json({
        config: { ...effective, orders, summary: derivedSummary },
        source: "effective",
        scopeUserId,
      });
    }

    // Global scope: return raw global config
    const { config, source } = await readScopedConfig<OrdersConfig>({
      key: "dashboard_orders",
      userId: null,
      fallback: {
        summary: { dayPnl: 0, totalPnl: 0 },
        segments: [],
        orders: [],
      },
    });

    const orders: OrderRow[] = Array.isArray(config.orders) ? config.orders : [];
    function computePnlGlobal(o: OrderRow) {
      if (o.pnlManual && typeof o.pnl === "number" && Number.isFinite(o.pnl)) return o.pnl;
      const lots = Number(o.lots ?? o.qty ?? 0);
      const buy = Number(o.buyPrice ?? o.avgPrice ?? 0);
      const sell = Number(o.sellPrice ?? o.ltp ?? 0);
      return o.side === "SELL" ? (buy - sell) * lots : (sell - buy) * lots;
    }
    const derivedSummary = {
      dayPnl: orders.reduce((a, o) => a + computePnlGlobal(o), 0),
      totalPnl: orders.reduce((a, o) => a + computePnlGlobal(o), 0),
    };

    return NextResponse.json({
      config: { ...config, summary: derivedSummary },
      source,
      scopeUserId: null,
    });
  } catch (error) {
    return apiErrorResponse(error, "Admin orders get error:", "Failed to fetch orders");
  }
}

export async function POST(request: Request) {
  try {
    const ok = await requireAdmin();
    if (!ok) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      config?: OrdersConfig;
      scopeUserId?: string | null;
    };
    const config = body?.config;

    if (!config) {
      return NextResponse.json(
        { message: "config is required" },
        { status: 400 },
      );
    }

    // Strip read-only "live-*" rows (real positions surfaced for display) so they
    // don't get baked into the scoped config and double-counted on next load.
    if (Array.isArray(config.orders)) {
      config.orders = config.orders.filter(
        (r) => typeof r.id !== "string" || !r.id.startsWith(LIVE_ROW_PREFIX),
      );
    }

    console.log(
      "[admin/orders POST] saving",
      JSON.stringify({
        scopeUserId: body.scopeUserId || null,
        rowCount: config.orders?.length ?? 0,
        rows: (config.orders ?? []).map((r) => ({
          id: r.id,
          segmentKey: r.segmentKey,
          symbol: r.symbol,
          side: r.side,
          qty: r.qty,
          lots: r.lots,
          avgPrice: r.avgPrice,
          buyPrice: r.buyPrice,
          ltp: r.ltp,
        })),
      }),
    );

    await upsertScopedConfig<OrdersConfig>({
      key: "dashboard_orders",
      userId: body.scopeUserId || null,
      config,
    });

    // notify connected dashboards (development-friendly in-memory broadcast)
    try {
      broadcastEvent({ type: "orders:update", config, scopeUserId: body.scopeUserId || null });
    } catch (err) {
      // don't fail the request if broadcasting fails
      console.error("Broadcast error:", err);
    }

    return NextResponse.json({ message: "Orders updated" });
  } catch (error) {
    return apiErrorResponse(error, "Admin orders save error:", "Failed to save orders");
  }
}

export async function DELETE(request: Request) {
  try {
    const ok = await requireAdmin();
    if (!ok) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const scopeUserId = getScopeUserId(request);
    await deleteScopedConfig({ key: "dashboard_orders", userId: scopeUserId });

    return NextResponse.json({ message: "Orders config deleted" });
  } catch (error) {
    return apiErrorResponse(error, "Admin orders delete error:", "Failed to delete orders");
  }
}
