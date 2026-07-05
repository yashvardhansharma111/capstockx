"use client";

import { useCallback, useEffect, useState } from "react";
import { adminJson } from "@/components/admin/adminFetch";
import { FiEye, FiEyeOff } from "react-icons/fi";

type Meta = {
  upiId: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  ifsc: string;
};

export default function AdminSettingsPage() {
  const [qrUrl, setQrUrl] = useState("");
  const [meta, setMeta] = useState<Meta>({
    upiId: "",
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    ifsc: "",
  });
  const [hasImage, setHasImage] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Change PIN state
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [pinMsg, setPinMsg] = useState<string | null>(null);
  const [pinErr, setPinErr] = useState<string | null>(null);
  const [savingPin, setSavingPin] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const data = await adminJson<{ qrUrl?: string | null; paymentMeta?: Partial<Meta> | null }>(
        "/api/admin/qr",
      );
      setQrUrl(data.qrUrl || "");
      const pm = data.paymentMeta;
      setMeta({
        upiId: pm?.upiId || "",
        bankName: pm?.bankName || "",
        accountHolder: pm?.accountHolder || "",
        accountNumber: pm?.accountNumber || "",
        ifsc: pm?.ifsc || "",
      });
      const imgRes = await fetch("/api/admin/qr-image", { credentials: "include" });
      const imgData = await imgRes.json();
      setHasImage(!!imgData?.hasImage);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveMeta() {
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      await adminJson("/api/admin/qr", {
        method: "POST",
        body: JSON.stringify({ qrUrl: qrUrl || null, paymentMeta: meta }),
      });
      setMsg("Payment details saved.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage() {
    if (!file) return;
    setSaving(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/qr-image", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      setMsg("QR image uploaded.");
      setFile(null);
      setFilePreview(null);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteImage() {
    setSaving(true);
    try {
      await adminJson("/api/admin/qr-image", { method: "DELETE" });
      setMsg("QR image removed.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  async function changePin() {
    setPinMsg(null);
    setPinErr(null);
    if (!currentPin || !newPin || !confirmPin) {
      setPinErr("All PIN fields are required.");
      return;
    }
    if (newPin !== confirmPin) {
      setPinErr("New PIN and confirmation do not match.");
      return;
    }
    if (newPin.length < 4) {
      setPinErr("New PIN must be at least 4 characters.");
      return;
    }
    setSavingPin(true);
    try {
      await adminJson("/api/admin/pin", {
        method: "POST",
        body: JSON.stringify({ currentPin, newPin }),
      });
      setPinMsg("PIN updated successfully.");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } catch (e) {
      setPinErr(e instanceof Error ? e.message : "Failed to update PIN");
    } finally {
      setSavingPin(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-lg font-semibold text-slate-900">QR &amp; payments</h2>
      <p className="mt-1 text-sm text-slate-600">
        UPI / bank details shown to users on the funds screen. You can upload a QR image or set a
        public URL.
      </p>
      {msg ? (
        <p className="mt-4 rounded-lg bg-sky-50 px-4 py-2 text-sm text-sky-900">{msg}</p>
      ) : null}
      {err ? (
        <p className="mt-4 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-900">{err}</p>
      ) : null}

      <section className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="font-medium text-slate-900">QR image</h3>
        <p className="text-xs text-slate-500">
          Status: {hasImage ? "✓ Image stored in database" : "No image — using URL below if set"}
        </p>

        {/* Live preview */}
        {hasImage && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-xs font-medium text-slate-500">Current QR preview:</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/config/fund-qr-image?_=${Date.now()}`}
              alt="Current QR"
              className="h-40 w-40 rounded-xl border border-slate-200 object-contain"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setFile(f);
              if (f) {
                const url = URL.createObjectURL(f);
                setFilePreview(url);
              } else {
                setFilePreview(null);
              }
            }}
            className="text-sm"
          />
          {filePreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={filePreview} alt="Selected" className="h-16 w-16 rounded-lg border border-slate-200 object-contain" />
          )}
          <button
            type="button"
            disabled={!file || saving}
            onClick={() => void uploadImage()}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {file ? `Upload "${file.name}"` : "Upload"}
          </button>
          <button
            type="button"
            disabled={!hasImage || saving}
            onClick={() => void deleteImage()}
            className="rounded-lg border border-rose-200 px-4 py-2 text-sm text-rose-700 disabled:opacity-40"
          >
            Delete image
          </button>
        </div>
      </section>

      <section className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="font-medium text-slate-900">QR URL (fallback)</h3>
        <input
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="https://…"
          value={qrUrl}
          onChange={(e) => setQrUrl(e.target.value)}
        />
      </section>

      <section className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2">
        <h3 className="font-medium text-slate-900 sm:col-span-2">Bank / UPI meta</h3>
        {(
          [
            ["upiId", "UPI ID"],
            ["bankName", "Bank name"],
            ["accountHolder", "Account holder"],
            ["accountNumber", "Account number"],
            ["ifsc", "IFSC"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block">
            <span className="text-xs font-medium text-slate-500">{label}</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={meta[key]}
              onChange={(e) => setMeta((m) => ({ ...m, [key]: e.target.value }))}
            />
          </label>
        ))}
      </section>

      <button
        type="button"
        disabled={saving}
        onClick={() => void saveMeta()}
        className="mt-6 rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save payment settings"}
      </button>

      {/* ── Change Admin PIN ─────────────────────────────────── */}
      <h2 className="mt-12 text-lg font-semibold text-slate-900">Admin PIN</h2>
      <p className="mt-1 text-sm text-slate-600">
        Change the PIN used to log in to the admin panel. The new PIN will be stored securely in
        the database and will override the environment variable.
      </p>

      {pinMsg ? (
        <p className="mt-4 rounded-lg bg-sky-50 px-4 py-2 text-sm text-sky-900">{pinMsg}</p>
      ) : null}
      {pinErr ? (
        <p className="mt-4 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-900">{pinErr}</p>
      ) : null}

      <section className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block">
          <span className="text-xs font-medium text-slate-500">Current PIN</span>
          <div className="relative mt-1">
            <input
              type={showCurrentPin ? "text" : "password"}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-10 text-sm"
              placeholder="Enter current PIN"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowCurrentPin((v) => !v)}
              className="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-slate-600"
            >
              {showCurrentPin ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
            </button>
          </div>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-slate-500">New PIN</span>
          <div className="relative mt-1">
            <input
              type={showNewPin ? "text" : "password"}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-10 text-sm"
              placeholder="Enter new PIN (min 4 characters)"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowNewPin((v) => !v)}
              className="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-slate-600"
            >
              {showNewPin ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
            </button>
          </div>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-slate-500">Confirm new PIN</span>
          <input
            type="password"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Re-enter new PIN"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
          />
        </label>

        <button
          type="button"
          disabled={savingPin}
          onClick={() => void changePin()}
          className="rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {savingPin ? "Updating…" : "Update PIN"}
        </button>
      </section>
    </div>
  );
}
