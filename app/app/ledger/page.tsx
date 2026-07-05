"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FiArrowLeft, FiDownload, FiBook } from "react-icons/fi";
import { formatINR } from "@/components/app/format";

type Order = {
  id?: string;
  symbol?: string;
  side?: string;
  qty?: number;
  avgPrice?: number;
  price?: number;
  pnl?: number;
  exchange?: string;
  productType?: string;
  createdAt?: string;
  executedAt?: string;
};

async function j<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

async function jtext(path: string) {
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

function formatDate(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-IN", { month: "short" });
  const time = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${day} ${month} ${d.getFullYear()} · ${time}`;
}

export default function LedgerPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await j<{ orders?: Order[] }>("/api/trades/orders?limit=500");
      setOrders(res.orders || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function download() {
    setDownloading(true);
    try {
      const csv = await jtext("/api/config/orders/ledger");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ledger-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to download");
    } finally {
      setDownloading(false);
    }
  }

  const totalPnl = orders.reduce((s, o) => s + Number(o.pnl || 0), 0);
  const positive = totalPnl >= 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link
          href="/app/profile"
          className="rounded-lg p-2 hover:bg-slate-100"
          style={{ color: "var(--ax-text-primary)" }}
        >
          <FiArrowLeft className="h-5 w-5" />
        </Link>
        <h2
          className="text-xl font-bold"
          style={{ color: "var(--ax-text-primary)" }}
        >
          Order Ledger
        </h2>
      </div>

      <div className="ax-card flex items-start justify-between gap-4 p-5">
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--ax-text-secondary)" }}
          >
            Total P&amp;L
          </p>
          <p
            className="mt-1 text-2xl font-bold"
            style={{
              color: positive ? "var(--ax-positive)" : "var(--ax-negative)",
            }}
          >
            {positive ? "+" : ""}
            {formatINR(totalPnl)}
          </p>
        </div>
        <div className="text-right">
          <p
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--ax-text-secondary)" }}
          >
            Orders
          </p>
          <p
            className="mt-1 text-lg font-bold"
            style={{ color: "var(--ax-text-primary)" }}
          >
            {orders.length}
          </p>
        </div>
      </div>

      {err ? (
        <p
          className="rounded-lg px-4 py-2 text-sm"
          style={{
            backgroundColor: "rgba(229,84,97,0.08)",
            color: "var(--ax-negative)",
          }}
        >
          {err}
        </p>
      ) : null}

      {loading ? (
        <div className="ax-card px-4 py-12 text-center text-sm"
          style={{ color: "var(--ax-text-secondary)" }}>
          Loading your ledger…
        </div>
      ) : orders.length === 0 ? (
        <div className="ax-card flex flex-col items-center gap-2 px-4 py-12 text-center">
          <FiBook className="h-10 w-10 opacity-30" style={{ color: "var(--ax-text-secondary)" }} />
          <p
            className="text-sm font-bold"
            style={{ color: "var(--ax-text-primary)" }}
          >
            No orders yet
          </p>
          <p
            className="text-xs"
            style={{ color: "var(--ax-text-secondary)" }}
          >
            Your executed orders will appear here as a running ledger.
          </p>
        </div>
      ) : (
        <div className="ax-card divide-y overflow-hidden"
          style={{ borderColor: "var(--ax-border)" }}>
          {orders.map((o, i) => {
            const pnl = Number(o.pnl || 0);
            const pos = pnl >= 0;
            const side = (o.side || "BUY").toUpperCase();
            const sidePos = side === "BUY";
            return (
              <div
                key={o.id || `${o.symbol}-${i}`}
                className="px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className="text-sm font-bold"
                      style={{ color: "var(--ax-text-primary)" }}
                    >
                      {o.symbol || "—"}
                    </p>
                    <p
                      className="mt-0.5 text-xs"
                      style={{ color: "var(--ax-text-secondary)" }}
                    >
                      {o.exchange || "NSE"}
                      {o.productType ? ` · ${o.productType}` : ""}
                    </p>
                  </div>
                  <span
                    className="rounded px-2 py-0.5 text-[10px] font-bold tracking-wider"
                    style={{
                      backgroundColor: sidePos
                        ? "rgba(6, 182, 212,0.12)"
                        : "rgba(229,84,97,0.12)",
                      color: sidePos
                        ? "var(--ax-positive)"
                        : "var(--ax-negative)",
                    }}
                  >
                    {side}
                  </span>
                </div>
                <div
                  className="mt-3 grid grid-cols-3 gap-3 border-t pt-3 text-xs"
                  style={{ borderColor: "#F1F5F9" }}
                >
                  <Cell label="QTY" value={String(o.qty || 0)} />
                  <Cell
                    label="PRICE"
                    value={formatINR(o.avgPrice ?? o.price)}
                  />
                  <div className="text-right">
                    <p
                      className="text-[9px] font-medium uppercase tracking-wider"
                      style={{ color: "var(--ax-text-secondary)" }}
                    >
                      P&amp;L
                    </p>
                    <p
                      className="mt-0.5 text-sm font-bold"
                      style={{
                        color: pos
                          ? "var(--ax-positive)"
                          : "var(--ax-negative)",
                      }}
                    >
                      {pos ? "+" : ""}
                      {formatINR(pnl)}
                    </p>
                  </div>
                </div>
                {o.executedAt || o.createdAt ? (
                  <p
                    className="mt-2 text-[11px]"
                    style={{ color: "var(--ax-text-secondary)" }}
                  >
                    {formatDate(o.executedAt || o.createdAt)}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => void download()}
        disabled={downloading}
        className="flex w-full items-center justify-center gap-2 py-3 text-xs font-medium disabled:opacity-60"
        style={{ color: "var(--ax-text-secondary)" }}
      >
        <FiDownload className="h-4 w-4" />
        {downloading ? "Exporting…" : "Download Ledger CSV"}
      </button>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p
        className="text-[9px] font-medium uppercase tracking-wider"
        style={{ color: "var(--ax-text-secondary)" }}
      >
        {label}
      </p>
      <p
        className="mt-0.5 text-sm font-bold"
        style={{ color: "var(--ax-text-primary)" }}
      >
        {value}
      </p>
    </div>
  );
}
