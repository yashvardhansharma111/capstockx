"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiMail, FiPhone, FiUser } from "react-icons/fi";
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

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
      if (!res.ok) {
        setError(data.message || "Update failed.");
        return;
      }
      await refresh();
      router.push("/app/profile");
    } catch {
      setError("Could not update your profile. Try again.");
    } finally {
      setSaving(false);
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
          Edit Profile
        </h2>
        {/* Spacer to center title */}
        <div className="h-9 w-9" />
      </div>

      {/* Form card */}
      <div
        className="overflow-hidden rounded-2xl border bg-white"
        style={{ borderColor: "var(--ax-border)" }}
      >
        <Field
          label="Full Name"
          icon={FiUser}
          value={fullName}
          onChange={setFullName}
          placeholder="Your full name"
        />
        <div className="mx-4 border-t" style={{ borderColor: "var(--ax-border)" }} />
        <Field
          label="Email"
          icon={FiMail}
          value={email}
          onChange={setEmail}
          type="email"
          placeholder="email@example.com"
          autoCapitalize="none"
        />
        <div className="mx-4 border-t" style={{ borderColor: "var(--ax-border)" }} />
        <Field
          label="Phone"
          icon={FiPhone}
          value={phone}
          onChange={setPhone}
          type="tel"
          placeholder="+91 XXXXXXXXXX"
          autoCapitalize="none"
        />
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm font-medium" style={{ color: "var(--ax-negative)" }}>
          {error}
        </p>
      )}

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-2xl py-4 text-base font-bold text-white transition"
        style={{
          background: "var(--ax-primary)",
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>

      {/* Cancel */}
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
