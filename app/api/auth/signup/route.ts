import { apiErrorResponse } from "@/lib/api-error";
import { getDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fullName = (body?.fullName ?? "").toString().trim();
    const email = (body?.email ?? "").toString().trim().toLowerCase();
    const phone = (body?.phone ?? "").toString().trim();
    const password = (body?.password ?? "").toString();

    if (!fullName || !email || !phone || !password) {
      return NextResponse.json(
        { message: "Full name, email, phone and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const users = db.collection("users");

    const existing = await users.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { message: "Email already registered" },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await users.insertOne({
      fullName,
      email,
      phone,
      status: "pending",
      createdAt: new Date(),
      passwordHash,
      tradingBalance: 0,
      margin: 0,
    });

    return NextResponse.json(
      {
        message:
          "Signup received. Your account is pending admin approval — you'll be able to sign in once approved.",
      },
      { status: 201 },
    );
  } catch (error) {
    return apiErrorResponse(
      error,
      "Signup error:",
      "Something went wrong while signing up",
    );
  }
}
