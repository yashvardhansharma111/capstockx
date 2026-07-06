"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiKey, FiLock, FiMail, FiPhone, FiUser } from "react-icons/fi";
import { useAppData } from "@/components/app/AppDataContext";

function Field({
  label,
  icon: Icon,
  value,
  onChange,
  type = "text",
  placeholder,
  autoCapitalize,
}: {
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoCapitalize?: string;
}) {
  return (
    <div className="px-4 py-4">
      <p
        className="mb-2 text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: "var(--ax-text-secondary)" }}
      >
        {label}
      </p>
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: "var(--ax-primary-muted)" }}
        >
          <Icon className="h-4 w-4" style={{ color: "var(--ax-primary)" }} />
        </div>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoCapitalize={autoCapitalize}
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: "var(--ax-text-primary)" }}
        />
      </div>
    </div>
  );
}

export default function EditProfilePage() {
  const router = useRouter();
  const { user, refresh } = useAppData();

  // Profile fields
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Forgot password flow
  const [fpEmail, setFpEmail] = useState(user?.email || "");
  const [fpCode, setFpCode] = useState("");
  const [fpNewPassword, setFpNewPassword] = useState("");
  const [fpConfirm, setFpConfirm] = useState("");
  const [fpStep, setFpStep] = useState<"idle" | "sent">("idle");
  const [fpLoading, setFpLoading] = useState(false);
  const [fpMsg, setFpMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const handleSave = async () => {
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setError("Full name, email, and phone are required.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Update failed."); return; }
      await refresh();
      router.push("/app/profile");
    } catch {
      setError("Could not update your profile. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const sendCode = async () => {
    if (!fpEmail.trim()) { setFpMsg({ text: "Enter your email.", ok: false }); return; }
    setFpMsg(null);
    setFpLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fpEmail.trim() }),
      });
      const data = await res.json();
      setFpMsg({ text: data.message, ok: res.ok });
      if (res.ok) setFpStep("sent");
    } catch {
      setFpMsg({ text: "Failed to send code. Try again.", ok: false });
    } finally {
      setFpLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!fpCode.trim() || !fpNewPassword.trim() || !fpConfirm.trim()) {
      setFpMsg({ text: "All fields are required.", ok: false }); return;
    }
    if (fpNewPassword !== fpConfirm) {
      setFpMsg({ text: "Passwords do not match.", ok: false }); return;
    }
    if (fpNewPassword.length < 6) {
      setFpMsg({ text: "Password must be at least 6 characters.", ok: false }); return;
    }
    setFpMsg(null);
    setFpLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fpEmail.trim(), otp: fpCode.trim(), newPassword: fpNewPassword }),
      });
      const data = await res.json();
      setFpMsg({ text: data.message, ok: res.ok });
      if (res.ok) {
        setFpStep("idle");
        setFpCode(""); setFpNewPassword(""); setFpConfirm("");
      }
    } catch {
      setFpMsg({ text: "Failed to reset password. Try again.", ok: false });
    } finally {
      setFpLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link
          href="/app/profile"
          className="rounded-lg p-2 hover:bg-slate-100"
          style={{ color: "var(--ax-text-primary)" }}
        >
          <FiArrowLeft className="h-5 w-5" />
        </Link>
        <h2
          className="flex-1 text-center text-xl font-bold"
          style={{ color: "var(--ax-text-primary)" }}
        >
          Edit Account
        </h2>
        <div className="h-9 w-9" />
      </div>

      {/* Profile form */}
      <div
        className="overflow-hidden rounded-2xl border bg-white"
        style={{ borderColor: "var(--ax-border)" }}
      >
        <Field label="Full Name" icon={FiUser} value={fullName} onChange={setFullName} placeholder="Your full name" />
        <div className="mx-4 border-t" style={{ borderColor: "var(--ax-border)" }} />
        <Field label="Email" icon={FiMail} value={email} onChange={setEmail} type="email" placeholder="email@example.com" autoCapitalize="none" />
        <div className="mx-4 border-t" style={{ borderColor: "var(--ax-border)" }} />
        <Field label="Phone" icon={FiPhone} value={phone} onChange={setPhone} type="tel" placeholder="+91 XXXXXXXXXX" autoCapitalize="none" />
      </div>

      {error && (
        <p className="text-sm font-medium" style={{ color: "var(--ax-negative)" }}>{error}</p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-2xl py-4 text-base font-bold text-white transition"
        style={{ background: "var(--ax-primary)", opacity: saving ? 0.6 : 1 }}
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>

      {/* ── Change Password ── */}
      <div
        className="overflow-hidden rounded-2xl border bg-white"
        style={{ borderColor: "var(--ax-border)" }}
      >
        <div className="flex items-center gap-3 border-b px-4 py-4" style={{ borderColor: "var(--ax-border)" }}>
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: "var(--ax-primary-muted)" }}
          >
            <FiKey className="h-4 w-4" style={{ color: "var(--ax-primary)" }} />
          </div>
          <p className="text-sm font-bold" style={{ color: "var(--ax-text-primary)" }}>
            Change Password
          </p>
        </div>

        <div className="space-y-3 p-4">
          {/* Email row */}
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ax-text-secondary)" }}>
              Email
            </p>
            <div className="flex gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--ax-border)" }}>
                <FiMail className="h-4 w-4 flex-shrink-0" style={{ color: "var(--ax-text-secondary)" }} />
                <input
                  type="email"
                  value={fpEmail}
                  onChange={(e) => setFpEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: "var(--ax-text-primary)" }}
                />
              </div>
              <button
                type="button"
                onClick={sendCode}
                disabled={fpLoading || fpStep === "sent"}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-white transition disabled:opacity-60"
                style={{ background: "var(--ax-primary)" }}
              >
                {fpLoading && fpStep === "idle" ? "Sending…" : fpStep === "sent" ? "Sent ✓" : "Send Code"}
              </button>
            </div>
          </div>

          {fpStep === "sent" && (
            <>
              {/* OTP */}
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ax-text-secondary)" }}>
                  6-digit Code
                </p>
                <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--ax-border)" }}>
                  <FiKey className="h-4 w-4 flex-shrink-0" style={{ color: "var(--ax-text-secondary)" }} />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={fpCode}
                    onChange={(e) => setFpCode(e.target.value)}
                    placeholder="Enter code from email"
                    className="flex-1 bg-transparent text-sm tracking-widest outline-none"
                    style={{ color: "var(--ax-text-primary)" }}
                  />
                </div>
              </div>

              {/* New password */}
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ax-text-secondary)" }}>
                  New Password
                </p>
                <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--ax-border)" }}>
                  <FiLock className="h-4 w-4 flex-shrink-0" style={{ color: "var(--ax-text-secondary)" }} />
                  <input
                    type="password"
                    value={fpNewPassword}
                    onChange={(e) => setFpNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: "var(--ax-text-primary)" }}
                  />
                </div>
              </div>

              {/* Confirm */}
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ax-text-secondary)" }}>
                  Confirm Password
                </p>
                <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--ax-border)" }}>
                  <FiLock className="h-4 w-4 flex-shrink-0" style={{ color: "var(--ax-text-secondary)" }} />
                  <input
                    type="password"
                    value={fpConfirm}
                    onChange={(e) => setFpConfirm(e.target.value)}
                    placeholder="Repeat new password"
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: "var(--ax-text-primary)" }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={resetPassword}
                disabled={fpLoading}
                className="w-full rounded-xl py-3 text-sm font-bold text-white transition disabled:opacity-60"
                style={{ background: "var(--ax-primary)" }}
              >
                {fpLoading ? "Resetting…" : "Reset Password"}
              </button>
            </>
          )}

          {fpMsg && (
            <p className="text-sm font-medium" style={{ color: fpMsg.ok ? "var(--ax-positive)" : "var(--ax-negative)" }}>
              {fpMsg.text}
            </p>
          )}
        </div>
      </div>

      <Link
        href="/app/profile"
        className="block w-full py-3 text-center text-sm font-medium transition"
        style={{ color: "var(--ax-text-secondary)" }}
      >
        Cancel
      </Link>
    </div>
  );
}
