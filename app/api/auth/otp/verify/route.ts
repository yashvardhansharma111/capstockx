import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { verifyOtp, type OtpTarget } from "@/lib/otp-store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      target?: OtpTarget;
      value?: string;
      otp?: string;
    };
    const target = body?.target;
    const value = (body?.value || "").toString().trim();
    const otp = (body?.otp || "").toString().trim();

    if (target !== "phone" && target !== "email") {
      return NextResponse.json(
        { message: "target must be 'phone' or 'email'" },
        { status: 400 },
      );
    }
    if (!value || !otp) {
      return NextResponse.json(
        { message: "value and otp are required" },
        { status: 400 },
      );
    }
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { message: "OTP must be a 6-digit number" },
        { status: 400 },
      );
    }

    const result = verifyOtp(target, value, otp);
    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: 400 });
    }

    return NextResponse.json({ verified: true, message: result.message });
  } catch (error) {
    return apiErrorResponse(
      error,
      "OTP verify error:",
      "Could not verify OTP. Please try again.",
    );
  }
}
