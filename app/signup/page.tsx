"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiUploadCloud,
} from "react-icons/fi";

const DOCUMENT_OPTIONS = [
  "Bank Statement (6Month)",
  "DP holdings",
  "Salary Slip",
  "ITR Acknowledgement",
  "Form 16",
  "Other",
];

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  panNumber: string;
  aadhaarNumber: string;
  accountNo: string;
  ifscCode: string;
  documentType: string;
};

const INITIAL: FormState = {
  fullName: "",
  email: "",
  phone: "",
  panNumber: "",
  aadhaarNumber: "",
  accountNo: "",
  ifscCode: "",
  documentType: DOCUMENT_OPTIONS[0],
};

export default function SignupPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [signature, setSignature] = useState<File | null>(null);
  const [document, setDocument] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "email" && emailVerified) setEmailVerified(false);
    if (key === "phone" && phoneVerified) setPhoneVerified(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.fullName.trim() || !form.email.trim() || !form.phone.trim()) {
      setError("Enter your full name, email, and phone number");
      return;
    }
    if (!emailVerified && !phoneVerified) {
      setError(
        "Please verify your email and phone number with the OTP before submitting.",
      );
      return;
    }
    if (!emailVerified) {
      setError("Please verify your email address with the OTP first.");
      return;
    }
    if (!phoneVerified) {
      setError("Please verify your phone number with the OTP first.");
      return;
    }
    if (!form.accountNo.trim() || !form.ifscCode.trim()) {
      setError("Enter your bank account number and IFSC code");
      return;
    }

    setBusy(true);
    try {
      const payload = new FormData();
      for (const [k, v] of Object.entries(form)) {
        payload.append(k, v);
      }

      // Upload signature only if the user chose one (optional).
      if (signature) {
        const sigForm = new FormData();
        sigForm.append("file", signature);
        const sigRes = await fetch("/api/register/signature-upload", {
          method: "POST",
          body: sigForm,
        });
        const sigData = await sigRes.json();
        if (!sigRes.ok || !sigData?.url) {
          throw new Error(sigData?.message || "Signature upload failed");
        }
        payload.append("signatureUrl", sigData.url);
      }

      if (document) {
        payload.append("document", document);
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        body: payload,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Registration failed");
      }
      setSuccess(
        "Registration submitted. Admin will review and email your Client ID and password after approval.",
      );
      setForm(INITIAL);
      setSignature(null);
      setDocument(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--ax-card)" }}
    >
      <div className="mx-auto max-w-2xl px-6 py-10">
        {/* Brand */}
        <div className="mb-8 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.jpeg"
            alt="Capstockx"
            className="h-12 w-12 rounded-2xl object-contain"
            style={{ boxShadow: "0 0 0 1px rgba(220,38,38,0.15)" }}
          />
          <div className="leading-none">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--ax-primary)" }}>Cap</p>
            <p className="text-base font-bold" style={{ color: "var(--ax-text-primary)" }}>Stocks</p>
          </div>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium"
          style={{ color: "var(--ax-text-secondary)" }}
        >
          <FiArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>

        <div
          className="mt-6 rounded-2xl border bg-white p-6 shadow-sm sm:p-8"
          style={{ borderColor: "var(--ax-border)" }}
        >
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--ax-text-primary)" }}
          >
            Request account
          </h1>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--ax-text-secondary)" }}
          >
            Enter your details below. Signature and supporting documents are
            optional. After admin approval, your Client ID and password will be
            sent to your email.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field
              label="Full Name"
              value={form.fullName}
              onChange={(v) => update("fullName", v)}
              disabled={busy}
            />
            <VerifyField
              label="Email"
              target="email"
              type="email"
              value={form.email}
              onChange={(v) => update("email", v)}
              disabled={busy}
              verified={emailVerified}
              onVerified={() => { setEmailVerified(true); setError(null); }}
            />
            <VerifyField
              label="Phone"
              target="phone"
              type="tel"
              value={form.phone}
              onChange={(v) => update("phone", v)}
              disabled={busy}
              verified={phoneVerified}
              onVerified={() => { setPhoneVerified(true); setError(null); }}
            />
            <Field
              label="PAN Number"
              value={form.panNumber}
              onChange={(v) => update("panNumber", v.toUpperCase())}
              disabled={busy}
            />
            <Field
              label="Aadhaar Number"
              value={form.aadhaarNumber}
              onChange={(v) => update("aadhaarNumber", v)}
              disabled={busy}
              inputMode="numeric"
            />
            <Field
              label="Bank Account Number"
              value={form.accountNo}
              onChange={(v) => update("accountNo", v)}
              disabled={busy}
              inputMode="numeric"
            />
            <Field
              label="IFSC Code"
              value={form.ifscCode}
              onChange={(v) => update("ifscCode", v.toUpperCase())}
              disabled={busy}
            />

            <div>
              <p
                className="mt-2 text-xs font-medium"
                style={{ color: "var(--ax-text-secondary)" }}
              >
                Document type
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {DOCUMENT_OPTIONS.map((opt) => {
                  const active = form.documentType === opt;
                  return (
                    <button
                      type="button"
                      key={opt}
                      onClick={() => update("documentType", opt)}
                      className="rounded-full border px-3 py-1.5 text-xs font-medium transition"
                      style={
                        active
                          ? {
                              backgroundColor: "var(--ax-primary-muted)",
                              borderColor: "var(--ax-primary)",
                              color: "var(--ax-primary)",
                            }
                          : {
                              backgroundColor: "#fff",
                              borderColor: "var(--ax-border)",
                              color: "var(--ax-text-secondary)",
                            }
                      }
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            <UploadField
              label="Signature"
              helper="Optional · image only"
              accept="image/*"
              file={signature}
              onFile={setSignature}
              preview
              disabled={busy}
            />

            <UploadField
              label="Supporting document"
              helper="Image or PDF"
              accept="image/*,application/pdf"
              file={document}
              onFile={setDocument}
              disabled={busy}
            />

            {!emailVerified || !phoneVerified ? (
              <div
                className="rounded-xl border p-4 text-sm"
                style={{
                  borderColor: "rgba(245,158,11,0.35)",
                  backgroundColor: "rgba(245,158,11,0.08)",
                }}
              >
                <p
                  className="text-sm font-bold"
                  style={{ color: "#B45309" }}
                >
                  Verify your email and phone first
                </p>
                <p
                  className="mt-1 text-xs leading-relaxed"
                  style={{ color: "#92400E" }}
                >
                  Tap <strong>Send OTP</strong> next to {" "}
                  {!emailVerified ? "Email" : ""}
                  {!emailVerified && !phoneVerified ? " and " : ""}
                  {!phoneVerified ? "Phone" : ""}, enter the 6-digit code, then
                  tap <strong>Verify</strong>. Submit is blocked until both
                  show a green <strong>Verified</strong> badge.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusChip done={emailVerified} label="Email" />
                  <StatusChip done={phoneVerified} label="Phone" />
                </div>
              </div>
            ) : (
              <div
                className="rounded-xl border px-4 py-2 text-xs font-semibold"
                style={{
                  borderColor: "rgba(220,38,38,0.30)",
                  backgroundColor: "rgba(220,38,38,0.08)",
                  color: "var(--ax-positive)",
                }}
              >
                ✓ Email and phone verified — you can submit the form.
              </div>
            )}

            {error ? (
              <p
                className="rounded-lg px-4 py-2 text-sm"
                style={{
                  backgroundColor: "rgba(229,84,97,0.08)",
                  color: "var(--ax-negative)",
                }}
              >
                {error}
              </p>
            ) : null}
            {success ? (
              <p
                className="rounded-lg px-4 py-2 text-sm"
                style={{
                  backgroundColor: "rgba(220,38,38,0.08)",
                  color: "var(--ax-positive)",
                }}
              >
                {success}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy || !emailVerified || !phoneVerified}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: "var(--ax-primary)" }}
            >
              {busy
                ? "Submitting…"
                : !emailVerified || !phoneVerified
                  ? "Verify email & phone first"
                  : "Submit request"}
            </button>

            <Link
              href="/"
              className="block text-center text-sm font-medium"
              style={{ color: "var(--ax-primary)" }}
            >
              Back to sign in
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}

function StatusChip({ done, label }: { done: boolean; label: string }) {
  return (
    <span
      className="rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wider"
      style={
        done
          ? {
              backgroundColor: "rgba(220,38,38,0.10)",
              borderColor: "rgba(220,38,38,0.35)",
              color: "var(--ax-positive)",
            }
          : {
              backgroundColor: "#fff",
              borderColor: "rgba(245,158,11,0.35)",
              color: "#B45309",
            }
      }
    >
      {done ? `✓ ${label} verified` : `• ${label} pending`}
    </span>
  );
}

function VerifyField({
  label,
  target,
  type = "text",
  value,
  onChange,
  disabled,
  verified,
  onVerified,
}: {
  label: string;
  target: "phone" | "email";
  type?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  verified: boolean;
  onVerified: () => void;
}) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = setTimeout(
      () => setCooldown((c) => Math.max(0, c - 1)),
      1000,
    );
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cooldown]);

  useEffect(() => {
    // Upstream value changed — invalidate any pending OTP UI.
    setSent(false);
    setOtp("");
    setErr(null);
    setMsg(null);
  }, [value]);

  async function handleSend() {
    setErr(null);
    setMsg(null);
    if (!value.trim()) {
      setErr(
        target === "email"
          ? "Enter your email first"
          : "Enter your phone number first",
      );
      return;
    }
    if (target === "email" && !/^\S+@\S+\.\S+$/.test(value.trim())) {
      setErr("Enter a valid email address");
      return;
    }
    if (target === "phone" && value.replace(/\D/g, "").length < 10) {
      setErr("Enter a valid 10-digit phone number");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, value: value.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Could not send OTP");
      setMsg(data?.message || `OTP sent to your ${target}.`);
      setSent(true);
      setOtp("");
      setCooldown(30);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not send OTP");
    } finally {
      setSending(false);
    }
  }

  async function handleVerify() {
    setErr(null);
    setMsg(null);
    if (!/^\d{6}$/.test(otp)) {
      setErr("Enter the 6-digit code");
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, value: value.trim(), otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Could not verify");
      setMsg("Verified");
      setSent(false);
      setOtp("");
      onVerified();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not verify");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p
          className="text-xs font-medium"
          style={{ color: "var(--ax-text-secondary)" }}
        >
          {label}
        </p>
        {verified ? (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider"
            style={{
              backgroundColor: "rgba(220,38,38,0.12)",
              color: "var(--ax-positive)",
            }}
          >
            <FiCheckCircle className="h-3 w-3" />
            VERIFIED
          </span>
        ) : null}
      </div>
      <div className="flex gap-2">
        <input
          type={type}
          value={value}
          disabled={disabled || verified}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-[var(--ax-primary)] focus:ring-4 disabled:opacity-70"
          style={{
            borderColor: "var(--ax-border)",
            backgroundColor: "var(--ax-card-muted)",
            color: "var(--ax-text-primary)",
          }}
        />
        {verified ? null : (
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || cooldown > 0 || !value.trim()}
            className="whitespace-nowrap rounded-xl border px-3 text-xs font-bold transition disabled:opacity-60"
            style={{
              borderColor: "var(--ax-primary)",
              backgroundColor: "var(--ax-primary-muted)",
              color: "var(--ax-primary)",
            }}
          >
            {sending
              ? "Sending…"
              : cooldown > 0
                ? `${cooldown}s`
                : sent
                  ? "Resend"
                  : "Send OTP"}
          </button>
        )}
      </div>
      {sent && !verified ? (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="6-digit OTP"
            className="flex-1 rounded-xl border px-4 py-3 text-center text-base font-bold tracking-[0.4em] outline-none transition focus:border-[var(--ax-primary)] focus:ring-4"
            style={{
              borderColor: "var(--ax-border)",
              backgroundColor: "var(--ax-card-muted)",
              color: "var(--ax-text-primary)",
              fontFamily: "monospace",
            }}
          />
          <button
            type="button"
            onClick={() => void handleVerify()}
            disabled={otp.length !== 6 || verifying}
            className="whitespace-nowrap rounded-xl px-4 text-xs font-bold text-white transition disabled:opacity-60"
            style={{ backgroundColor: "var(--ax-primary)" }}
          >
            {verifying ? "Verifying…" : "Verify"}
          </button>
        </div>
      ) : null}
      {msg ? (
        <p
          className="mt-2 text-xs"
          style={{ color: "var(--ax-positive)" }}
        >
          {msg}
        </p>
      ) : null}
      {err ? (
        <p
          className="mt-2 text-xs"
          style={{ color: "var(--ax-negative)" }}
        >
          {err}
        </p>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
  inputMode?: "numeric" | "text";
}) {
  return (
    <div>
      <p
        className="mb-1 text-xs font-medium"
        style={{ color: "var(--ax-text-secondary)" }}
      >
        {label}
      </p>
      <input
        type={type}
        value={value}
        inputMode={inputMode}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-[var(--ax-primary)] focus:ring-4"
        style={{
          borderColor: "var(--ax-border)",
          backgroundColor: "var(--ax-card-muted)",
          color: "var(--ax-text-primary)",
        }}
      />
    </div>
  );
}

function UploadField({
  label,
  helper,
  accept,
  file,
  onFile,
  preview = false,
  disabled,
}: {
  label: string;
  helper?: string;
  accept?: string;
  file: File | null;
  onFile: (f: File | null) => void;
  preview?: boolean;
  disabled?: boolean;
}) {
  const previewUrl =
    preview && file && file.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : null;

  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor: "var(--ax-border)",
        backgroundColor: "var(--ax-card)",
      }}
    >
      <div className="flex items-center justify-between">
        <p
          className="text-xs font-medium"
          style={{ color: "var(--ax-text-secondary)" }}
        >
          {label}
        </p>
        {helper ? (
          <p
            className="text-[11px]"
            style={{ color: "var(--ax-text-secondary)" }}
          >
            {helper}
          </p>
        ) : null}
      </div>

      {previewUrl ? (
        // Browser-managed object URL; next/image isn't useful for blob: URLs.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt={`${label} preview`}
          className="mt-3 h-24 w-24 rounded-xl object-contain"
          style={{ backgroundColor: "var(--ax-card-muted)" }}
        />
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label
          className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition hover:bg-slate-50"
          style={{
            borderColor: "var(--ax-primary)",
            color: "var(--ax-primary)",
          }}
        >
          <FiUploadCloud className="h-4 w-4" />
          {file ? "Change file" : `Add ${label}`}
          <input
            type="file"
            accept={accept}
            className="hidden"
            disabled={disabled}
            onChange={(e) => onFile(e.target.files?.[0] || null)}
          />
        </label>
        {file ? (
          <button
            type="button"
            onClick={() => onFile(null)}
            disabled={disabled}
            className="text-xs font-medium"
            style={{ color: "var(--ax-negative)" }}
          >
            Remove
          </button>
        ) : null}
      </div>

      <p
        className="mt-3 text-xs"
        style={{ color: "var(--ax-text-secondary)" }}
      >
        {file ? file.name : "No file selected"}
      </p>
    </div>
  );
}
