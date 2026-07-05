"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { FiArrowLeft, FiBell, FiStar, FiTrendingDown, FiTrendingUp } from "react-icons/fi";
import { CandleChart } from "@/components/app/CandleChart";
import { OptionChain } from "@/components/app/OptionChain";
import { OrderModal } from "@/components/app/OrderModal";
import { resolveChartSymbol } from "@/components/app/chartResolve";
import { formatINR, formatPct } from "@/components/app/format";

const OPTION_EXCHANGES: Record<string, string> = {
  NSE: "NFO", BSE: "BFO", NFO: "NFO", BFO: "BFO", MCX: "MCX",
};

const OPTION_ELIGIBLE = new Set([
  "NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "SENSEX", "BANKEX",
  "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN",
  "BAJFINANCE", "AXISBANK", "KOTAKBANK", "LT", "WIPRO", "HCLTECH",
  "TATAMOTORS", "TATASTEEL", "MARUTI", "ADANIPORTS", "ONGC",
]);

const INDICES = new Set([
  "NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "SENSEX", "BANKEX",
]);

type Tab = "Chart" | "Option Chain" | "Details";

type DayDetails = {
  open?: number;
  high?: number;
  low?: number;
  prevClose?: number;
};

function getMarketStatus(exchange: string) {
  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const day = ist.getDay();
  const mins = ist.getHours() * 60 + ist.getMinutes();
  if (day === 0 || day === 6) return { label: "Weekend", color: "var(--ax-text-secondary)" };
  const open = 9 * 60 + 15;
  const close = exchange === "MCX" ? 23 * 60 + 30 : 15 * 60 + 30;
  if (mins >= open && mins < close) return { label: "Live", color: "var(--ax-positive)" };
  if (mins < open) return { label: "Pre-open", color: "#F59E0B" };
  return { label: "Closed", color: "var(--ax-text-secondary)" };
}

export default function StockDetailPage() {
  const params = useParams<{ symbol: string }>();
  const search = useSearchParams();

  const rawParam = decodeURIComponent(params.symbol || "NIFTY");
  const exchangeParam = search.get("exchange") || "";
  const resolved = resolveChartSymbol(
    exchangeParam && !rawParam.includes(":") && !rawParam.endsWith(".NS")
      ? rawParam
      : rawParam,
  );
  const symbol = resolved.symbol;
  const exchange = exchangeParam || resolved.exchange;
  const name = search.get("name") || symbol;
  const initialPrice = Number(search.get("price") || 0);
  const initialChangePct = Number(search.get("changePct") || 0);

  const [livePrice, setLivePrice] = useState(initialPrice);
  const [liveChange, setLiveChange] = useState(initialChangePct);
  const [dayDetails, setDayDetails] = useState<DayDetails>({});
  const [activeTab, setActiveTab] = useState<Tab>("Chart");
  const [isFavorite, setIsFavorite] = useState(false);
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [orderOpen, setOrderOpen] = useState(false);

  const marketStatus = useMemo(() => getMarketStatus(exchange), [exchange]);
  const positive = liveChange >= 0;
  const optionExchange = OPTION_EXCHANGES[exchange] ?? "NFO";
  const hasOptions = OPTION_ELIGIBLE.has(symbol.toUpperCase());
  const canTrade = !INDICES.has(symbol.toUpperCase());

  const changeAbs = useMemo(() => {
    if (dayDetails.prevClose) return livePrice - dayDetails.prevClose;
    return (livePrice * liveChange) / 100;
  }, [livePrice, liveChange, dayDetails.prevClose]);

  // Fetch live LTP + OHLC on mount
  useEffect(() => {
    fetch(
      `/api/angel/ltp?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange)}`,
      { credentials: "include" },
    )
      .then((r) => r.json())
      .then((d) => {
        if (!d?.data) return;
        const q = d.data;
        if (q.ltp) setLivePrice(Number(q.ltp));
        if (q.percentChange != null) setLiveChange(Number(q.percentChange));
        setDayDetails({
          open: q.open ? Number(q.open) : undefined,
          high: q.high ? Number(q.high) : undefined,
          low: q.low ? Number(q.low) : undefined,
          prevClose: q.close ? Number(q.close) : undefined,
        });
      })
      .catch(() => {});
  }, [symbol, exchange]);

  const TABS: Tab[] = ["Chart", ...(hasOptions ? (["Option Chain"] as Tab[]) : []), "Details"];

  function openBuy() { setOrderSide("BUY"); setOrderOpen(true); }
  function openSell() { setOrderSide("SELL"); setOrderOpen(true); }

  return (
    <>
      <div className={`space-y-4 ${canTrade ? "pb-24" : ""}`}>
        {/* Header */}
        <div className="flex items-center gap-2">
          <Link
            href="/app/markets"
            className="rounded-lg p-2 hover:bg-slate-100"
            style={{ color: "var(--ax-text-primary)" }}
          >
            <FiArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1 text-center">
            <p className="text-base font-bold" style={{ color: "var(--ax-text-primary)" }}>
              {symbol}
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: marketStatus.color }}
              />
              <span className="text-[10px] font-medium" style={{ color: marketStatus.color }}>
                {marketStatus.label}
              </span>
              <span className="text-[10px]" style={{ color: "#CBD5E1" }}>·</span>
              <span className="text-[10px]" style={{ color: "var(--ax-text-secondary)" }}>
                {exchange}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsFavorite((f) => !f)}
              className="rounded-lg p-2 hover:bg-slate-100"
            >
              <FiStar
                className="h-5 w-5"
                style={{ color: isFavorite ? "#F59E0B" : "var(--ax-text-secondary)" }}
                fill={isFavorite ? "#F59E0B" : "transparent"}
              />
            </button>
            <button type="button" className="rounded-lg p-2 hover:bg-slate-100">
              <FiBell className="h-5 w-5" style={{ color: "var(--ax-text-secondary)" }} />
            </button>
          </div>
        </div>

        {/* Hero price block */}
        <div className="bg-white px-1 py-2">
          <p className="text-sm" style={{ color: "var(--ax-text-secondary)" }}>
            {name || symbol}
          </p>
          <p className="mt-1 text-4xl font-bold tracking-tight" style={{ color: "var(--ax-text-primary)" }}>
            {livePrice > 0 ? formatINR(livePrice) : "—"}
          </p>
          <div className="mt-2 flex items-center gap-2.5">
            <div
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1"
              style={{
                background: positive ? "rgba(6,182,212,0.12)" : "rgba(229,84,97,0.12)",
              }}
            >
              {positive
                ? <FiTrendingUp className="h-3.5 w-3.5" style={{ color: "var(--ax-positive)" }} />
                : <FiTrendingDown className="h-3.5 w-3.5" style={{ color: "var(--ax-negative)" }} />}
              <span
                className="text-sm font-bold"
                style={{ color: positive ? "var(--ax-positive)" : "var(--ax-negative)" }}
              >
                {positive ? "+" : ""}{changeAbs.toFixed(2)}
              </span>
              <span
                className="text-xs font-medium"
                style={{ color: positive ? "var(--ax-positive)" : "var(--ax-negative)" }}
              >
                ({positive ? "+" : ""}{liveChange.toFixed(2)}%)
              </span>
            </div>
            <span className="text-xs" style={{ color: "var(--ax-text-secondary)" }}>Today</span>
          </div>

          {/* OHLC stats */}
          {(dayDetails.open != null || dayDetails.high != null || dayDetails.low != null || dayDetails.prevClose != null) && (
            <div
              className="mt-4 grid grid-cols-4 border-t pt-4"
              style={{ borderColor: "var(--ax-border)" }}
            >
              <OHLCStat label="Open" value={dayDetails.open} />
              <OHLCStat label="High" value={dayDetails.high} color="var(--ax-positive)" />
              <OHLCStat label="Low" value={dayDetails.low} color="var(--ax-negative)" />
              <OHLCStat label="Prev" value={dayDetails.prevClose} />
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div
          className="flex rounded-2xl p-1"
          style={{ background: "var(--ax-surface-muted, rgba(15,23,42,0.06))" }}
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className="flex-1 rounded-xl py-2 text-sm font-semibold transition"
              style={{
                background: activeTab === tab ? "var(--ax-surface, #fff)" : "transparent",
                color: activeTab === tab ? "var(--ax-text-primary)" : "var(--ax-text-secondary)",
                boxShadow: activeTab === tab ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "Chart" && (
          <CandleChart
            key={`${exchange}-${symbol}`}
            symbol={symbol}
            exchange={exchange}
            initialRange="5m"
            height={420}
            onPriceUpdate={(p: number) => p > 0 && setLivePrice(p)}
          />
        )}

        {activeTab === "Option Chain" && hasOptions && (
          <OptionChain
            symbol={symbol}
            exchange={optionExchange}
            spotChangePct={liveChange}
          />
        )}

        {activeTab === "Details" && (
          <div
            className="overflow-hidden rounded-2xl border bg-white"
            style={{ borderColor: "var(--ax-border)" }}
          >
            <DetailRow label="Symbol" value={`${exchange}:${symbol}`} />
            <DetailRow label="Name" value={name} />
            {dayDetails.open != null && (
              <DetailRow label="Open" value={formatINR(dayDetails.open)} />
            )}
            {dayDetails.high != null && (
              <DetailRow label="Day High" value={formatINR(dayDetails.high)} color="var(--ax-positive)" />
            )}
            {dayDetails.low != null && (
              <DetailRow label="Day Low" value={formatINR(dayDetails.low)} color="var(--ax-negative)" />
            )}
            {dayDetails.prevClose != null && (
              <DetailRow label="Previous Close" value={formatINR(dayDetails.prevClose)} />
            )}
            <DetailRow label="Market" value={marketStatus.label} color={marketStatus.color} />
          </div>
        )}
      </div>

      {/* BUY / SELL sticky bottom bar */}
      {canTrade && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white px-4 pb-4 pt-3 md:left-64"
          style={{ borderColor: "var(--ax-border)" }}
        >
          <div className="flex gap-3 mx-auto max-w-2xl">
            <button
              type="button"
              onClick={openBuy}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white transition active:scale-[0.98]"
              style={{ background: "var(--ax-positive)" }}
            >
              <FiTrendingUp className="h-4 w-4" />
              BUY
            </button>
            <button
              type="button"
              onClick={openSell}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white transition active:scale-[0.98]"
              style={{ background: "var(--ax-negative)" }}
            >
              <FiTrendingDown className="h-4 w-4" />
              SELL
            </button>
          </div>
        </div>
      )}

      {/* Order modal */}
      <OrderModal
        open={orderOpen}
        onClose={() => setOrderOpen(false)}
        side={orderSide}
        symbol={symbol}
        exchange={exchange}
        name={name}
        initialPrice={livePrice}
        onTradeComplete={() => setOrderOpen(false)}
      />
    </>
  );
}

function OHLCStat({
  label,
  value,
  color,
}: {
  label: string;
  value?: number;
  color?: string;
}) {
  return (
    <div>
      <p className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "var(--ax-text-secondary)" }}>
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold" style={{ color: color || "var(--ax-text-primary)" }}>
        {value != null ? Number(value).toFixed(2) : "—"}
      </p>
    </div>
  );
}

function DetailRow({
  label,
  value,
  color,
}: {
  label: string;
  value?: string | number;
  color?: string;
}) {
  return (
    <div
      className="flex items-center justify-between border-t px-4 py-3 first:border-t-0"
      style={{ borderColor: "var(--ax-border)" }}
    >
      <span className="text-sm" style={{ color: "var(--ax-text-secondary)" }}>{label}</span>
      <span className="text-sm font-semibold" style={{ color: color || "var(--ax-text-primary)" }}>
        {value ?? "—"}
      </span>
    </div>
  );
}
