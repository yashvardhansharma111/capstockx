"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { FiCopy, FiSmartphone, FiX, FiCreditCard, FiDollarSign, FiGrid } from "react-icons/fi";
import { useAppData } from "@/components/app/AppDataContext";
import { formatINR } from "@/components/app/format";

type PaymentMeta = {
  upiId?: string | null;
  bankName?: string | null;
  accountHolder?: string | null;
  accountNumber?: string | null;
  ifsc?: string | null;
};

type FundConfig = {
  qrUrl: string | null;
  paymentMeta: PaymentMeta | null;
};

type FundRequest = {
  _id: string;
  type: string;
  amount: number;
  method?: string;
  reference?: string;
  status: string;
  createdAt?: string;
};

const UPI_APPS = [
  { key: "gpay",    label: "Google Pay",    logo: "/upi/gpay.svg",    upiScheme: "tez://upi/pay" },
  { key: "phonepe", label: "PhonePe",       logo: "/upi/phonepe.svg", upiScheme: "phonepe://pay" },
  { key: "paytm",   label: "Paytm",         logo: "/upi/paytm.svg",   upiScheme: "paytmmp://pay" },
  { key: "other",   label: "Other UPI app", logo: "/upi/upi.svg",     upiScheme: null },
];

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "include", ...init });
  const data = (await res.json()) as T & { message?: string };
  if (!res.ok) throw new Error((data as { message?: string }).message ?? `HTTP ${res.status}`);
  return data;
}

function copyToClipboard(text: string) {
  void navigator.clipboard.writeText(text);
}

function BankTransferCard({ meta }: { meta: PaymentMeta | null }) {
  if (!meta) return null;
  const rows = [
    { label: "Account Holder", value: meta.accountHolder, mono: false },
    { label: "Account Number", value: meta.accountNumber, mono: true },
    { label: "IFSC Code", value: meta.ifsc, mono: true },
    { label: "Bank Name", value: meta.bankName, mono: false },
  ].filter((r) => !!r.value);
  if (!rows.length) return null;

  return (
    <div
      className="rounded-2xl border p-4"
      style={{ borderColor: "var(--ax-border)", background: "#ffffff" }}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{ background: "var(--ax-primary-muted)" }}
        >
          <FiGrid className="h-4 w-4" style={{ color: "var(--ax-primary)" }} />
        </div>
        <p className="text-sm font-semibold" style={{ color: "var(--ax-text-primary)" }}>
          Bank Transfer (RTGS / NEFT / IMPS)
        </p>
      </div>
      <p className="mb-3 text-xs" style={{ color: "var(--ax-text-secondary)" }}>
        Use these details in your banking app. Click the copy icon to copy.
      </p>
      <div className="divide-y" style={{ borderColor: "var(--ax-border)" }}>
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between py-2.5">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--ax-text-secondary)" }}>
                {r.label}
              </p>
              <p
                className="mt-0.5 text-sm"
                style={{
                  color: "var(--ax-text-primary)",
                  fontFamily: r.mono ? "monospace" : undefined,
                  fontWeight: r.mono ? 700 : 500,
                }}
              >
                {r.value}
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(r.value!)}
              className="ml-3 rounded-lg p-1.5 transition hover:opacity-70"
              style={{ color: "var(--ax-text-secondary)" }}
            >
              <FiCopy className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function RequestCard({ item }: { item: FundRequest }) {
  const isDeposit = item.type !== "withdraw";
  const statusColor =
    item.status === "approved" ? "#16a34a" : item.status === "rejected" ? "#e11d48" : "#d97706";
  const statusBg =
    item.status === "approved"
      ? "rgba(22,163,74,0.10)"
      : item.status === "rejected"
        ? "rgba(225,29,72,0.10)"
        : "rgba(217,119,6,0.10)";

  return (
    <div
      className="w-40 shrink-0 rounded-2xl border p-3"
      style={{ borderColor: "var(--ax-border)", background: "#ffffff" }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{
            background: isDeposit ? "rgba(220,38,38,0.10)" : "rgba(225,29,72,0.10)",
            color: isDeposit ? "var(--ax-primary)" : "#e11d48",
          }}
        >
          {isDeposit ? "Deposit" : "Withdrawal"}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
          style={{ background: statusBg, color: statusColor }}
        >
          {item.status}
        </span>
      </div>
      <p className="text-lg font-bold" style={{ color: "var(--ax-text-primary)" }}>
        {formatINR(Number(item.amount ?? 0))}
      </p>
      <p className="mt-0.5 text-[11px]" style={{ color: "var(--ax-text-secondary)" }}>
        {item.method ?? "upi"}
        {item.reference ? ` · ${item.reference}` : ""}
      </p>
    </div>
  );
}

export default function FundsPage() {
  const { user } = useAppData();

  const [fundConfig, setFundConfig] = useState<FundConfig | null>(null);
  const [requests, setRequests] = useState<FundRequest[]>([]);
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [chooserOpen, setChooserOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [cfg, req] = await Promise.all([
        apiFetch<FundConfig>("/api/config/fund-qr"),
        apiFetch<{ requests: FundRequest[] }>("/api/funds/request"),
      ]);
      setFundConfig(cfg);
      setRequests(req.requests ?? []);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const paymentMeta = fundConfig?.paymentMeta ?? null;
  const numericAmount = Number(amount);
  const canPay = mode === "deposit" && numericAmount > 0 && !!paymentMeta?.upiId;

  const upiUrl = useMemo(() => {
    if (!paymentMeta?.upiId || !numericAmount) return null;
    const params = new URLSearchParams({
      pa: paymentMeta.upiId,
      pn: paymentMeta.accountHolder ?? "Capstockx",
      am: String(numericAmount),
      cu: "INR",
      tn: note || `Fund deposit for ${user?.clientId ?? user?.email ?? "user"}`,
    });
    return `upi://pay?${params.toString()}`;
  }, [numericAmount, note, paymentMeta, user]);

  function openUpiApp(app: (typeof UPI_APPS)[0]) {
    if (!upiUrl) return;
    setChooserOpen(false);

    const qs = upiUrl.slice("upi://pay?".length);
    const targetUrl = app.upiScheme ? `${app.upiScheme}?${qs}` : upiUrl;

    if (!app.upiScheme) {
      window.location.href = upiUrl;
      return;
    }

    // If the specific app is not installed, fall back to generic upi:// after 1.5s
    const fallback = setTimeout(() => { window.location.href = upiUrl; }, 1500);
    const cancel = () => clearTimeout(fallback);
    window.addEventListener("blur", cancel, { once: true });
    document.addEventListener("visibilitychange", cancel, { once: true });

    window.location.href = targetUrl;
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!numericAmount || numericAmount <= 0) {
      setMsg({ text: "Enter a valid amount.", ok: false });
      return;
    }
    setMsg(null);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        type: mode === "deposit" ? "add" : "withdraw",
        amount: numericAmount,
        method: mode === "deposit" ? "upi" : "withdrawal",
        reference,
        note,
      };
      const data = await apiFetch<{ message: string }>("/api/funds/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setMsg({ text: data.message, ok: true });
      setAmount("");
      setReference("");
      setNote("");
      await load();
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "Failed to submit.", ok: false });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-10">
      <h2 className="text-xl font-bold" style={{ color: "var(--ax-text-primary)" }}>
        Funds
      </h2>

      {/* Balance + Margin card */}
      <div
        className="rounded-2xl border p-5"
        style={{ borderColor: "var(--ax-border)", background: "#ffffff" }}
      >
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-xl"
                style={{ background: "rgba(220,38,38,0.12)" }}
              >
                <FiCreditCard className="h-4 w-4" style={{ color: "var(--ax-primary)" }} />
              </div>
              <p className="text-xs font-medium" style={{ color: "var(--ax-text-secondary)" }}>
                Balance
              </p>
            </div>
            <p className="text-2xl font-bold" style={{ color: "var(--ax-text-primary)" }}>
              {formatINR(Number(user?.tradingBalance ?? 0))}
            </p>
          </div>
          <div className="w-px self-stretch" style={{ background: "var(--ax-border)" }} />
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-xl"
                style={{ background: "rgba(6,182,212,0.12)" }}
              >
                <FiDollarSign className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-xs font-medium" style={{ color: "var(--ax-text-secondary)" }}>
                Margin
              </p>
            </div>
            <p className="text-2xl font-bold" style={{ color: "var(--ax-text-primary)" }}>
              {formatINR(Number(user?.margin ?? 0))}
            </p>
          </div>
        </div>
        <p
          className="mt-4 border-t pt-3 text-[11px] leading-relaxed"
          style={{ borderColor: "var(--ax-border)", color: "var(--ax-text-secondary)" }}
        >
          Deposits and withdrawals require admin approval.
        </p>
      </div>

      {/* Deposit / Withdraw toggle */}
      <div
        className="flex rounded-2xl p-1"
        style={{ background: "var(--ax-surface-muted, rgba(15,23,42,0.06))" }}
      >
        {(["deposit", "withdraw"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setMode(t); setMsg(null); }}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition"
            style={{
              background: mode === t ? "#ffffff" : "transparent",
              color: mode === t ? "var(--ax-text-primary)" : "var(--ax-text-secondary)",
              boxShadow: mode === t ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {t === "deposit" ? "Deposit" : "Withdraw"}
          </button>
        ))}
      </div>

      {/* Form card */}
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="overflow-hidden rounded-2xl border"
        style={{ borderColor: "var(--ax-border)", background: "#ffffff" }}
      >
        <div className="px-4 py-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ax-text-secondary)" }}>
            Amount
          </p>
          <input
            type="number"
            min="1"
            step="1"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="₹ Enter amount"
            className="w-full bg-transparent text-base outline-none"
            style={{ color: "var(--ax-text-primary)" }}
          />
        </div>
        <div className="h-px" style={{ background: "var(--ax-border)" }} />
        <div className="px-4 py-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ax-text-secondary)" }}>
            Reference
          </p>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder={mode === "deposit" ? "UTR / transaction ref" : "Bank / request ref"}
            className="w-full bg-transparent text-sm outline-none"
            style={{ color: "var(--ax-text-primary)" }}
          />
        </div>
        <div className="h-px" style={{ background: "var(--ax-border)" }} />
        <div className="px-4 py-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ax-text-secondary)" }}>
            Note (optional)
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note"
            rows={2}
            className="w-full resize-none bg-transparent text-sm outline-none"
            style={{ color: "var(--ax-text-primary)" }}
          />
        </div>
      </form>

      {mode === "deposit" ? (
        <>
          {/* Pay by UPI section */}
          <div
            className="rounded-2xl border p-4"
            style={{ borderColor: "var(--ax-border)", background: "#ffffff" }}
          >
            <div className="mb-3 flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-xl"
                style={{ background: "var(--ax-primary-muted)" }}
              >
                <FiSmartphone className="h-4 w-4" style={{ color: "var(--ax-primary)" }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: "var(--ax-text-primary)" }}>
                Pay by UPI
              </p>
            </div>
            {paymentMeta?.upiId ? (
              <>
                <p className="text-sm" style={{ color: "var(--ax-text-secondary)" }}>
                  UPI ID:{" "}
                  <span className="font-semibold" style={{ color: "var(--ax-text-primary)" }}>
                    {paymentMeta.upiId}
                  </span>
                </p>
                {paymentMeta.accountHolder ? (
                  <p className="mt-0.5 text-xs" style={{ color: "var(--ax-text-secondary)" }}>
                    {paymentMeta.accountHolder}
                  </p>
                ) : null}
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    disabled={!canPay}
                    onClick={() => setChooserOpen(true)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition disabled:opacity-50"
                    style={{ background: "var(--ax-primary)" }}
                  >
                    <FiSmartphone className="h-4 w-4" />
                    Pay on UPI
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleSubmit()}
                    className="flex flex-1 items-center justify-center rounded-xl border py-3 text-sm font-semibold transition disabled:opacity-50"
                    style={{ borderColor: "var(--ax-primary)", color: "var(--ax-primary)" }}
                  >
                    {submitting ? "Submitting…" : "Submit Request"}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm" style={{ color: "var(--ax-text-secondary)" }}>
                Admin has not configured a UPI ID yet.
              </p>
            )}
          </div>

          {/* QR code */}
          {fundConfig?.qrUrl ? (
            <div
              className="flex flex-col items-center rounded-2xl border p-4"
              style={{ borderColor: "var(--ax-border)", background: "#ffffff" }}
            >
              <p className="mb-4 text-sm font-semibold" style={{ color: "var(--ax-text-primary)" }}>
                Scan &amp; Pay
              </p>
              <div className="overflow-hidden rounded-xl">
                <Image src={fundConfig.qrUrl} alt="Payment QR" width={200} height={200} unoptimized />
              </div>
            </div>
          ) : null}

          <BankTransferCard meta={paymentMeta} />
        </>
      ) : (
        <div
          className="rounded-2xl border p-4"
          style={{ borderColor: "var(--ax-border)", background: "#ffffff" }}
        >
          <p className="mb-4 text-sm leading-relaxed" style={{ color: "var(--ax-text-secondary)" }}>
            Withdrawal requests are sent to the admin panel and processed manually after verification.
          </p>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleSubmit()}
            className="w-full rounded-xl py-3 text-sm font-bold text-white transition disabled:opacity-50"
            style={{ background: "var(--ax-primary)" }}
          >
            {submitting ? "Submitting…" : "Submit Withdrawal"}
          </button>
        </div>
      )}

      {msg ? (
        <p
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: msg.ok ? "rgba(22,163,74,0.08)" : "rgba(225,29,72,0.08)",
            color: msg.ok ? "#16a34a" : "#e11d48",
          }}
        >
          {msg.text}
        </p>
      ) : null}

      {/* Recent requests */}
      {requests.length > 0 ? (
        <div>
          <p className="mb-3 text-sm font-semibold" style={{ color: "var(--ax-text-primary)" }}>
            Recent Requests
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {requests.map((item) => (
              <RequestCard key={String(item._id)} item={item} />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-center text-sm" style={{ color: "var(--ax-text-secondary)" }}>
          No requests yet.
        </p>
      )}

      {/* UPI App chooser modal */}
      {chooserOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
          onClick={() => setChooserOpen(false)}
        >
          <div
            className="w-full rounded-t-3xl p-6 pb-10 sm:max-w-md"
            style={{ background: "#ffffff" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between">
              <p className="text-lg font-bold" style={{ color: "#0f172a" }}>
                Choose UPI App
              </p>
              <button type="button" onClick={() => setChooserOpen(false)}>
                <FiX className="h-5 w-5" style={{ color: "#64748b" }} />
              </button>
            </div>
            <p className="mb-4 text-sm" style={{ color: "#64748b" }}>
              Amount {formatINR(numericAmount || 0)} will be pre-filled.
            </p>
            {UPI_APPS.map((app) => (
              <button
                key={app.key}
                type="button"
                onClick={() => openUpiApp(app)}
                className="mb-2 flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-semibold transition hover:opacity-80"
                style={{ borderColor: "#e2e8f0", color: "#0f172a", background: "#fff" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={app.logo}
                  alt={app.label}
                  className="h-9 w-9 flex-shrink-0 rounded-xl object-contain"
                />
                {app.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setChooserOpen(false)}
              className="mt-2 w-full py-3 text-sm font-medium"
              style={{ color: "#64748b" }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
