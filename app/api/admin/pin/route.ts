import { createHash } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { getDb } from "@/lib/mongodb";

const KEY = "admin_pin";

function hashPin(pin: string): string {
  return createHash("sha256").update(pin.trim()).digest("hex");
}

async function verifyCurrentPin(pin: string): Promise<boolean> {
  const db = await getDb();
  const doc = await db.collection("settings").findOne<{ value?: string }>({ key: KEY });
  if (doc?.value) {
    return doc.value === hashPin(pin);
  }
  // No DB record — fall back to env var (plain text)
  return pin.trim() === process.env.ADMIN_PIN;
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("ajx_admin");
  if (!adminCookie || adminCookie.value !== "ok") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { currentPin, newPin } = body || {};

    if (!currentPin || !newPin) {
      return NextResponse.json(
        { message: "Current PIN and new PIN are required" },
        { status: 400 },
      );
    }
    if (String(newPin).length < 4) {
      return NextResponse.json(
        { message: "New PIN must be at least 4 characters" },
        { status: 400 },
      );
    }

    const valid = await verifyCurrentPin(String(currentPin));
    if (!valid) {
      return NextResponse.json({ message: "Current PIN is incorrect" }, { status: 401 });
    }

    const db = await getDb();
    await db.collection("settings").updateOne(
      { key: KEY },
      { $set: { key: KEY, value: hashPin(String(newPin)), updatedAt: new Date() } },
      { upsert: true },
    );

    console.log("[admin/pin] PIN updated successfully");
    return NextResponse.json({ message: "PIN updated successfully" });
  } catch (error) {
    return apiErrorResponse(error, "Change PIN error:", "Failed to update PIN");
  }
}
