import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getPositions } from "@/lib/trades";

/**
 * GET /api/trades/positions — user's open positions with live P&L.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      console.log("[trades/positions] unauthorized — no user from request");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = user._id.toString();
    console.log("[trades/positions] request from", { userId });
    const positions = await getPositions(userId);
    console.log(
      "[trades/positions] returning",
      JSON.stringify({ userId, count: positions.length }),
    );

    const totalInvested = positions.reduce((s, p) => s + p.investedValue, 0);
    const totalCurrent = positions.reduce((s, p) => s + p.currentValue, 0);
    // Sum per-row P&L. Admin-config rows compute pnl from buy/sell deltas (not
    // ltp − avg), so deriving the total from currentValue − investedValue would
    // miss their contribution. Real positions still match either way.
    const totalPnl = positions.reduce((s, p) => s + (p.pnl || 0), 0);
    const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

    return NextResponse.json({
      positions: positions.map((p) => ({
        id: p.id,
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
        productType: p.productType,
        optionType: p.optionType,
        strikePrice: p.strikePrice,
        expiry: p.expiry,
      })),
      summary: {
        totalInvested,
        totalCurrent,
        totalPnl,
        totalPnlPct,
        count: positions.length,
      },
    });
  } catch (err: any) {
    console.error("[trades/positions]", err);
    return NextResponse.json(
      { message: err.message || "Failed to load positions" },
      { status: 500 },
    );
  }
}
