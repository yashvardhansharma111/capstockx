import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { generateOtp, storeOtp } from "@/lib/otp-store";
import { sendOtpEmail } from "@/lib/mailer";

export async function POST(request: Request) {
  try {
    const { email } = (await request.json()) as { email?: string };
    if (!email?.trim()) {
      return NextResponse.json({ message: "Email is required." }, { status: 400 });
    }

    const db = await getDb();
    const user = await db.collection("users").findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      // Don't reveal whether email exists
      return NextResponse.json({ message: "If that email is registered, a code has been sent." });
    }

    const otp = generateOtp();
    storeOtp("email", email.trim().toLowerCase(), otp);

    await sendOtpEmail({ to: email.trim(), otp });

    return NextResponse.json({ message: "If that email is registered, a code has been sent." });
  } catch (error) {
    console.error("[forgot-password]", error);
    return NextResponse.json({ message: "Failed to send reset code." }, { status: 500 });
  }
}
