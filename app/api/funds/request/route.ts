import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 },
      );
    }

    const db = await getDb();
    const funds = db.collection("fund_requests");

    const requests = await funds
      .find({ userId: new ObjectId((user as { _id: ObjectId })._id) })
      .sort({ createdAt: -1 })
      .limit(25)
      .toArray();

    return NextResponse.json({
      requests: requests.map((item) => ({
        _id: item._id,
        type: item.type || "add",
        amount: item.amount,
        method: item.method || "upi",
        reference: item.reference || "",
        note: item.note || "",
        status: item.status || "pending",
        createdAt: item.createdAt,
        processedAt: item.processedAt || null,
      })),
    });
  } catch (error) {
    console.error("Fund request list error:", error);
    return NextResponse.json(
      { message: "Failed to load fund requests" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  console.log("\n========== [funds/request] POST ==========");
  console.log("[funds/request] headers:", {
    host: request.headers.get("host"),
    userAgent: request.headers.get("user-agent"),
    contentType: request.headers.get("content-type"),
  });

  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      console.log("[funds/request] REJECTED: not authenticated");
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 },
      );
    }

    console.log("[funds/request] user:", {
      id: (user as { _id: ObjectId })._id,
      clientId: (user as { clientId?: string }).clientId ?? "n/a",
    });

    const body = await request.json();
    const { amount, method, reference, note, type } = body || {};

    console.log("[funds/request] body received:", {
      type,
      amount,
      method,
      reference: reference || "(empty)",
      note: note || "(empty)",
    });

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      console.log("[funds/request] REJECTED: invalid amount →", amount);
      return NextResponse.json(
        { message: "Valid amount is required" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const funds = db.collection("fund_requests");
    const users = db.collection("users");
    const requestType = type === "withdraw" ? "withdraw" : "add";

    console.log("[funds/request] requestType:", requestType);

    if (requestType === "withdraw") {
      const currentUser = await users.findOne<{
        tradingBalance?: number;
      }>({ _id: new ObjectId((user as { _id: ObjectId })._id) });
      const currentBalance = Number(currentUser?.tradingBalance ?? 0);
      console.log("[funds/request] withdraw check: balance=", currentBalance, "requested=", numericAmount);
      if (numericAmount > currentBalance) {
        console.log("[funds/request] REJECTED: insufficient balance");
        return NextResponse.json(
          { message: "Withdrawal amount cannot exceed current trading balance" },
          { status: 400 },
        );
      }
    }

    const result = await funds.insertOne({
      userId: new ObjectId((user as { _id: ObjectId })._id),
      type: requestType,
      amount: numericAmount,
      method: method || "upi",
      reference: reference || "",
      note: note || "",
      status: "pending",
      createdAt: new Date(),
    });

    console.log("[funds/request] inserted document id:", result.insertedId.toString());
    console.log("[funds/request] SUCCESS ✓");
    console.log("===========================================\n");

    return NextResponse.json({
      message:
        requestType === "withdraw"
          ? "Withdraw request submitted. Broker will verify and process your withdrawal."
          : "Fund request submitted. Broker will verify payment and update your balance.",
    });
  } catch (error) {
    console.error("[funds/request] ERROR:", error);
    return NextResponse.json(
      { message: "Failed to submit fund request" },
      { status: 500 },
    );
  }
}
