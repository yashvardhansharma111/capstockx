import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { generateOtp, storeOtp, type OtpTarget } from "@/lib/otp-store";
import { sendOtpEmail } from "@/lib/mailer";
import { sendSmsOtp } from "@/lib/sms";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      target?: OtpTarget;
      value?: string;
    };
    const target = body?.target;
    const value = (body?.value || "").toString().trim();

    if (target !== "phone" && target !== "email") {
      return NextResponse.json(
        { message: "target must be 'phone' or 'email'" },
        { status: 400 },
      );
    }
    if (!value) {
      return NextResponse.json(
        {
          message:
            target === "phone"
              ? "Phone number is required"
              : "Email is required",
        },
        { status: 400 },
      );
    }
    if (target === "email" && !/^\S+@\S+\.\S+$/.test(value)) {
      return NextResponse.json(
        { message: "Invalid email address" },
        { status: 400 },
      );
    }
    if (target === "phone" && value.replace(/\D/g, "").length < 10) {
      return NextResponse.json(
        { message: "Invalid phone number" },
        { status: 400 },
      );
    }

    const otp = generateOtp();
    storeOtp(target, value, otp);

    if (target === "phone") {
      await sendSmsOtp(value, otp);
    } else {
      await sendOtpEmail({ to: value, otp });
    }

    return NextResponse.json({
      message: `OTP sent to your ${target}. Please check and enter the 6-digit code.`,
    });
  } catch (error) {
    return apiErrorResponse(
      error,
      "OTP send error:",
      "Could not send OTP. Please try again.",
    );
  }
}
