"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FiChevronDown, FiX } from "react-icons/fi";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type OptionEntry = {
  symbol: string;
  token: string;
  ltp: number;
  change: number;
  changePct: number;
  oi: number;
  volume: number;
  bidPrice: number;
  askPrice: number;
  lotSize: number;
};

type ChainRow = {
  strike: number;
  CE?: OptionEntry;
  PE?: OptionEntry;
};

type ChainData = {
  symbol: string;
  expiry: string;
  exchange: string;
  spotPrice: number;
  atmStrike: number;
  expiries: string[];
  chain: ChainRow[];
};

type OrderTarget = {
  symbol: string;
  exchange: string;
  side: "BUY" | "SELL";
  name: string;
  price: number;
  optionType: string;
  strikePrice: number;
  expiry: string;
  lotSize: number;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function formatExpiry(exp: string) {
  if (!exp) return "—";
  const day = exp.slice(0, 2);
  const mon = exp.slice(2, 5);
  return `${day} ${mon.charAt(0)}${mon.slice(1).toLowerCase()}`;
}

function formatSignedPct(pct: number | undefined) {
  if (pct == null || !Number.isFinite(pct)) return "—";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function formatAgo(ms: number) {
  if (ms < 5000) return "now";
  if (ms < 60000) return `${Math.floor(ms / 1000)}s ago`;
  return `${Math.floor(ms / 60000)}m ago`;
}

function isMarketOpen(): boolean {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const day = ist.getUTCDay();
  if (day === 0 || day === 6) return false;
  const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30;
}

async function fetchChain(
  symbol: string,
  exchange: string,
  expiry: string,
): Promise<ChainData> {
  const qs = new URLSearchParams({ symbol, exchange });
  if (expiry) qs.set("expiry", expiry);
  const res = await fetch(`/api/angel/option-chain?${qs}`, {
    credentials: "include",
  });
  const data = (await res.json()) as ChainData & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

/* ------------------------------------------------------------------ */
/*  OrderModal                                                          */
/* ------------------------------------------------------------------ */
function OrderModal({
  target,
  onClose,
}: {
  target: OrderTarget | null;
  onClose: () => void;
}) {
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [marketOpen] = useState(isMarketOpen);

  useEffect(() => {
    if (target) {
      setQty(String(target.lotSize || 1));
      setPrice(target.price > 0 ? target.price.toFixed(2) : "");
      setOrderType("MARKET");
      setMsg(null);
    }
  }, [target]);

  if (!target) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const body = {
        symbol: target.symbol,
        exchange: target.exchange,
        side: target.side,
        qty: Number(qty),
        orderType,
        limitPrice: orderType === "LIMIT" ? Number(price) : undefined,
        productType: "NRML",
        optionType: target.optionType,
        strikePrice: target.strikePrice,
        expiry: target.expiry,
      };
      const res = await fetch("/api/trades/place", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? `HTTP ${res.status}`);
      setMsg({ text: data.message ?? "Order placed!", ok: true });
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setMsg({
        text: err instanceof Error ? err.message : "Order failed.",
        ok: false,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const isBuy = target.side === "BUY";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0" style={{ background: "rgba(17,24,39,0.6)" }} />
      <div
        className="relative z-10 w-full max-w-sm rounded-t-3xl p-6 pb-8 sm:rounded-2xl"
        style={{ background: "#ffffff" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-lg font-bold" style={{ color: "var(--ax-text-primary)" }}>
              {target.side} {target.name}
            </p>
            <p className="text-xs" style={{ color: "var(--ax-text-secondary)" }}>
              {target.exchange} · {target.optionType} · Exp: {formatExpiry(target.expiry)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="ml-2 p-1">
            <FiX className="h-5 w-5" style={{ color: "var(--ax-text-secondary)" }} />
          </button>
        </div>

        {/* LTP badge */}
        <div className="mb-4 flex items-center gap-2">
          <span
            className="rounded-full px-3 py-1 text-sm font-bold text-white"
            style={{ background: isBuy ? "#16C98D" : "#EF4E5B" }}
          >
            {isBuy ? "BUY" : "SELL"}
          </span>
          <span className="text-sm font-semibold" style={{ color: "var(--ax-text-secondary)" }}>
            LTP: ₹{target.price.toFixed(2)}
          </span>
        </div>

        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          {/* Order type toggle */}
          <div
            className="flex rounded-xl p-1"
            style={{ background: "var(--ax-surface-muted, rgba(15,23,42,0.06))" }}
          >
            {(["MARKET", "LIMIT"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setOrderType(t)}
                className="flex-1 rounded-lg py-1.5 text-xs font-semibold transition"
                style={{
                  background: orderType === t ? "#ffffff" : "transparent",
                  color: orderType === t ? "var(--ax-text-primary)" : "var(--ax-text-secondary)",
                  boxShadow: orderType === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--ax-text-secondary)" }}>
              Quantity (lots)
            </label>
            <input
              type="number"
              min="1"
              required
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
              style={{ borderColor: "var(--ax-border)", background: "#ffffff", color: "var(--ax-text-primary)" }}
            />
          </div>

          {orderType === "LIMIT" && (
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--ax-text-secondary)" }}>
                Limit price (₹)
              </label>
              <input
                type="number"
                min="0.05"
                step="0.05"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
                style={{ borderColor: "var(--ax-border)", background: "#ffffff", color: "var(--ax-text-primary)" }}
              />
            </div>
          )}

          {!marketOpen && (
            <div
              className="flex items-center gap-2 rounded-xl px-4 py-2.5"
              style={{ background: "rgba(217,119,6,0.10)" }}
            >
              <span className="text-sm">🔒</span>
              <p className="text-xs font-semibold" style={{ color: "#d97706" }}>
                Market closed · Mon–Fri 9:15 AM – 3:30 PM IST
              </p>
            </div>
          )}

          {msg && (
            <p
              className="rounded-xl px-4 py-2 text-sm"
              style={{
                background: msg.ok ? "rgba(22,163,74,0.08)" : "rgba(225,29,72,0.08)",
                color: msg.ok ? "#16a34a" : "#e11d48",
              }}
            >
              {msg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !marketOpen}
            className="w-full rounded-xl py-3 text-sm font-bold text-white transition disabled:opacity-60"
            style={{ background: isBuy ? "#16C98D" : "#EF4E5B" }}
          >
            {submitting ? "Placing…" : `${target.side} ${target.name}`}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SpotLine                                                            */
/* ------------------------------------------------------------------ */
function SpotLine({ spot, changePct }: { spot: number; changePct: number }) {
  const positive = changePct >= 0;
  return (
    <div className="flex items-center px-3 my-1">
      <div className="flex-1 h-px" style={{ background: "var(--ax-text-primary)" }} />
      <div
        className="flex items-center gap-2 rounded-full px-3 py-1 mx-2"
        style={{ background: "var(--ax-text-primary)" }}
      >
        <span className="text-xs font-bold text-white">
          {spot.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
        </span>
        {changePct ? (
          <span
            className="text-[10px] font-semibold"
            style={{ color: positive ? "#16C98D" : "#EF4E5B" }}
          >
            {positive ? "+" : ""}
            {changePct.toFixed(2)}%
          </span>
        ) : null}
      </div>
      <div className="flex-1 h-px" style={{ background: "var(--ax-text-primary)" }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  StrikeRow                                                           */
/* ------------------------------------------------------------------ */
function StrikeRow({
  row,
  isAtm,
  spot,
  onTrade,
}: {
  row: ChainRow;
  isAtm: boolean;
  spot: number;
  onTrade: (row: ChainRow, side: "BUY" | "SELL", type: "CE" | "PE") => void;
}) {
  const ceITM = spot > 0 && row.strike < spot;
  const peITM = spot > 0 && row.strike > spot;
  const ceDepth = ceITM ? Math.min(1, (spot - row.strike) / (spot * 0.02)) : 0;
  const peDepth = peITM ? Math.min(1, (row.strike - spot) / (spot * 0.02)) : 0;

  return (
    <div
      className="grid border-b"
      style={{
        gridTemplateColumns: "1fr 72px 1fr",
        borderColor: "var(--ax-border)",
        background: isAtm ? "rgba(22,201,141,0.04)" : undefined,
        minHeight: 52,
      }}
    >
      {/* CE cell */}
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => row.CE && onTrade(row, "BUY", "CE")}
          onContextMenu={(e) => { e.preventDefault(); row.CE && onTrade(row, "SELL", "CE"); }}
          className="flex flex-1 items-center px-3 py-2 transition hover:bg-sky-50 active:bg-sky-100"
          title="Click to BUY · Right-click to SELL"
        >
          {row.CE ? (
            <div className="flex-1">
              <p className="text-[13px] font-bold" style={{ color: "#16C98D" }}>
                ₹{row.CE.ltp.toFixed(2)}
              </p>
              <p className="text-[10px] font-semibold" style={{ color: "#16C98D" }}>
                {formatSignedPct(row.CE.changePct)}
              </p>
            </div>
          ) : (
            <span className="text-slate-300">—</span>
          )}
          <div className="mx-2 h-[3px] w-10 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{
                width: ceDepth > 0 ? `${Math.max(12, ceDepth * 100)}%` : 10,
                background: "#16C98D",
                marginLeft: "auto",
              }}
            />
          </div>
        </button>
      </div>

      {/* Strike */}
      <div className="flex items-center justify-center border-x" style={{ borderColor: "var(--ax-border)" }}>
        <span
          className="text-sm font-semibold"
          style={{ color: isAtm ? "var(--ax-primary)" : "var(--ax-text-primary)", fontWeight: isAtm ? 700 : 600 }}
        >
          {row.strike}
        </span>
      </div>

      {/* PE cell */}
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => row.PE && onTrade(row, "BUY", "PE")}
          onContextMenu={(e) => { e.preventDefault(); row.PE && onTrade(row, "SELL", "PE"); }}
          className="flex flex-1 items-center px-3 py-2 transition hover:bg-rose-50 active:bg-rose-100"
          title="Click to BUY · Right-click to SELL"
        >
          <div className="mx-2 h-[3px] w-10 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{
                width: peDepth > 0 ? `${Math.max(12, peDepth * 100)}%` : 10,
                background: "#EF4E5B",
              }}
            />
          </div>
          {row.PE ? (
            <div className="flex-1 text-right">
              <p className="text-[13px] font-bold" style={{ color: "#EF4E5B" }}>
                ₹{row.PE.ltp.toFixed(2)}
              </p>
              <p className="text-[10px] font-semibold" style={{ color: "#EF4E5B" }}>
                {formatSignedPct(row.PE.changePct)}
              </p>
            </div>
          ) : (
            <span className="text-right text-slate-300">—</span>
          )}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main OptionChain component                                          */
/* ------------------------------------------------------------------ */
export function OptionChain({
  symbol = "NIFTY",
  exchange = "NFO",
  spotChangePct = 0,
}: {
  symbol?: string;
  exchange?: string;
  spotChangePct?: number;
}) {
  const [data, setData] = useState<ChainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedExpiry, setSelectedExpiry] = useState("");
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(0);
  const [orderTarget, setOrderTarget] = useState<OrderTarget | null>(null);
  const [pulse, setPulse] = useState(false);

  const atmRowRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(
    async (expiry: string, silent = false) => {
      if (!silent) { setLoading(true); setError(null); }
      else setRefreshing(true);
      try {
        const res = await fetchChain(symbol, exchange, expiry);
        setData(res);
        if (!expiry && res.expiry) setSelectedExpiry(res.expiry);
        setLastUpdated(Date.now());
        setPulse(true);
        setTimeout(() => setPulse(false), 600);
      } catch (e) {
        if (!silent) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [symbol, exchange],
  );

  useEffect(() => { void load(selectedExpiry, false); }, [selectedExpiry, load]);

  // Auto-refresh every 3s
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (selectedExpiry) void load(selectedExpiry, true);
    }, 3000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [selectedExpiry, load]);

  // Scroll to ATM on first load
  useEffect(() => {
    if (data?.atmStrike && atmRowRef.current) {
      setTimeout(() => {
        atmRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [data?.atmStrike]);

  function openOrder(row: ChainRow, side: "BUY" | "SELL", type: "CE" | "PE") {
    const entry = type === "CE" ? row.CE : row.PE;
    if (!entry || !data) return;
    setOrderTarget({
      symbol: entry.symbol,
      exchange,
      side,
      name: `${symbol} ${row.strike} ${type}`,
      price: entry.ltp,
      optionType: type,
      strikePrice: row.strike,
      expiry: data.expiry,
      lotSize: entry.lotSize,
    });
  }

  if (loading && !data) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-2xl border py-16"
        style={{ borderColor: "var(--ax-border)", background: "#ffffff" }}
      >
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--ax-primary)", borderTopColor: "transparent" }} />
        <p className="text-sm" style={{ color: "var(--ax-text-secondary)" }}>Loading option chain…</p>
        <p className="text-xs" style={{ color: "var(--ax-text-secondary)" }}>First load fetches market data (~5–10s).</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-2xl border py-16"
        style={{ borderColor: "var(--ax-border)", background: "#ffffff" }}
      >
        <p className="text-sm" style={{ color: "var(--ax-text-secondary)" }}>{error}</p>
        <button
          type="button"
          onClick={() => void load(selectedExpiry, false)}
          className="rounded-full border px-4 py-1.5 text-xs font-semibold"
          style={{ borderColor: "var(--ax-primary)", color: "var(--ax-primary)" }}
        >
          Retry
        </button>
      </div>
    );
  }

  const spot = data?.spotPrice ?? 0;
  const chain = data?.chain ?? [];

  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{ borderColor: "var(--ax-border)", background: "#ffffff" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: "var(--ax-border)" }}
      >
        <p className="flex-1 text-xs font-medium" style={{ color: "var(--ax-text-secondary)" }}>
          Call price
        </p>

        {/* Expiry picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowExpiryPicker((v) => !v)}
            className="flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold"
            style={{
              borderColor: "var(--ax-border)",
              background: "var(--ax-surface-muted, #f8fafc)",
              color: "var(--ax-text-primary)",
            }}
          >
            {formatExpiry(selectedExpiry || data?.expiry || "")}
            <FiChevronDown
              className="h-3 w-3 transition-transform"
              style={{ transform: showExpiryPicker ? "rotate(180deg)" : undefined }}
            />
          </button>

          {showExpiryPicker && (data?.expiries?.length ?? 0) > 0 && (
            <div
              className="absolute left-1/2 top-8 z-20 -translate-x-1/2 flex flex-wrap gap-1.5 rounded-xl border p-2 shadow-lg"
              style={{ background: "#ffffff", borderColor: "var(--ax-border)", minWidth: 220 }}
            >
              {(data!.expiries.slice(0, 8)).map((exp) => {
                const active = exp === selectedExpiry;
                return (
                  <button
                    key={exp}
                    type="button"
                    onClick={() => { setSelectedExpiry(exp); setShowExpiryPicker(false); }}
                    className="rounded-full border px-3 py-1 text-[11px] font-semibold transition"
                    style={{
                      borderColor: active ? "var(--ax-primary)" : "var(--ax-border)",
                      background: active ? "var(--ax-primary)" : "#ffffff",
                      color: active ? "#fff" : "var(--ax-text-secondary)",
                    }}
                  >
                    {formatExpiry(exp)}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <p className="flex-1 text-right text-xs font-medium" style={{ color: "var(--ax-text-secondary)" }}>
          Put price
        </p>
      </div>

      {/* Live bar */}
      <div
        className="flex items-center gap-2 border-b px-4 py-2"
        style={{ borderColor: "var(--ax-border)", background: "var(--ax-surface-muted, #f8fafc)" }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full transition-opacity"
          style={{ background: "#16C98D", opacity: pulse ? 1 : 0.4 }}
        />
        <span className="text-[9px] font-bold tracking-widest" style={{ color: "#16C98D" }}>
          {refreshing ? "UPDATING" : "LIVE"}
          {lastUpdated > 0 && !refreshing ? ` · ${formatAgo(Date.now() - lastUpdated)}` : ""}
        </span>
        <span className="ml-auto text-[9px]" style={{ color: "var(--ax-text-secondary)" }}>
          Click to BUY · Right-click to SELL
        </span>
      </div>

      {/* Column labels */}
      <div
        className="grid border-b text-[9px] font-semibold uppercase tracking-wider"
        style={{ gridTemplateColumns: "1fr 72px 1fr", borderColor: "var(--ax-border)", color: "var(--ax-text-secondary)" }}
      >
        <div className="flex gap-4 px-3 py-1.5">
          <span>LTP</span><span>Chg%</span>
        </div>
        <div className="border-x px-1 py-1.5 text-center" style={{ borderColor: "var(--ax-border)" }}>Strike</div>
        <div className="flex justify-end gap-4 px-3 py-1.5">
          <span>Chg%</span><span>LTP</span>
        </div>
      </div>

      {/* Chain rows */}
      <div className="max-h-[520px] overflow-y-auto">
        {chain.map((row, idx) => {
          const prev = idx > 0 ? chain[idx - 1] : null;
          const crossesSpot = prev && spot > 0 && prev.strike < spot && row.strike >= spot;
          const isAtm = row.strike === data?.atmStrike;
          return (
            <div key={row.strike} ref={isAtm ? atmRowRef : undefined}>
              {crossesSpot && <SpotLine spot={spot} changePct={spotChangePct} />}
              <StrikeRow row={row} isAtm={isAtm} spot={spot} onTrade={openOrder} />
            </div>
          );
        })}
      </div>

      <OrderModal target={orderTarget} onClose={() => setOrderTarget(null)} />
    </div>
  );
}
