"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FiArrowRight,
  FiCheck,
  FiMinus,
  FiPlus,
  FiTrendingDown,
  FiTrendingUp,
  FiX,
} from "react-icons/fi";
import { formatINR } from "./format";
import { useAppData } from "./AppDataContext";

function checkMarketOpen(): boolean {
  const utc = Date.now();
  const ist = new Date(utc + 5.5 * 60 * 60 * 1000);
  const day = ist.getUTCDay();
  if (day === 0 || day === 6) return false;
  const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30;
}

const PRODUCT_TYPES = [
  { key: "CNC", label: "Delivery", desc: "Own the stock" },
  { key: "MIS", label: "Intraday", desc: "Square off by 3:15" },
  { key: "NRML", label: "Normal", desc: "Carry forward" },
];
const ORDER_TYPES = [
  { key: "MARKET", label: "Market", desc: "Execute at LTP" },
  { key: "LIMIT", label: "Limit", desc: "Your price" },
];
const QTY_PRESETS = [1, 5, 10, 25, 50, 100];
const LOT_MULTIPLIERS = [1, 2, 5, 10, 20, 50];

type SuccessData = {
  message: string;
  trade: { price: number };
  newBalance?: number;
};

export type OrderModalProps = {
  open: boolean;
  onClose: () => void;
  side: "BUY" | "SELL";
  symbol: string;
  exchange?: string;
  name?: string;
  initialPrice?: number;
  optionType?: string;
  strikePrice?: number;
  expiry?: string;
  defaultQty?: number;
  onTradeComplete?: () => void;
};

export function OrderModal({
  open,
  onClose,
  side,
  symbol,
  exchange = "NSE",
  name,
  initialPrice = 0,
  optionType,
  strikePrice,
  expiry,
  defaultQty = 1,
  onTradeComplete,
}: OrderModalProps) {
  const { user } = useAppData();
  const isOption = !!optionType;
  const isBuy = side === "BUY";
  const accent = isBuy ? "var(--ax-positive)" : "var(--ax-negative)";
  const accentRaw = isBuy ? "#06B6D4" : "#e55461";
  const accentBg = isBuy ? "rgba(6,182,212,0.08)" : "rgba(229,84,97,0.08)";
  const step = isOption ? Math.max(1, Number(defaultQty) || 1) : 1;
  const balance = Number(user?.tradingBalance ?? 0);

  const [qty, setQty] = useState(String(defaultQty));
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [limitPrice, setLimitPrice] = useState("");
  const [productType, setProductType] = useState(isOption ? "NRML" : "CNC");
  const [ltp, setLtp] = useState(initialPrice);
  const [ltpLoading, setLtpLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const [err, setErr] = useState("");
  const [marketOpen, setMarketOpen] = useState(checkMarketOpen);

  // Re-evaluate market status every minute
  useEffect(() => {
    const id = setInterval(() => setMarketOpen(checkMarketOpen()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Reset form and fetch fresh LTP when modal opens
  useEffect(() => {
    if (!open) return;
    setQty(String(defaultQty));
    setOrderType("MARKET");
    setLimitPrice("");
    setProductType(isOption ? "NRML" : "CNC");
    setLtp(initialPrice);
    setSuccess(null);
    setErr("");

    if (!isOption && symbol) {
      setLtpLoading(true);
      fetch(`/api/angel/ltp?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange)}`, {
        credentials: "include",
      })
        .then((r) => r.json())
        .then((d) => {
          if (d?.data?.ltp) setLtp(Number(d.data.ltp));
        })
        .catch(() => {})
        .finally(() => setLtpLoading(false));
    }
  }, [open, symbol, exchange, isOption, defaultQty, initialPrice]);

  // Keep ltp in sync with parent's live price when open
  useEffect(() => {
    if (open && initialPrice > 0) setLtp(initialPrice);
  }, [initialPrice, open]);

  const numQty = Math.max(0, parseInt(qty, 10) || 0);
  const effectivePrice = orderType === "LIMIT" ? parseFloat(limitPrice) || 0 : ltp;
  const estimatedValue = effectivePrice * numQty;
  const marginRequired = useMemo(() => {
    if (isOption) return estimatedValue;
    if (productType === "MIS") return estimatedValue * 0.2;
    return estimatedValue;
  }, [isOption, productType, estimatedValue]);
  const brokerage = useMemo(() => {
    if (isOption || productType === "MIS") return Math.min(20, estimatedValue * 0.0003);
    return 0;
  }, [isOption, productType, estimatedValue]);
  const insufficient = isBuy && balance < marginRequired + brokerage && numQty > 0;

  function adjustQty(dir: number) {
    setQty((prev) => {
      const cur = parseInt(prev, 10) || 0;
      const base = Math.round(cur / step) * step || step;
      const next = Math.max(step, base + dir * step);
      return String(next);
    });
  }

  async function handlePlace() {
    if (numQty <= 0) { setErr("Enter a quantity greater than 0."); return; }
    if (orderType === "LIMIT" && (!limitPrice || parseFloat(limitPrice) <= 0)) {
      setErr("Enter a valid limit price.");
      return;
    }
    setErr("");
    setPlacing(true);
    try {
      const res = await fetch("/api/trades/place", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol, exchange, side, qty: numQty,
          orderType,
          limitPrice: orderType === "LIMIT" ? parseFloat(limitPrice) : undefined,
          productType, optionType, strikePrice, expiry,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.message || "Order failed."); return; }
      setSuccess(data);
      setTimeout(() => {
        onTradeComplete?.();
        onClose();
      }, 1800);
    } catch {
      setErr("Something went wrong. Try again.");
    } finally {
      setPlacing(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(17,24,39,0.6)" }}
        onClick={onClose}
      />

      {/* Sheet — z-10 so it sits above the backdrop */}
      <div
        className="relative z-10 w-full overflow-hidden rounded-t-3xl pb-8 sm:max-w-md"
        style={{ background: "#ffffff", maxHeight: "92vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent stripe */}
        <div className="h-1 w-full" style={{ background: accentRaw }} />

        {/* Grabber */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-9 rounded-full" style={{ background: "#E2E8F0" }} />
        </div>

        {/* Success overlay */}
        {success ? (
          <div className="flex flex-col items-center px-8 py-10">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: accentRaw }}
            >
              <FiCheck className="h-8 w-8 text-white" strokeWidth={3} />
            </div>
            <p className="mt-4 text-xl font-bold" style={{ color: "var(--ax-text-primary)" }}>
              Order Placed
            </p>
            <p className="mt-1 text-sm text-center" style={{ color: "var(--ax-text-secondary)" }}>
              {success.message}
            </p>
            <div className="mt-4 w-full rounded-xl px-4 py-3" style={{ background: "#F8FAFC" }}>
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: "var(--ax-text-secondary)" }}>Executed at</span>
                <span className="text-sm font-bold" style={{ color: accentRaw }}>
                  {formatINR(success.trade?.price || 0)}
                </span>
              </div>
              {typeof success.newBalance === "number" && (
                <div className="mt-2 flex justify-between">
                  <span className="text-xs" style={{ color: "var(--ax-text-secondary)" }}>Balance now</span>
                  <span className="text-sm font-bold" style={{ color: "var(--ax-text-primary)" }}>
                    {formatINR(success.newBalance)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-2 pb-4">
              <div
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold"
                style={{ background: accentBg, color: accentRaw }}
              >
                {isBuy ? <FiTrendingUp className="h-3.5 w-3.5" /> : <FiTrendingDown className="h-3.5 w-3.5" />}
                {side}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-base font-bold" style={{ color: "var(--ax-text-primary)" }}>
                  {name || symbol}
                </p>
                <p className="text-xs" style={{ color: "var(--ax-text-secondary)" }}>
                  {exchange}{isOption ? ` · ${strikePrice} ${optionType}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: "#F1F5F9" }}
              >
                <FiX className="h-4 w-4" style={{ color: "var(--ax-text-secondary)" }} />
              </button>
            </div>

            {/* LTP ribbon */}
            <div
              className="mx-5 flex items-center justify-between rounded-xl border px-4 py-2.5"
              style={{ background: "#F8FAFC", borderColor: "#EEF2F6" }}
            >
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: "#06B6D4" }} />
                <span className="text-xs font-semibold tracking-wide" style={{ color: "var(--ax-text-secondary)" }}>LTP</span>
              </div>
              {ltpLoading ? (
                <div className="h-4 w-16 animate-pulse rounded" style={{ background: "#E2E8F0" }} />
              ) : (
                <span className="text-base font-bold" style={{ color: "var(--ax-text-primary)" }}>
                  {formatINR(ltp)}
                </span>
              )}
            </div>

            {/* Product type */}
            {!isOption && (
              <div className="px-5 mt-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ax-text-secondary)" }}>
                  Product
                </p>
                <div className="flex gap-2">
                  {PRODUCT_TYPES.map((pt) => (
                    <button
                      key={pt.key}
                      type="button"
                      onClick={() => setProductType(pt.key)}
                      className="flex-1 rounded-xl border py-2.5 text-center transition"
                      style={{
                        borderColor: productType === pt.key ? accentRaw : "#E2E8F0",
                        background: productType === pt.key ? accentBg : "#fff",
                        borderWidth: productType === pt.key ? 1.5 : 1,
                      }}
                    >
                      <p className="text-xs font-semibold" style={{ color: productType === pt.key ? accentRaw : "var(--ax-text-primary)" }}>
                        {pt.label}
                      </p>
                      <p className="text-[9px] mt-0.5" style={{ color: productType === pt.key ? accentRaw : "#94A3B8", opacity: 0.85 }}>
                        {pt.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Order type */}
            <div className="px-5 mt-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ax-text-secondary)" }}>
                Order Type
              </p>
              <div className="flex gap-2">
                {ORDER_TYPES.map((ot) => (
                  <button
                    key={ot.key}
                    type="button"
                    onClick={() => setOrderType(ot.key as "MARKET" | "LIMIT")}
                    className="flex-1 rounded-xl border py-2.5 text-center transition"
                    style={{
                      borderColor: orderType === ot.key ? "transparent" : "#E2E8F0",
                      background: orderType === ot.key ? accentRaw : "#fff",
                    }}
                  >
                    <p className="text-xs font-semibold" style={{ color: orderType === ot.key ? "#fff" : "var(--ax-text-primary)" }}>
                      {ot.label}
                    </p>
                    <p className="text-[9px] mt-0.5" style={{ color: orderType === ot.key ? "rgba(255,255,255,0.8)" : "#94A3B8" }}>
                      {ot.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="px-5 mt-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ax-text-secondary)" }}>
                  Quantity
                </p>
                <p className="text-[10px]" style={{ color: "#94A3B8" }}>
                  {isOption
                    ? `${Math.max(1, Math.round(numQty / step))} lot · ${step}/lot`
                    : "Shares"}
                </p>
              </div>
              <div className="flex items-center overflow-hidden rounded-xl border" style={{ borderColor: "#EEF2F6", background: "#F8FAFC" }}>
                <button type="button" onClick={() => adjustQty(-1)} className="px-5 py-3.5 hover:bg-slate-100">
                  <FiMinus className="h-4 w-4" style={{ color: "var(--ax-text-primary)" }} />
                </button>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="flex-1 bg-transparent py-3 text-center text-2xl font-bold outline-none"
                  style={{ color: "var(--ax-text-primary)" }}
                />
                <button type="button" onClick={() => adjustQty(1)} className="px-5 py-3.5 hover:bg-slate-100">
                  <FiPlus className="h-4 w-4" style={{ color: "var(--ax-text-primary)" }} />
                </button>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {(isOption ? LOT_MULTIPLIERS : QTY_PRESETS).map((n) => {
                  const chipQty = n * step;
                  const active = numQty === chipQty;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setQty(String(chipQty))}
                      className="rounded-full border px-3.5 py-1 text-xs font-semibold transition"
                      style={{
                        borderColor: active ? accentRaw : "#E2E8F0",
                        background: active ? accentBg : "#fff",
                        color: active ? accentRaw : "var(--ax-text-secondary)",
                        borderWidth: active ? 1.5 : 1,
                      }}
                    >
                      {isOption ? `${n}L` : String(n)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Limit price */}
            {orderType === "LIMIT" && (
              <div className="px-5 mt-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ax-text-secondary)" }}>
                  Limit Price
                </p>
                <div className="flex items-center overflow-hidden rounded-xl border px-4" style={{ borderColor: "#EEF2F6", background: "#F8FAFC" }}>
                  <span className="mr-2 text-lg font-semibold" style={{ color: "var(--ax-text-secondary)" }}>₹</span>
                  <input
                    type="number"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    placeholder={ltp.toFixed(2)}
                    className="flex-1 bg-transparent py-3.5 text-xl font-bold outline-none"
                    style={{ color: "var(--ax-text-primary)" }}
                  />
                </div>
              </div>
            )}

            {/* Summary card */}
            <div
              className="mx-5 mt-4 rounded-xl border p-3.5"
              style={{ background: "#F8FAFC", borderColor: "#EEF2F6" }}
            >
              {[
                { label: "Order Value", value: formatINR(estimatedValue) },
                { label: "Margin Required", value: formatINR(marginRequired) },
                { label: "Est. Brokerage", value: formatINR(brokerage) },
                {
                  label: "Available Balance",
                  value: formatINR(balance),
                  valueColor: insufficient ? "var(--ax-negative)" : undefined,
                },
              ].map((row, i) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between py-2"
                  style={{ borderBottom: i < 3 ? "1px solid #E2E8F0" : "none" }}
                >
                  <span className="text-xs" style={{ color: "var(--ax-text-secondary)" }}>{row.label}</span>
                  <span className="text-sm font-bold" style={{ color: row.valueColor || "var(--ax-text-primary)" }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {!marketOpen && (
              <div
                className="mx-5 mt-4 flex items-center gap-2 rounded-xl px-4 py-3"
                style={{ background: "rgba(217,119,6,0.10)" }}
              >
                <span className="text-base">🔒</span>
                <p className="text-xs font-semibold" style={{ color: "#d97706" }}>
                  Market closed · Mon–Fri 9:15 AM – 3:30 PM IST
                </p>
              </div>
            )}

            {insufficient && (
              <p className="mx-5 mt-1.5 text-center text-xs font-semibold" style={{ color: "var(--ax-negative)" }}>
                Need {formatINR(marginRequired + brokerage - balance)} more to place this order
              </p>
            )}

            {err && (
              <p className="mx-5 mt-2 text-center text-xs font-semibold" style={{ color: "var(--ax-negative)" }}>
                {err}
              </p>
            )}

            {/* Place button */}
            <button
              type="button"
              onClick={handlePlace}
              disabled={placing || insufficient || !marketOpen}
              className="mx-5 mt-4 flex w-[calc(100%-40px)] items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-white transition"
              style={{ background: accentRaw, opacity: placing || insufficient || !marketOpen ? 0.6 : 1 }}
            >
              {placing ? (
                <span>Placing...</span>
              ) : (
                <>
                  <span>
                    {side}
                    {numQty > 0
                      ? isOption
                        ? ` ${Math.max(1, Math.round(numQty / step))} LOT${Math.round(numQty / step) === 1 ? "" : "S"}`
                        : ` ${numQty}`
                      : ""}
                  </span>
                  <FiArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
