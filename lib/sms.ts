/**
 * Renflair SMS sender — sends OTP via HTTP GET.
 * Docs: https://sms.renflair.in/V1.php?API=…&PHONE=…&OTP=…
 * Expects RENFLAIR_API_KEY in the environment.
 */

function normalizePhone(phone: string): string {
  // Strip non-digits. Assume Indian numbers; Renflair expects raw 10-digit or 91XXXXXXXXXX.
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 13 && digits.startsWith("091")) return digits.slice(3);
  return digits;
}

export async function sendSmsOtp(phone: string, otp: string): Promise<void> {
  const apiKey = (process.env.RENFLAIR_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error(
      "SMS provider is not configured (set RENFLAIR_API_KEY in .env).",
    );
  }
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone || normalizedPhone.length < 10) {
    throw new Error("Invalid phone number");
  }

  const params = new URLSearchParams({
    API: apiKey,
    PHONE: normalizedPhone,
    OTP: otp,
  });
  const url = `https://sms.renflair.in/V1.php?${params.toString()}`;

  const res = await fetch(url, { method: "GET" });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`SMS provider error (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
  try {
    const data = JSON.parse(text) as { status?: string; message?: string };
    if (
      data.status &&
      !["success", "ok", "sent"].includes(String(data.status).toLowerCase())
    ) {
      throw new Error(data.message || `SMS provider returned status ${data.status}`);
    }
  } catch {
    // Non-JSON response — Renflair occasionally returns plain text; treat 200 as success.
  }
}
