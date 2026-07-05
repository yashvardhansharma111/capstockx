/**
 * Paper trading engine — manages orders, positions, and holdings in MongoDB.
 * Uses real Angel One LTP for execution prices.
 */
import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import { angelPost } from "./angelone/session";
import { findBySymbol, INDEX_TOKENS, resolveTradable } from "./angelone/instruments";
import {
  getEffectiveOrdersConfigForUser,
  type OrderRowEffective,
} from "./effective-orders-config";

export interface Trade {
  _id?: ObjectId;
  userId: ObjectId;
  symbol: string;
  exchange: string;
  side: "BUY" | "SELL";
  orderType: "MARKET" | "LIMIT";
  qty: number;
  price: number;           // execution price (LTP at time of order for MARKET)
  limitPrice?: number;     // for LIMIT orders
  status: "EXECUTED" | "PENDING" | "CANCELLED" | "REJECTED";
  productType: "CNC" | "MIS" | "NRML"; // CNC=delivery, MIS=intraday, NRML=F&O
  lotSize: number;
  totalValue: number;      // price * qty
  segmentKey: string;      // "openOrders" | "positions" | "history"
  optionType?: string;     // "CE" | "PE" for options
  strikePrice?: number;
  expiry?: string;
  pnl: number;
  /** Admin-set override; when present, replaces the computed/stored pnl in API responses. */
  pnlOverride?: number | null;
  createdAt: Date;
  executedAt?: Date;
}

export interface Position {
  _id?: ObjectId;
  userId: ObjectId;
  symbol: string;
  exchange: string;
  side: "BUY" | "SELL";
  qty: number;
  avgPrice: number;
  productType: string;
  lotSize: number;
  optionType?: string;
  strikePrice?: number;
  expiry?: string;
  /** Admin-set override; when present, replaces (ltp - avg) * qty in API responses. */
  pnlOverride?: number | null;
  /** Admin-set percent override; auto-derived if absent. */
  pnlPctOverride?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

async function tradesCol() {
  const db = await getDb();
  return db.collection<Trade>("trades");
}

async function positionsCol() {
  const db = await getDb();
  return db.collection<Position>("positions");
}

/** Resolve current LTP from Angel One. Works for indices, equities, options, MCX futures. */
async function fetchLTP(symbol: string, exchange: string): Promise<number> {
  let token: string | undefined;
  let resolvedExchange = exchange;

  // Indices
  const idx = INDEX_TOKENS[symbol.toUpperCase()];
  if (idx) {
    token = idx.token;
    resolvedExchange = idx.exchange;
  } else {
    // Try direct symbol first (handles full option symbols like NIFTY25APR202524000CE)
    // and MCX → nearest-month future fallback
    const inst = await resolveTradable(exchange, symbol);
    token = inst?.token;
    if (inst) resolvedExchange = inst.exch_seg;
  }

  if (!token) throw new Error(`Cannot resolve token for ${exchange}:${symbol}`);

  const result = await angelPost(
    "/rest/secure/angelbroking/market/v1/quote/",
    { mode: "LTP", exchangeTokens: { [resolvedExchange]: [token] } },
  );

  const ltp = result?.data?.fetched?.[0]?.ltp;
  if (typeof ltp !== "number") throw new Error(`No LTP for ${symbol}`);
  return ltp;
}

/**
 * BATCH-fetch LTPs for many positions in a single Angel call per exchange.
 * Cuts Orders-screen load time from O(N * 400ms) to O(1 * 400ms).
 * Also caches LTPs for 3 seconds to avoid hammering Angel during the 5s refresh loop.
 */
declare global {
  // eslint-disable-next-line no-var
  var __ltpCache: Map<string, { ltp: number; fetchedAt: number }> | undefined;
}
const ltpCache =
  globalThis.__ltpCache ||
  (globalThis.__ltpCache = new Map<string, { ltp: number; fetchedAt: number }>());
const LTP_CACHE_TTL_MS = 3000;

async function fetchLTPsBatch(
  positions: { symbol: string; exchange: string }[],
): Promise<Map<string, number>> {
  // cache key = `exchange:symbol`
  const out = new Map<string, number>();
  const toFetch: {
    symbol: string;
    exchange: string;
    token: string;
    resolvedExchange: string;
  }[] = [];

  const now = Date.now();

  // Phase 1: resolve tokens + check cache
  await Promise.all(
    positions.map(async (p) => {
      const cacheKey = `${p.exchange}:${p.symbol}`;
      const hit = ltpCache.get(cacheKey);
      if (hit && now - hit.fetchedAt < LTP_CACHE_TTL_MS) {
        out.set(cacheKey, hit.ltp);
        return;
      }
      try {
        let token: string | undefined;
        let resolvedExchange = p.exchange;
        const idx = INDEX_TOKENS[p.symbol.toUpperCase()];
        if (idx) {
          token = idx.token;
          resolvedExchange = idx.exchange;
        } else {
          const inst = await resolveTradable(p.exchange, p.symbol);
          if (inst) {
            token = inst.token;
            resolvedExchange = inst.exch_seg;
          }
        }
        if (token) {
          toFetch.push({ ...p, token, resolvedExchange });
        }
      } catch {
        // skip
      }
    }),
  );

  if (!toFetch.length) return out;

  // Phase 2: group tokens by exchange, one Angel call per exchange
  const tokensByExchange: Record<string, string[]> = {};
  const tokenToEntry = new Map<
    string,
    { symbol: string; exchange: string }
  >();
  for (const f of toFetch) {
    if (!tokensByExchange[f.resolvedExchange]) {
      tokensByExchange[f.resolvedExchange] = [];
    }
    tokensByExchange[f.resolvedExchange].push(f.token);
    tokenToEntry.set(f.token, { symbol: f.symbol, exchange: f.exchange });
  }

  // Angel limits ~50 tokens per call per exchange — chunk if needed
  const CHUNK = 50;
  await Promise.all(
    Object.entries(tokensByExchange).flatMap(([exch, tokens]) => {
      const chunks: string[][] = [];
      for (let i = 0; i < tokens.length; i += CHUNK) {
        chunks.push(tokens.slice(i, i + CHUNK));
      }
      return chunks.map(async (chunk) => {
        try {
          const result = await angelPost(
            "/rest/secure/angelbroking/market/v1/quote/",
            { mode: "LTP", exchangeTokens: { [exch]: chunk } },
          );
          const fetched = result?.data?.fetched;
          if (!Array.isArray(fetched)) return;
          for (const q of fetched) {
            const qTok = q.symbolToken || q.symboltoken;
            const entry = tokenToEntry.get(qTok);
            if (!entry) continue;
            const ltp = Number(q.ltp);
            if (!Number.isFinite(ltp)) continue;
            const cacheKey = `${entry.exchange}:${entry.symbol}`;
            out.set(cacheKey, ltp);
            ltpCache.set(cacheKey, { ltp, fetchedAt: now });
          }
        } catch {
          // swallow — positions with no LTP will fall back to avgPrice on the client
        }
      });
    }),
  );

  return out;
}

/** Margin factor for different product types. Full capital for CNC+options, 20% for intraday. */
function marginFactor(productType: string, isOption: boolean): number {
  if (isOption) return 1; // Pay full option premium
  if (productType === "MIS") return 0.2; // 5x leverage for intraday
  if (productType === "NRML") return 0.2; // F&O normal margin
  return 1; // CNC delivery = full
}

/** Brokerage estimate (₹) — caps at ₹20 per order for F&O, free for CNC. */
function brokerageEstimate(totalValue: number, productType: string, isOption: boolean): number {
  if (isOption) return Math.min(20, totalValue * 0.0003);
  if (productType === "MIS") return Math.min(20, totalValue * 0.0003);
  return 0;
}

/** Returns true if current IST time is within NSE/BSE trading hours (Mon–Fri 9:15–15:30). */
function isMarketOpen(): boolean {
  const utc = Date.now();
  const ist = new Date(utc + 5.5 * 60 * 60 * 1000);
  const day = ist.getUTCDay(); // 0=Sun, 6=Sat in shifted time
  if (day === 0 || day === 6) return false;
  const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30;
}

/** Place a paper trade order with balance deduction/credit. */
export async function placeOrder(params: {
  userId: string;
  symbol: string;
  exchange: string;
  side: "BUY" | "SELL";
  qty: number;
  orderType: "MARKET" | "LIMIT";
  limitPrice?: number;
  productType?: string;
  optionType?: string;
  strikePrice?: number;
  expiry?: string;
}): Promise<{ trade: Trade; newBalance: number }> {
  const {
    userId,
    symbol,
    exchange,
    side,
    qty,
    orderType,
    limitPrice,
    productType = "CNC",
    optionType,
    strikePrice,
    expiry,
  } = params;

  if (qty <= 0) throw new Error("Quantity must be positive");
  if (!isMarketOpen()) throw new Error("Market is closed. Trading hours are Mon–Fri 9:15 AM – 3:30 PM IST.");

  // Get real market price
  let executionPrice: number;
  if (orderType === "MARKET") {
    executionPrice = await fetchLTP(symbol, exchange);
  } else {
    if (!limitPrice || limitPrice <= 0) throw new Error("Limit price required");
    executionPrice = limitPrice;
  }

  const uid = new ObjectId(userId);
  const now = new Date();
  const isOption = !!optionType;
  const totalValue = executionPrice * qty;
  const marginReq = totalValue * marginFactor(productType, isOption);
  const brokerage = brokerageEstimate(totalValue, productType, isOption);

  // Load current user balance
  const db = await getDb();
  const users = db.collection("users");
  const user = await users.findOne({ _id: uid });
  if (!user) throw new Error("User not found");
  const currentBalance = Number(user.tradingBalance ?? 0);

  // BUY: check balance sufficient (margin + brokerage)
  if (side === "BUY") {
    const needed = marginReq + brokerage;
    if (currentBalance < needed) {
      throw new Error(
        `Insufficient balance. Need ₹${needed.toFixed(2)}, available ₹${currentBalance.toFixed(2)}`,
      );
    }
  }

  // SELL: check we have enough holdings/position
  if (side === "SELL") {
    const positions = await positionsCol();
    const existing = await positions.findOne({
      userId: uid,
      symbol,
      exchange,
      side: "BUY",
      ...(optionType ? { optionType, strikePrice, expiry } : {}),
    });

    if (!existing || existing.qty < qty) {
      throw new Error(
        `Insufficient holdings. You have ${existing?.qty || 0} of ${symbol}`,
      );
    }
  }

  const trade: Trade = {
    userId: uid,
    symbol,
    exchange,
    side,
    orderType,
    qty,
    price: executionPrice,
    limitPrice: orderType === "LIMIT" ? limitPrice : undefined,
    status: "EXECUTED",
    productType: productType as any,
    lotSize: 1,
    totalValue,
    segmentKey: "history",
    optionType,
    strikePrice,
    expiry,
    pnl: 0,
    createdAt: now,
    executedAt: now,
  };

  // Insert trade
  const trades = await tradesCol();
  const result = await trades.insertOne(trade);
  trade._id = result.insertedId;

  // Update positions
  await updatePosition(uid, trade);

  // Balance delta: BUY deducts (margin + brokerage), SELL credits (proceeds − brokerage)
  const delta = side === "BUY" ? -(marginReq + brokerage) : totalValue - brokerage;
  const updatedUser = await users.findOneAndUpdate(
    { _id: uid },
    { $inc: { tradingBalance: delta } },
    { returnDocument: "after" },
  );
  const newBalance = Number(updatedUser?.tradingBalance ?? currentBalance + delta);

  return { trade, newBalance };
}

/** Update position after a trade. */
async function updatePosition(userId: ObjectId, trade: Trade) {
  const positions = await positionsCol();
  const key = {
    userId,
    symbol: trade.symbol,
    exchange: trade.exchange,
    ...(trade.optionType
      ? {
          optionType: trade.optionType,
          strikePrice: trade.strikePrice,
          expiry: trade.expiry,
        }
      : { optionType: { $exists: false } }),
  };

  if (trade.side === "BUY") {
    const existing = await positions.findOne(key as any);
    if (existing && existing.side === "BUY") {
      // Average up
      const totalQty = existing.qty + trade.qty;
      const avgPrice =
        (existing.avgPrice * existing.qty + trade.price * trade.qty) / totalQty;
      await positions.updateOne(
        { _id: existing._id },
        { $set: { qty: totalQty, avgPrice, updatedAt: new Date() } },
      );
    } else {
      // New position
      await positions.insertOne({
        userId,
        symbol: trade.symbol,
        exchange: trade.exchange,
        side: "BUY",
        qty: trade.qty,
        avgPrice: trade.price,
        productType: trade.productType,
        lotSize: trade.lotSize,
        optionType: trade.optionType,
        strikePrice: trade.strikePrice,
        expiry: trade.expiry,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  } else {
    // SELL — reduce position
    const existing = await positions.findOne({
      userId,
      symbol: trade.symbol,
      exchange: trade.exchange,
      side: "BUY",
      ...(trade.optionType
        ? {
            optionType: trade.optionType,
            strikePrice: trade.strikePrice,
            expiry: trade.expiry,
          }
        : {}),
    });

    if (existing) {
      const remainingQty = existing.qty - trade.qty;
      if (remainingQty <= 0) {
        await positions.deleteOne({ _id: existing._id });
      } else {
        await positions.updateOne(
          { _id: existing._id },
          { $set: { qty: remainingQty, updatedAt: new Date() } },
        );
      }

      // Record P&L on the trade
      const pnl = (trade.price - existing.avgPrice) * trade.qty;
      const trades = await tradesCol();
      await trades.updateOne({ _id: trade._id }, { $set: { pnl } });
    }
  }
}

/**
 * Translate admin "Orders & positions" panel productType (Delivery/Intraday/F&O)
 * into the trade engine's enum (CNC/MIS/NRML). Pass-through for already-correct values.
 */
function mapAdminProductType(p?: string): string {
  if (!p) return "CNC";
  const upper = p.toUpperCase();
  if (upper === "DELIVERY") return "CNC";
  if (upper === "INTRADAY") return "MIS";
  if (upper === "F&O" || upper === "FNO") return "NRML";
  return upper;
}

/**
 * Pick the first numeric value that is finite and non-zero. Admin form
 * defaults all numeric fields to 0, so `??` won't fall through — use this
 * helper to skip past `0` defaults to whichever field admin actually set.
 */
function firstNonZero(...vals: Array<number | string | undefined | null>): number {
  for (const v of vals) {
    const n = Number(v);
    if (Number.isFinite(n) && n !== 0) return n;
  }
  return 0;
}

function computeAdminPnl(row: OrderRowEffective): number {
  if (row.pnlManual && Number.isFinite(row.pnl)) return Number(row.pnl);
  const lots = firstNonZero(row.lots, row.qty);
  const buy = firstNonZero(row.buyPrice, row.avgPrice);
  const sell = firstNonZero(row.sellPrice, row.ltp);
  return row.side === "SELL" ? (buy - sell) * lots : (sell - buy) * lots;
}

/** Map an admin scoped-config row into the position/holding view shape. */
function mapAdminRowToPositionView(row: OrderRowEffective) {
  const qty = firstNonZero(row.qty, row.lots);
  const avgPrice = firstNonZero(row.avgPrice, row.buyPrice, row.orderPrice);
  const ltp = firstNonZero(row.ltp, avgPrice);
  const pnl = computeAdminPnl(row);
  const investedValue = avgPrice * qty;
  const currentValue = ltp * qty;
  const pnlPct =
    investedValue > 0 ? (pnl / investedValue) * 100 : Number(row.pnlPct ?? 0);
  return {
    id: `admin:${row.id}`,
    symbol: row.symbol,
    exchange: row.exchange || row.market || "NSE",
    side: row.side,
    qty,
    avgPrice,
    ltp,
    pnl,
    pnlPct,
    pnlOverridden: !!row.pnlManual,
    currentValue,
    investedValue,
    productType: mapAdminProductType(row.productType),
    lotSize: 1,
    optionType: row.optionType,
    strikePrice: row.strikePrice,
    expiry: row.expiryDate,
  };
}

/** Map an admin scoped-config row into a trade-history view shape. */
function mapAdminRowToTradeView(row: OrderRowEffective) {
  const qty = firstNonZero(row.qty, row.lots);
  const price =
    row.side === "SELL"
      ? firstNonZero(row.sellPrice, row.avgPrice, row.ltp)
      : firstNonZero(row.buyPrice, row.avgPrice, row.ltp);
  const totalValue = price * qty;
  let createdAt: Date | undefined;
  if (row.time) {
    const d = new Date(row.time);
    if (!isNaN(d.getTime())) createdAt = d;
  }
  return {
    id: `admin:${row.id}`,
    symbol: row.symbol,
    exchange: row.exchange || row.market || "NSE",
    side: row.side,
    qty,
    price,
    orderType: "MARKET" as const,
    status: row.status === "OPEN" ? ("PENDING" as const) : ("EXECUTED" as const),
    productType: mapAdminProductType(row.productType),
    totalValue,
    pnl: computeAdminPnl(row),
    pnlOverridden: !!row.pnlManual,
    optionType: row.optionType,
    strikePrice: row.strikePrice,
    expiry: row.expiryDate,
    createdAt,
    executedAt: row.status === "OPEN" ? undefined : createdAt,
  };
}

async function loadAdminRowsForUser(
  userId: string,
): Promise<OrderRowEffective[]> {
  try {
    const effective = await getEffectiveOrdersConfigForUser(userId);
    const rows = Array.isArray(effective.orders) ? effective.orders : [];
    const segCounts: Record<string, number> = {};
    for (const r of rows) {
      const k = r.segmentKey || "positions";
      segCounts[k] = (segCounts[k] ?? 0) + 1;
    }
    console.log(
      "[trades:bridge] loadAdminRowsForUser",
      JSON.stringify({
        userId,
        rowCount: rows.length,
        segCounts,
        ids: rows.map((r) => r.id),
      }),
    );
    return rows;
  } catch (err) {
    console.error("[trades:bridge] loadAdminRowsForUser failed:", err);
    return [];
  }
}

/** Real positions only (no admin overlay). Used by the admin panel GET. */
export async function getRealPositions(userId: string) {
  const positions = await positionsCol();
  const docs = await positions
    .find({ userId: new ObjectId(userId) })
    .sort({ updatedAt: -1 })
    .toArray();

  if (!docs.length) return [];

  const ltpMap = await fetchLTPsBatch(
    docs.map((p) => ({ symbol: p.symbol, exchange: p.exchange })),
  );

  return docs.map((pos) => {
    const ltp = ltpMap.get(`${pos.exchange}:${pos.symbol}`) ?? pos.avgPrice;
    const computedPnl = (ltp - pos.avgPrice) * pos.qty;
    const hasOverride =
      pos.pnlOverride !== null &&
      pos.pnlOverride !== undefined &&
      Number.isFinite(pos.pnlOverride);
    const pnl = hasOverride ? Number(pos.pnlOverride) : computedPnl;
    const investedValue = pos.avgPrice * pos.qty;
    const pctOverride =
      pos.pnlPctOverride !== null &&
      pos.pnlPctOverride !== undefined &&
      Number.isFinite(pos.pnlPctOverride);
    const pnlPct = pctOverride
      ? Number(pos.pnlPctOverride)
      : investedValue > 0
        ? (pnl / investedValue) * 100
        : 0;
    return {
      ...pos,
      id: pos._id?.toString(),
      ltp,
      pnl,
      pnlPct,
      pnlOverridden: hasOverride,
      currentValue: ltp * pos.qty,
      investedValue,
    };
  });
}

/** Get user's open positions with live P&L (real + admin scoped-config rows). */
export async function getPositions(userId: string) {
  const real = await getRealPositions(userId);
  const adminRows = await loadAdminRowsForUser(userId);
  const adminPositions = adminRows
    .filter((r) => (r.segmentKey || "positions") === "positions")
    .map(mapAdminRowToPositionView);
  console.log(
    "[trades:bridge] getPositions",
    JSON.stringify({
      userId,
      realCount: real.length,
      adminTotal: adminRows.length,
      adminPositionsCount: adminPositions.length,
      adminPositions: adminPositions.map((p) => ({
        id: p.id,
        symbol: p.symbol,
        side: p.side,
        qty: p.qty,
        avgPrice: p.avgPrice,
        ltp: p.ltp,
      })),
    }),
  );
  return [...real, ...adminPositions];
}

/** Get user's trade history (real + admin scoped-config rows). */
export async function getTradeHistory(userId: string, limit = 50) {
  const trades = await tradesCol();
  const realDocs = await trades
    .find({ userId: new ObjectId(userId) })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  const real = realDocs.map((t) => {
    const hasOverride =
      t.pnlOverride !== null &&
      t.pnlOverride !== undefined &&
      Number.isFinite(t.pnlOverride);
    return {
      ...t,
      id: t._id?.toString(),
      pnl: hasOverride ? Number(t.pnlOverride) : t.pnl,
      pnlOverridden: hasOverride,
    };
  });

  const adminRows = await loadAdminRowsForUser(userId);
  const adminTrades = adminRows.map(mapAdminRowToTradeView);

  console.log(
    "[trades:bridge] getTradeHistory",
    JSON.stringify({
      userId,
      realCount: real.length,
      adminCount: adminTrades.length,
    }),
  );
  return [...real, ...adminTrades];
}

/** Get holdings (long positions in CNC) — real + admin "Delivery/CNC BUY" rows. */
export async function getHoldings(userId: string) {
  console.log("[trades:bridge] getHoldings start", { userId });
  const positions = await positionsCol();
  const docs = await positions
    .find({
      userId: new ObjectId(userId),
      side: "BUY",
      productType: "CNC",
    })
    .sort({ updatedAt: -1 })
    .toArray();

  const ltpMap = docs.length
    ? await fetchLTPsBatch(
        docs.map((p) => ({ symbol: p.symbol, exchange: p.exchange })),
      )
    : new Map<string, number>();

  const real = docs.map((pos) => {
    const ltp = ltpMap.get(`${pos.exchange}:${pos.symbol}`) ?? pos.avgPrice;
    const computedPnl = (ltp - pos.avgPrice) * pos.qty;
    const hasOverride =
      pos.pnlOverride !== null &&
      pos.pnlOverride !== undefined &&
      Number.isFinite(pos.pnlOverride);
    const pnl = hasOverride ? Number(pos.pnlOverride) : computedPnl;
    const investedValue = pos.avgPrice * pos.qty;
    const pctOverride =
      pos.pnlPctOverride !== null &&
      pos.pnlPctOverride !== undefined &&
      Number.isFinite(pos.pnlPctOverride);
    const pnlPct = pctOverride
      ? Number(pos.pnlPctOverride)
      : investedValue > 0
        ? (pnl / investedValue) * 100
        : 0;
    return {
      ...pos,
      id: pos._id?.toString(),
      ltp,
      pnl,
      pnlPct,
      pnlOverridden: hasOverride,
      currentValue: ltp * pos.qty,
      investedValue,
    };
  });

  const adminRows = await loadAdminRowsForUser(userId);
  // Filter by segmentKey (same strategy as getPositions) to prevent a row from
  // appearing in both positions and holdings and doubling the P&L total.
  const adminHoldings = adminRows
    .filter((r) => r.segmentKey === "holdings")
    .map(mapAdminRowToPositionView);

  console.log(
    "[trades:bridge] getHoldings",
    JSON.stringify({
      userId,
      realCount: real.length,
      adminTotal: adminRows.length,
      adminHoldingsCount: adminHoldings.length,
    }),
  );
  return [...real, ...adminHoldings];
}
