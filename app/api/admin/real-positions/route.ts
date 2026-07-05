import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { apiErrorResponse } from "@/lib/api-error";
import { getDb } from "@/lib/mongodb";
import { getPositions, getTradeHistory } from "@/lib/trades";
import {
  getEffectiveOrdersConfigForUser,
  type OrderRowEffective,
  type OrdersConfigEffective,
} from "@/lib/effective-orders-config";
import {
  readScopedConfig,
  upsertScopedConfig,
} from "@/lib/scoped-config";

type RowKind =
  | "real-position"
  | "real-trade"
  | "admin-position"
  | "admin-trade";

const ORDERS_KEY = "dashboard_orders";

async function ensureAdmin() {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("ajx_admin");
  return !!adminCookie && adminCookie.value === "ok";
}

function isAdminId(id: unknown): id is string {
  return typeof id === "string" && id.startsWith("admin:");
}

function stripAdminPrefix(id: string): string {
  return id.startsWith("admin:") ? id.slice("admin:".length) : id;
}

/**
 * GET /api/admin/real-positions?scopeUserId=…
 *
 * Returns everything the user sees on the mobile Orders screen:
 * – real positions placed via the mobile app (`kind: "real-position"`)
 * – admin-config rows from /admin/orders (`kind: "admin-*"`)
 * – the user's recent trade history (real + admin-config) for override.
 */
export async function GET(request: Request) {
  try {
    if (!(await ensureAdmin())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const url = new URL(request.url);
    const scopeUserId = url.searchParams.get("scopeUserId") || "";
    if (!scopeUserId || !ObjectId.isValid(scopeUserId)) {
      return NextResponse.json(
        { message: "scopeUserId is required" },
        { status: 400 },
      );
    }

    const [positions, trades] = await Promise.all([
      getPositions(scopeUserId),
      getTradeHistory(scopeUserId, 100),
    ]);

    return NextResponse.json({
      positions: positions.map((p) => {
        const adminRow = isAdminId(p.id);
        return {
          id: p.id,
          kind: (adminRow ? "admin-position" : "real-position") as RowKind,
          symbol: p.symbol,
          exchange: p.exchange,
          side: p.side,
          qty: p.qty,
          avgPrice: p.avgPrice,
          ltp: p.ltp,
          pnl: p.pnl,
          pnlPct: p.pnlPct,
          currentValue: p.currentValue,
          investedValue: p.investedValue,
          pnlOverridden: !!p.pnlOverridden,
        };
      }),
      trades: trades.map((t) => {
        const adminRow = isAdminId(t.id);
        return {
          id: t.id,
          kind: (adminRow ? "admin-trade" : "real-trade") as RowKind,
          symbol: t.symbol,
          exchange: t.exchange,
          side: t.side,
          qty: t.qty,
          price: t.price,
          productType: t.productType,
          status: t.status,
          pnl: t.pnl,
          pnlOverridden: !!(t as { pnlOverridden?: boolean }).pnlOverridden,
          createdAt: t.createdAt,
          executedAt: t.executedAt,
        };
      }),
    });
  } catch (error) {
    return apiErrorResponse(
      error,
      "Admin real-positions GET error:",
      "Failed to load positions",
    );
  }
}

async function updateAdminOrderRow(
  scopeUserId: string,
  rawRowId: string,
  pnlOverride: number | null,
): Promise<{ ok: boolean; message?: string }> {
  const rowId = stripAdminPrefix(rawRowId);

  // Read the user's override doc if it exists; otherwise we'll seed it from
  // the effective (global-merged) config so the row is present to edit.
  const userScoped = await readScopedConfig<OrdersConfigEffective>({
    key: ORDERS_KEY,
    userId: scopeUserId,
    fallback: {
      summary: { dayPnl: 0, totalPnl: 0 },
      segments: [],
      orders: [],
      showOptionType: undefined,
      showSide: undefined,
    },
  });

  let working: OrdersConfigEffective;
  if (userScoped.source === "user") {
    working = userScoped.config;
  } else {
    working = await getEffectiveOrdersConfigForUser(scopeUserId);
  }

  if (!Array.isArray(working.orders) || working.orders.length === 0) {
    return { ok: false, message: "No admin orders config to update" };
  }

  const idx = working.orders.findIndex((r) => r.id === rowId);
  if (idx < 0) {
    // Row may live only in global; pull it in from the effective config.
    const eff = await getEffectiveOrdersConfigForUser(scopeUserId);
    const fromGlobal = eff.orders.find((r) => r.id === rowId);
    if (!fromGlobal) {
      return { ok: false, message: "Order row not found" };
    }
    working = {
      ...working,
      orders: [...working.orders, fromGlobal],
    };
  }

  const targetIdx = working.orders.findIndex((r) => r.id === rowId);
  if (targetIdx < 0) {
    return { ok: false, message: "Order row not found" };
  }

  const target: OrderRowEffective = { ...working.orders[targetIdx] };
  if (pnlOverride === null) {
    target.pnlManual = false;
  } else {
    target.pnl = pnlOverride;
    target.pnlManual = true;
  }
  working.orders = [
    ...working.orders.slice(0, targetIdx),
    target,
    ...working.orders.slice(targetIdx + 1),
  ];

  await upsertScopedConfig({
    key: ORDERS_KEY,
    userId: scopeUserId,
    config: working,
  });

  return { ok: true };
}

/**
 * PATCH /api/admin/real-positions
 * Body:
 *   { kind: "real-position" | "real-trade",  id, pnlOverride: number | null, pnlPctOverride? }
 *   { kind: "admin-position" | "admin-trade", id, scopeUserId, pnlOverride: number | null }
 *
 * Empty `pnlOverride` (null) clears the override:
 *  - for real rows: removes the field via $unset → live computation resumes.
 *  - for admin rows: sets `pnlManual=false` → derived computation resumes.
 */
export async function PATCH(request: Request) {
  try {
    if (!(await ensureAdmin())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const body = (await request.json()) as {
      kind?: RowKind;
      id?: string;
      scopeUserId?: string;
      pnlOverride?: number | null;
      pnlPctOverride?: number | null;
    };
    const { kind, id } = body;
    if (
      kind !== "real-position" &&
      kind !== "real-trade" &&
      kind !== "admin-position" &&
      kind !== "admin-trade"
    ) {
      return NextResponse.json(
        { message: "Invalid kind" },
        { status: 400 },
      );
    }
    if (!id) {
      return NextResponse.json(
        { message: "id is required" },
        { status: 400 },
      );
    }

    const pnlOverrideRaw = body.pnlOverride;
    let pnlOverride: number | null;
    if (pnlOverrideRaw === null) {
      pnlOverride = null;
    } else if (pnlOverrideRaw === undefined) {
      return NextResponse.json(
        { message: "pnlOverride is required" },
        { status: 400 },
      );
    } else {
      const n = Number(pnlOverrideRaw);
      if (!Number.isFinite(n)) {
        return NextResponse.json(
          { message: "pnlOverride must be a finite number or null" },
          { status: 400 },
        );
      }
      pnlOverride = n;
    }

    if (kind === "admin-position" || kind === "admin-trade") {
      const scopeUserId = (body.scopeUserId || "").toString();
      if (!scopeUserId || !ObjectId.isValid(scopeUserId)) {
        return NextResponse.json(
          { message: "scopeUserId is required for admin rows" },
          { status: 400 },
        );
      }
      const result = await updateAdminOrderRow(scopeUserId, id, pnlOverride);
      if (!result.ok) {
        return NextResponse.json(
          { message: result.message || "Failed to update admin row" },
          { status: 400 },
        );
      }
      return NextResponse.json({ message: "Override saved", kind, id });
    }

    // Real position / real trade — write to mongo doc.
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Valid id is required" },
        { status: 400 },
      );
    }
    const set: Record<string, unknown> = {};
    const unset: Record<string, "" | true> = {};
    if (pnlOverride === null) {
      unset.pnlOverride = "";
    } else {
      set.pnlOverride = pnlOverride;
    }
    if (kind === "real-position") {
      const pctVal = body.pnlPctOverride;
      if (pctVal === null) {
        unset.pnlPctOverride = "";
      } else if (pctVal !== undefined) {
        const n = Number(pctVal);
        if (!Number.isFinite(n)) {
          return NextResponse.json(
            { message: "pnlPctOverride must be a number or null" },
            { status: 400 },
          );
        }
        set.pnlPctOverride = n;
      }
    }

    if (Object.keys(set).length === 0 && Object.keys(unset).length === 0) {
      return NextResponse.json(
        { message: "No changes provided" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const collection = db.collection(
      kind === "real-position" ? "positions" : "trades",
    );
    const update: Record<string, unknown> = {};
    if (Object.keys(set).length) update.$set = { ...set, updatedAt: new Date() };
    if (Object.keys(unset).length) update.$unset = unset;

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      update,
    );
    if (result.matchedCount === 0) {
      return NextResponse.json(
        {
          message:
            kind === "real-position" ? "Position not found" : "Trade not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "Override saved", kind, id });
  } catch (error) {
    return apiErrorResponse(
      error,
      "Admin real-positions PATCH error:",
      "Failed to save override",
    );
  }
}
