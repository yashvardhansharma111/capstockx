import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongodb";
import { verifyOtp, clearVerification } from "@/lib/otp-store";

export async function POST(request: Request) {
  try {
    const { email, otp, newPassword } = (await request.json()) as {
      email?: string;
      otp?: string;
      newPassword?: string;
    };

    if (!email?.trim() || !otp?.trim() || !newPassword?.trim()) {
      return NextResponse.json({ message: "Email, code, and new password are required." }, { status: 400 });
    }
    if (newPassword.trim().length < 6) {
      return NextResponse.json({ message: "Password must be at least 6 characters." }, { status: 400 });
    }

    const result = verifyOtp("email", email.trim().toLowerCase(), otp.trim());
    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: 400 });
    }

    const db = await getDb();
    const hashed = await bcrypt.hash(newPassword.trim(), 10);
    const update = await db.collection("users").updateOne(
      { email: email.trim().toLowerCase() },
      { $set: { passwordHash: hashed } },
    );

    if (update.matchedCount === 0) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    clearVerification("email", email.trim().toLowerCase());

    return NextResponse.json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("[reset-password]", error);
    return NextResponse.json({ message: "Failed to reset password." }, { status: 500 });
  }
}
