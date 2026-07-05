"use client";

import Link from "next/link";
import { FiBookOpen, FiChevronRight, FiDollarSign, FiEdit3, FiMail, FiUser } from "react-icons/fi";
import { useAppData } from "@/components/app/AppDataContext";
import { formatINR } from "@/components/app/format";

const SUPPORT_EMAIL = "support@capstockx.in";

const ROWS = [
  {
    key: "editProfile",
    label: "Edit Profile",
    icon: FiEdit3,
    href: "/app/profile/edit" as string | null,
  },
  {
    key: "ledger",
    label: "Order Ledger",
    icon: FiBookOpen,
    href: "/app/ledger",
  },
  {
    key: "funds",
    label: "Funds",
    icon: FiDollarSign,
    href: "/app/funds",
  },
  {
    key: "support",
    label: "Contact Support",
    icon: FiMail,
    href: `mailto:${SUPPORT_EMAIL}`,
  },
];

export default function ProfilePage() {
  const { user, logout } = useAppData();

  const displayName =
    user?.fullName || user?.clientId || user?.email?.split("@")[0] || "Account";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2
        className="text-xl font-bold"
        style={{ color: "var(--ax-text-primary)" }}
      >
        Profile
      </h2>

      <div className="flex flex-col items-center pt-4">
        <div
          className="flex h-24 w-24 items-center justify-center rounded-full border-2"
          style={{
            backgroundColor: "var(--ax-primary-muted)",
            borderColor: "rgba(220,38,38,0.25)",
          }}
        >
          <FiUser className="h-10 w-10" style={{ color: "var(--ax-primary)" }} />
        </div>
        <p
          className="mt-4 text-lg font-bold"
          style={{ color: "var(--ax-text-primary)" }}
        >
          {displayName}
        </p>
        {user?.email ? (
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--ax-text-secondary)" }}
          >
            {user.email}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <InfoTile
          label="Trading balance"
          value={formatINR(user?.tradingBalance ?? 0)}
        />
        <InfoTile label="Margin" value={formatINR(user?.margin ?? 0)} />
        <InfoTile label="Client ID" value={user?.clientId || "—"} />
        <InfoTile
          label="Status"
          value={user?.status || "—"}
          tone={
            user?.status === "active"
              ? "positive"
              : user?.status === "blocked"
                ? "negative"
                : "neutral"
          }
        />
      </div>

      <div
        className="overflow-hidden rounded-2xl border bg-white"
        style={{ borderColor: "var(--ax-border)" }}
      >
        {ROWS.map((r) => {
          const content = (
            <>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: "var(--ax-primary-muted)",
                    color: "var(--ax-primary)",
                  }}
                >
                  <r.icon className="h-4 w-4" />
                </div>
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--ax-text-primary)" }}
                >
                  {r.label}
                </span>
              </div>
              <FiChevronRight
                className="h-4 w-4"
                style={{ color: "var(--ax-text-secondary)" }}
              />
            </>
          );
          const rowClass =
            "flex items-center justify-between border-t px-4 py-4 transition hover:bg-slate-50 first:border-t-0";
          const style = { borderColor: "var(--ax-border)" };
          if (!r.href) {
            return (
              <div key={r.key} className={rowClass} style={style}>
                {content}
              </div>
            );
          }
          return r.href.startsWith("mailto:") ? (
            <a key={r.key} href={r.href} className={rowClass} style={style}>
              {content}
            </a>
          ) : (
            <Link key={r.key} href={r.href} className={rowClass} style={style}>
              {content}
            </Link>
          );
        })}
      </div>

      <div
        className="rounded-2xl border bg-white p-4"
        style={{ borderColor: "var(--ax-border)" }}
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--ax-text-secondary)" }}
        >
          Support
        </p>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="mt-2 block text-sm font-medium"
          style={{ color: "var(--ax-primary)" }}
        >
          {SUPPORT_EMAIL}
        </a>
      </div>

      <button
        type="button"
        onClick={() => void logout()}
        className="w-full rounded-xl border py-3 text-sm font-semibold transition hover:bg-rose-50"
        style={{
          borderColor: "var(--ax-border)",
          color: "var(--ax-negative)",
        }}
      >
        Log out
      </button>
    </div>
  );
}

function InfoTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  const toneColor =
    tone === "positive"
      ? "var(--ax-positive)"
      : tone === "negative"
        ? "var(--ax-negative)"
        : "var(--ax-text-primary)";
  return (
    <div
      className="rounded-2xl border bg-white p-4"
      style={{ borderColor: "var(--ax-border)" }}
    >
      <p
        className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: "var(--ax-text-secondary)" }}
      >
        {label}
      </p>
      <p
        className="mt-2 truncate text-base font-bold"
        style={{ color: toneColor }}
      >
        {value}
      </p>
    </div>
  );
}
