import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

/** Same shape as admin / config orders */
export type OrderRowEffective = {
  expiryDate: string;
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

export type OrdersConfigEffective = {
  summary?: { dayPnl: number; totalPnl: number };
  segments: Array<{ key: string; label: string }>;
  orders: OrderRowEffective[];
  showOptionType?: boolean;
  showSide?: boolean;
};

const KEY = "dashboard_orders";

const empty: OrdersConfigEffective = {
  summary: { dayPnl: 0, totalPnl: 0 },
  segments: [],
  orders: [],
};

/**
 * Global orders + optional per-user overrides (same id replaces global row).
 * If there is no per-user document, returns global only.
 */
export async function getEffectiveOrdersConfigForUser(
  userId: string | null | undefined,
): Promise<OrdersConfigEffective> {
  const db = await getDb();
  const settings = db.collection("settings");

  async function loadGlobal(): Promise<OrdersConfigEffective> {
    const doc = await settings.findOne<{ value?: OrdersConfigEffective }>({
      key: KEY,
      userId: null,
    });
    if (doc?.value) {
      console.log(
        "[effective-orders] loadGlobal hit (userId:null)",
        JSON.stringify({ rowCount: doc.value.orders?.length ?? 0 }),
      );
      return normalize(doc.value);
    }
    const legacy = await settings.findOne<{ value?: OrdersConfigEffective }>({
      key: KEY,
      userId: { $exists: false },
    });
    if (legacy?.value) {
      console.log(
        "[effective-orders] loadGlobal hit (legacy missing userId)",
        JSON.stringify({ rowCount: legacy.value.orders?.length ?? 0 }),
      );
      return normalize(legacy.value);
    }
    console.log("[effective-orders] loadGlobal MISS — no global doc found");
    return { ...empty };
  }

  function normalize(c: OrdersConfigEffective): OrdersConfigEffective {
    return {
      summary: c.summary ?? { dayPnl: 0, totalPnl: 0 },
      segments: Array.isArray(c.segments) ? c.segments : [],
      orders: Array.isArray(c.orders) ? c.orders : [],
      showOptionType: c.showOptionType,
      showSide: c.showSide,
    };
  }

  // When no userId is given (e.g. admin panel preview) return the global template.
  if (!userId || !ObjectId.isValid(userId)) {
    const global = await loadGlobal();
    console.log(
      "[effective-orders] returning global only — invalid/missing userId",
      JSON.stringify({ userId, globalRowCount: global.orders.length }),
    );
    return global;
  }

  // For a real user: ONLY return rows explicitly assigned to them.
  // Do NOT fall back to global — global rows would contaminate every user's P&L.
  const userDoc = await settings.findOne<{ value?: OrdersConfigEffective }>({
    key: KEY,
    userId: new ObjectId(userId),
  });

  if (!userDoc?.value) {
    console.log(
      "[effective-orders] no per-user config — returning empty (not global) for userId",
      userId,
    );
    return { ...empty };
  }

  const u = normalize(userDoc.value);
  console.log(
    "[effective-orders] per-user config found",
    JSON.stringify({ userId, rowCount: u.orders.length }),
  );
  return u;
}
