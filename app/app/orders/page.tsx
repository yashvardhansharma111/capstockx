"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiDownload, FiRefreshCw, FiTrendingDown, FiTrendingUp, FiBarChart2 } from "react-icons/fi";
import { formatINR } from "@/components/app/format";
import { OrderModal } from "@/components/app/OrderModal";

const FILTERS = [
  { key: "positions", label: "Positions" },
  { key: "holdings", label: "Holdings" },
  { key: "history", label: "History" },
] as const;

type Filter = (typeof FILTERS)[number]["key"];

type Row = {
  id?: string;
  symbol?: string;
  side?: string;
  qty?: number;
  avgPrice?: number;
  ltp?: number;
  price?: number;
  pnl?: number;
  pnlPct?: number;
  optionType?: string;
  strikePrice?: number;
  exchange?: string;
  expiry?: string;
  productType?: string;
};

type Summary = {
  totalPnl?: number;
  totalInvested?: number;
  totalCurrent?: number;
};

async function j<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return (await res.json()) as T;
}

async function jtext(path: string): Promise<string> {
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

export default function OrdersPage() {
  const [activeFilter, setActiveFilter] = useState<Filter>("positions");
  const [positions, setPositions] = useState<Row[]>([]);
  const [holdings, setHoldings] = useState<Row[]>([]);
  const [history, setHistory] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalPnl: 0,
    totalInvested: 0,
    totalCurrent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [exitTarget, setSellTarget] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const [pos, hold, hist] = await Promise.all([
        j<{ positions?: Row[]; summary?: Summary }>(
          "/api/trades/positions",
        ).catch(
          () =>
            ({ positions: [], summary: {} }) as {
              positions?: Row[];
              summary?: Summary;
            },
        ),
        j<{ holdings?: Row[]; summary?: Summary }>(
          "/api/trades/holdings",
        ).catch(
          () =>
            ({ holdings: [], summary: {} }) as {
              holdings?: Row[];
              summary?: Summary;
            },
        ),
        j<{ orders?: Row[] }>("/api/trades/orders?limit=200").catch(
          () => ({ orders: [] }) as { orders?: Row[] },
        ),
      ]);
      setPositions(pos.positions || []);
      setHoldings(hold.holdings || []);
      setHistory(hist.orders || []);
      setSummary({
        totalPnl:
          (pos.summary?.totalPnl || 0) + (hold.summary?.totalPnl || 0),
        totalInvested:
          (pos.summary?.totalInvested || 0) +
          (hold.summary?.totalInvested || 0),
        totalCurrent:
          (pos.summary?.totalCurrent || 0) +
          (hold.summary?.totalCurrent || 0),
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    if (activeFilter === "positions") return positions;
    if (activeFilter === "holdings") return holdings;
    return history;
  }, [activeFilter, positions, holdings, history]);

  const { totalPnl = 0, totalInvested = 0 } = summary;
  const positive = totalPnl >= 0;
  const pnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  async function downloadLedger() {
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: "var(--ax-text-primary)" }}>
          Orders
        </h2>
        <button
          type="button"
          onClick={() => void load()}
          className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium"
          style={{
            borderColor: "var(--ax-border)",
            color: "var(--ax-text-primary)",
          }}
        >
          <FiRefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
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

      <div
        className="ax-card flex flex-wrap items-start justify-between gap-4 p-5"
        style={{
          borderLeftWidth: 4,
          borderLeftColor: positive
            ? "var(--ax-positive)"
            : "var(--ax-negative)",
        }}
      >
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--ax-text-secondary)" }}
          >
            Total P&amp;L
          </p>
          <p
            className="mt-1 text-3xl font-bold tracking-tight"
            style={{
              color: positive ? "var(--ax-positive)" : "var(--ax-negative)",
            }}
          >
            {positive ? "+" : ""}
            {formatINR(totalPnl)}
          </p>
          {totalInvested > 0 ? (
            <p
              className="mt-1 text-sm font-semibold"
              style={{
                color: positive
                  ? "var(--ax-positive)"
                  : "var(--ax-negative)",
              }}
            >
              {positive ? "+" : ""}
              {pnlPct.toFixed(2)}%
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = activeFilter === f.key;
          const count =
            f.key === "positions"
              ? positions.length
              : f.key === "holdings"
                ? holdings.length
                : history.length;
          return (
            <button
              type="button"
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className="flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition"
              style={
                active
                  ? {
                      backgroundColor: "var(--ax-primary)",
                      borderColor: "var(--ax-primary)",
                      color: "#fff",
                    }
                  : {
                      backgroundColor: "#fff",
                      borderColor: "var(--ax-border)",
                      color: "var(--ax-text-secondary)",
                    }
              }
            >
              {f.label}
              {count > 0 ? (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                  style={
                    active
                      ? {
                          backgroundColor: "rgba(255,255,255,0.25)",
                          color: "#fff",
                        }
                      : {
                          backgroundColor: "#F1F5F9",
                          color: "var(--ax-text-secondary)",
                        }
                  }
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {rows.length ? (
        <div className="ax-card divide-y overflow-hidden"
          style={{ borderColor: "var(--ax-border)" }}>
          {rows.map((item, idx) => {
            const isOption = !!item.optionType;
            const pnl = Number(item.pnl || 0);
            const positiveRow = pnl >= 0;
            const pnlPctVal =
              item.pnlPct != null ? Number(item.pnlPct) : null;
            const ltp = Number(item.ltp ?? item.price ?? 0);
            const title = isOption
              ? `${item.symbol || ""} ${item.strikePrice ?? ""}`
              : item.symbol || "—";
            return (
              <div
                key={item.id || `${item.symbol}-${idx}`}
                className="px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className="text-sm font-bold"
                        style={{ color: "var(--ax-text-primary)" }}
                      >
                        {title}
                      </p>
                      {isOption ? (
                        <Pill
                          text={item.optionType!}
                          variant={item.optionType as "CE" | "PE"}
                        />
                      ) : null}
                      <Pill
                        text={(item.side || "BUY").toUpperCase()}
                        variant={(item.side || "BUY").toUpperCase() as "BUY" | "SELL"}
                      />
                    </div>
                    <p
                      className="mt-1 text-[11px]"
                      style={{ color: "var(--ax-text-secondary)" }}
                    >
                      {item.exchange || "NSE"}
                      {isOption && item.expiry ? ` · ${item.expiry}` : ""}
                      {!isOption && item.productType
                        ? ` · ${item.productType}`
                        : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className="text-sm font-bold"
                      style={{ color: "var(--ax-text-primary)" }}
                    >
                      {formatINR(ltp)}
                    </p>
                    <p
                      className="text-[9px] font-medium tracking-wider"
                      style={{ color: "#94A3B8" }}
                    >
                      LTP
                    </p>
                  </div>
                </div>
                <div
                  className="mt-3 grid grid-cols-3 gap-3 border-t pt-3 text-xs"
                  style={{ borderColor: "#F1F5F9" }}
                >
                  <Cell label="QTY" value={String(item.qty || 0)} />
                  <Cell
                    label="AVG"
                    value={formatINR(item.avgPrice ?? item.price)}
                  />
                  <div className="text-right">
                    <p
                      className="text-[9px] font-medium uppercase tracking-wider"
                      style={{ color: "var(--ax-text-secondary)" }}
                    >
                      P&amp;L
                    </p>
                    <p
                      className="mt-0.5 flex items-center justify-end gap-1 text-sm font-bold"
                      style={{
                        color: positiveRow
                          ? "var(--ax-positive)"
                          : "var(--ax-negative)",
                      }}
                    >
                      {positiveRow ? (
                        <FiTrendingUp className="h-3 w-3" />
                      ) : (
                        <FiTrendingDown className="h-3 w-3" />
                      )}
                      {positiveRow ? "+" : ""}
                      {formatINR(pnl)}
                      {pnlPctVal != null
                        ? ` (${positiveRow ? "+" : ""}${pnlPctVal.toFixed(1)}%)`
                        : ""}
                    </p>
                  </div>
                </div>

                {/* SELL button — only on positions/holdings, not history */}
                {activeFilter !== "history" && (
                  <div className="mt-3 flex justify-end border-t pt-3" style={{ borderColor: "#F1F5F9" }}>
                    <button
                      type="button"
                      onClick={() => setSellTarget(item)}
                      className="rounded-xl px-5 py-2 text-xs font-bold text-white tracking-wide transition hover:opacity-90"
                      style={{ background: "var(--ax-negative)" }}
                    >
                      EXIT {item.qty}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : !loading ? (
        <div className="ax-card flex flex-col items-center gap-2 px-4 py-12 text-center">
          <FiBarChart2 className="h-10 w-10 opacity-30" style={{ color: "var(--ax-text-secondary)" }} />
          <p
            className="text-sm font-bold"
            style={{ color: "var(--ax-text-primary)" }}
          >
            {activeFilter === "positions"
              ? "No open positions"
              : activeFilter === "holdings"
                ? "No holdings yet"
                : "No trade history"}
          </p>
          <p
            className="text-xs"
            style={{ color: "var(--ax-text-secondary)" }}
          >
            Your trades will appear here once they execute.
          </p>
        </div>
      ) : (
        <div className="ax-card animate-pulse px-4 py-12 text-center text-sm"
          style={{ color: "var(--ax-text-secondary)" }}>
          Loading your trades…
        </div>
      )}

      <button
        type="button"
        onClick={() => void downloadLedger()}
        disabled={downloading}
        className="flex w-full items-center justify-center gap-2 py-3 text-xs font-medium disabled:opacity-60"
        style={{ color: "var(--ax-text-secondary)" }}
      >
        <FiDownload className="h-4 w-4" />
        {downloading ? "Exporting…" : "Download Ledger CSV"}
      </button>

      {/* SELL order modal */}
      <OrderModal
        open={!!exitTarget}
        onClose={() => setSellTarget(null)}
        side="SELL"
        symbol={exitTarget?.symbol ?? ""}
        exchange={exitTarget?.exchange ?? "NSE"}
        name={exitTarget?.symbol ?? ""}
        initialPrice={Number(exitTarget?.ltp ?? exitTarget?.price ?? 0)}
        optionType={exitTarget?.optionType}
        strikePrice={exitTarget?.strikePrice != null ? Number(exitTarget.strikePrice) : undefined}
        expiry={exitTarget?.expiry}
        defaultQty={Number(exitTarget?.qty ?? 1)}
        onTradeComplete={() => {
          setSellTarget(null);
          void load();
        }}
      />
    </div>
  );
}

function Pill({
  text,
  variant,
}: {
  text: string;
  variant: "CE" | "PE" | "BUY" | "SELL";
}) {
  const bg =
    variant === "CE" || variant === "BUY"
      ? "rgba(6, 182, 212,0.12)"
      : "rgba(229,84,97,0.12)";
  const fg =
    variant === "CE" || variant === "BUY"
      ? "var(--ax-positive)"
      : "var(--ax-negative)";
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider"
      style={{ backgroundColor: bg, color: fg }}
    >
      {text}
    </span>
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
