import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

type FundPaymentMeta = {
  upiId?: string | null;
  bankName?: string | null;
  accountHolder?: string | null;
  accountNumber?: string | null;
  ifsc?: string | null;
};

export async function GET(request: Request) {
  console.log("\n========== [fund-qr] GET ==========");
  console.log("[fund-qr] headers:", {
    host: request.headers.get("host"),
    userAgent: request.headers.get("user-agent"),
    referer: request.headers.get("referer"),
  });

  try {
    const db = await getDb();
    const settings = db.collection("settings");

    const imgDoc = await settings.findOne<{ value?: { data?: unknown } }>({
      key: "fund_qr_image",
    });
    const metaDoc = await settings.findOne<{ value?: FundPaymentMeta }>({
      key: "fund_payment_meta",
    });

    console.log("[fund-qr] imgDoc found:", !!imgDoc?.value?.data);
    console.log("[fund-qr] metaDoc raw:", JSON.stringify(metaDoc?.value ?? null));

    const meta = metaDoc?.value || null;
    console.log("[fund-qr] paymentMeta being sent:", {
      upiId: meta?.upiId ?? "MISSING",
      accountHolder: meta?.accountHolder ?? "MISSING",
      bankName: meta?.bankName ?? "MISSING",
      accountNumber: meta?.accountNumber ?? "MISSING",
      ifsc: meta?.ifsc ?? "MISSING",
    });

    if (imgDoc?.value?.data) {
      console.log("[fund-qr] response: qrUrl=/api/config/fund-qr-image (image stored in DB)");
      return NextResponse.json({
        qrUrl: "/api/config/fund-qr-image",
        paymentMeta: meta,
      });
    }

    const doc = await settings.findOne<{ value?: string }>({
      key: "fund_qr_url",
    });

    console.log("[fund-qr] qrUrl from DB:", doc?.value ?? "null (no QR configured)");
    console.log("[fund-qr] response sent ✓");
    console.log("=========================================\n");

    return NextResponse.json({
      qrUrl: doc?.value || null,
      paymentMeta: meta,
    });
  } catch (error) {
    console.error("[fund-qr] ERROR:", error);
    return NextResponse.json(
      { message: "Failed to load config" },
      { status: 500 },
    );
  }
}
