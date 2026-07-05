import { createHash } from "crypto";
import { apiErrorResponse } from "@/lib/api-error";
import { getDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";

function hashPin(pin: string): string {
  return createHash("sha256").update(pin.trim()).digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pin } = body || {};

    if (!pin) {
      return NextResponse.json(
        { message: "PIN is required" },
        { status: 400 },
      );
    }

    // Check DB-stored PIN first (set via admin panel), fall back to env var
    const db = await getDb();
    const pinDoc = await db
      .collection("settings")
      .findOne<{ value?: string }>({ key: "admin_pin" });

    let valid: boolean;
    if (pinDoc?.value) {
      valid = pinDoc.value === hashPin(pin);
    } else {
      const adminPin = process.env.ADMIN_PIN;
      if (!adminPin) {
        console.error("ADMIN_PIN is not set in environment");
        return NextResponse.json(
          { message: "Admin PIN is not configured on server" },
          { status: 500 },
        );
      }
      valid = pin === adminPin;
    }

    if (!valid) {
      const correctPin = pinDoc?.value
        ? process.env.ADMIN_PIN ?? "(check DB)"
        : (process.env.ADMIN_PIN ?? "(not set)");
      console.log(`[admin-login] wrong PIN entered — you tried: "${pin}" | correct PIN: "${correctPin}"`);
      return NextResponse.json(
        { message: "Invalid admin PIN" },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ message: "Admin authenticated" });
    response.cookies.set("ajx_admin", "ok", {
      httpOnly: true,
      sameSite: "strict",
      maxAge: 2 * 60 * 60, // 2 hours
      path: "/",
    });

    return response;
  } catch (error) {
    return apiErrorResponse(
      error,
      "Admin login error:",
      "Something went wrong while authenticating admin",
    );
  }
}

