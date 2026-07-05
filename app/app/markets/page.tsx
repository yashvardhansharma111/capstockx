"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  FiBarChart2,
  FiBell,
  FiCalendar,
  FiLayers,
  FiMaximize2,
  FiRefreshCw,
  FiSearch,
  FiTrendingUp,
} from "react-icons/fi";
import { useAppData } from "@/components/app/AppDataContext";
import { formatINR, formatIndex, formatPct } from "@/components/app/format";
import { CandleChart } from "@/components/app/CandleChart";
import { buildStockHref, resolveChartSymbol } from "@/components/app/chartResolve";

const SUB_TABS = [
  "Explore",
  "Holdings",
  "Positions",
  "Orders",
  "Watchlist",
] as const;

const PRODUCT_TOOLS = [
  { key: "mtf", label: "MTF", Icon: FiLayers },
  { key: "sip", label: "Stock SIP", Icon: FiCalendar },
  { key: "etf", label: "ETF", Icon: FiTrendingUp },
  { key: "ipo", label: "IPO", Icon: FiBell, badge: 2 },
  { key: "bonds", label: "Bonds", Icon: FiBarChart2 },
];

export default function MarketsPage() {
  const { dashboard, watchlist, orders, loading, error, refresh } =
    useAppData();
  const [subTab, setSubTab] =
    useState<(typeof SUB_TABS)[number]>("Explore");
  const [commodityQuery, setCommodityQuery] = useState("");
  const [commoditySort, setCommoditySort] = useState<"name" | "move">("name");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const indices = dashboard?.indices || [];

  const selectedIndex =
    indices.find(
      (i) => (i.tvSymbol || i.symbol || i.name) === selectedKey,
    ) || indices[0] || null;
  // Prefer Yahoo-style `symbol` (keys in the resolver map) over `tvSymbol`
  // so "^NSEI" â†' NIFTY/NSE, "GC=F" â†' GOLD/MCX, etc.
  const chartTarget = resolveChartSymbol(
    selectedIndex?.symbol || selectedIndex?.tvSymbol,
  );
  const equities = dashboard?.stocks || [];
  const funds = dashboard?.mutualFunds || [];
  const commodities = dashboard?.commodities || [];
  const usdInr = dashboard?.usdInr ?? 83;
  const orderRows = orders?.orders || [];
  const watchItems = watchlist?.items || [];

  const holdings = orderRows.filter(
    (o) =>
      o.segmentKey === "positions" &&
      o.side === "BUY" &&
      Number(o.qty || 0) > 0,
  );
  const positions = orderRows.filter(
    (o) => o.segmentKey === "positions" && o.status === "OPEN",
  );
  const openOrders = orderRows.filter((o) => o.segmentKey === "openOrders");

  const filteredCommodities = useMemo(() => {
    let list = Array.isArray(commodities) ? [...commodities] : [];
    const q = commodityQuery.trim().toUpperCase();
    if (q) {
      list = list.filter(
        (c) =>
          (c.name || "").toUpperCase().includes(q) ||
          (c.symbol || "").toUpperCase().includes(q),
      );
    }
    if (commoditySort === "name") {
      list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else {
      list.sort(
        (a, b) =>
          Math.abs(Number(b.changePct || 0)) -
          Math.abs(Number(a.changePct || 0)),
      );
    }
    return list;
  }, [commodities, commodityQuery, commoditySort]);

  const totalHoldingsValue = holdings.reduce(
    (sum, h) => sum + Number(h.ltp || 0) * Number(h.qty || 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-bold"
            style={{ color: "var(--ax-text-primary)" }}
          >
            Markets
          </h2>
          {dashboard?.updatedAt ? (
            <p
              className="mt-1 text-xs"
              style={{ color: "var(--ax-text-secondary)" }}
            >
              Updated: {new Date(dashboard.updatedAt).toLocaleString()}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-60"
          style={{
            borderColor: "var(--ax-border)",
            color: "var(--ax-text-primary)",
          }}
        >
          <FiRefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

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

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 md:-mx-6 md:px-6">
        {indices.map((item, idx) => {
          const positive = Number(item.changePct || 0) >= 0;
          const key = item.tvSymbol || item.symbol || item.name || `i-${idx}`;
          const active =
            (selectedIndex?.tvSymbol ||
              selectedIndex?.symbol ||
              selectedIndex?.name) === key;
          return (
            <button
              type="button"
              onClick={() => setSelectedKey(key)}
              key={key}
              className="ax-card min-w-[172px] px-4 py-3 text-left transition"
              style={
                active
                  ? {
                      borderColor: "rgba(220,38,38,0.45)",
                      boxShadow: "0 0 0 2px rgba(220,38,38,0.18)",
                    }
                  : undefined
              }
            >
              <p
                className="text-xs font-medium"
                style={{ color: "var(--ax-text-secondary)" }}
              >
                {item.name}
              </p>
              <p
                className="mt-2 text-xl font-bold"
                style={{ color: "var(--ax-text-primary)" }}
              >
                {formatIndex(item.value)}
              </p>
              <p
                className="mt-1 text-xs font-medium"
                style={{
                  color: positive
                    ? "var(--ax-positive)"
                    : "var(--ax-negative)",
                }}
              >
                {positive ? "+" : ""}
                {formatIndex(item.change)} ({formatPct(item.changePct)})
              </p>
            </button>
          );
        })}
        {loading && indices.length === 0
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="ax-card min-w-[172px] animate-pulse px-4 py-3"
              >
                <div className="h-3 w-20 rounded bg-slate-200" />
                <div className="mt-3 h-5 w-24 rounded bg-slate-200" />
                <div className="mt-2 h-3 w-28 rounded bg-slate-200" />
              </div>
            ))
          : null}
      </div>

      {selectedIndex ? (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--ax-text-primary)" }}
              >
                {selectedIndex.name}
              </p>
              <p
                className="flex items-center gap-1 text-xs"
                style={{ color: "var(--ax-text-secondary)" }}
              >
                {chartTarget.exchange}:{chartTarget.symbol}
                <span className="mx-0.5" style={{ color: "#CBD5E1" }}>·</span>
                <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ background: "var(--ax-positive)" }} />
                <span style={{ color: "var(--ax-positive)" }}>Live</span>
              </p>
            </div>
            {/* Full details link — opens stock detail with Chart/Option Chain/Details tabs */}
            <Link
              href={buildStockHref(
                selectedIndex.symbol || selectedIndex.tvSymbol || "NIFTY",
                selectedIndex.name || "",
                Number(selectedIndex.value || 0),
                Number(selectedIndex.changePct || 0),
              )}
              className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition hover:opacity-80"
              style={{
                borderColor: "var(--ax-border)",
                color: "var(--ax-primary)",
                background: "var(--ax-primary-muted)",
              }}
            >
              <FiMaximize2 className="h-3 w-3" />
              Full details
            </Link>
          </div>
          <CandleChart
            key={`${chartTarget.exchange}-${chartTarget.symbol}`}
            symbol={chartTarget.symbol}
            exchange={chartTarget.exchange}
            initialRange="5m"
            height={320}
          />
        </div>
      ) : null}

      <div
        className="flex gap-5 overflow-x-auto border-b"
        style={{ borderColor: "var(--ax-border)" }}
      >
        {SUB_TABS.map((t) => {
          const active = subTab === t;
          return (
            <button
              type="button"
              key={t}
              onClick={() => setSubTab(t)}
              className="relative shrink-0 px-0.5 pb-2 pt-1 text-sm font-medium transition"
              style={{
                color: active
                  ? "var(--ax-text-primary)"
                  : "var(--ax-text-secondary)",
              }}
            >
              {t}
              {active ? (
                <span
                  className="absolute inset-x-0 -bottom-px h-0.5 rounded"
                  style={{ backgroundColor: "var(--ax-primary)" }}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {subTab === "Explore" ? (
        <div className="space-y-8">
          <section>
            <h3
              className="mb-3 text-base font-semibold"
              style={{ color: "var(--ax-text-primary)" }}
            >
              Most active right now
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {equities.map((item) => {
                const positive = Number(item.changePct || 0) >= 0;
                const logo = (item.name || item.symbol || "M")
                  .trim()
                  .slice(0, 2)
                  .toUpperCase();
                const href = buildStockHref(
                  item.symbol,
                  item.name || item.symbol,
                  item.ltp,
                  item.changePct,
                );
                return (
                  <a
                    key={item.symbol}
                    href={href}
                    className="ax-card block p-4 transition hover:border-sky-300"
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold"
                      style={{
                        backgroundColor: "var(--ax-primary-muted)",
                        color: "var(--ax-primary)",
                      }}
                    >
                      {logo}
                    </div>
                    <p
                      className="mt-3 line-clamp-2 text-sm font-medium"
                      style={{ color: "var(--ax-text-primary)" }}
                    >
                      {item.name || item.symbol}
                    </p>
                    <p
                      className="mt-2 text-lg font-bold"
                      style={{ color: "var(--ax-text-primary)" }}
                    >
                      {formatINR(item.ltp)}
                    </p>
                    <p
                      className="mt-1 text-xs font-medium"
                      style={{
                        color: positive
                          ? "var(--ax-positive)"
                          : "var(--ax-negative)",
                      }}
                    >
                      {formatINR(item.change)} ({formatPct(item.changePct)})
                    </p>
                  </a>
                );
              })}
            </div>
          </section>

          <section>
            <h3
              className="mb-3 text-base font-semibold"
              style={{ color: "var(--ax-text-primary)" }}
            >
              Live mutual funds
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {funds.map((item, i) => {
                const positive = Number(item.changePct || 0) >= 0;
                return (
                  <div
                    key={`${item.schemeCode || item.name}-${i}`}
                    className="ax-card p-4"
                  >
                    <p
                      className="line-clamp-2 text-sm font-medium"
                      style={{ color: "var(--ax-text-primary)" }}
                    >
                      {item.name}
                    </p>
                    <p
                      className="mt-1 truncate text-xs"
                      style={{ color: "var(--ax-text-secondary)" }}
                    >
                      {item.category || item.fundHouse || "Mutual Fund"}
                    </p>
                    <p
                      className="mt-3 text-lg font-bold"
                      style={{ color: "var(--ax-text-primary)" }}
                    >
                      NAV {formatINR(item.nav)}
                    </p>
                    <p
                      className="mt-1 text-xs font-medium"
                      style={{
                        color: positive
                          ? "var(--ax-positive)"
                          : "var(--ax-negative)",
                      }}
                    >
                      {positive ? "+" : ""}
                      {Number(item.change || 0).toFixed(2)} (
                      {formatPct(item.changePct)})
                    </p>
                    {item.asOf ? (
                      <p
                        className="mt-2 text-[11px]"
                        style={{ color: "var(--ax-text-secondary)" }}
                      >
                        As of {item.asOf}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          <section
            className="border-t pt-5"
            style={{ borderColor: "var(--ax-border)" }}
          >
            <div className="flex flex-wrap items-center gap-3">
              <h3
                className="text-base font-semibold"
                style={{ color: "var(--ax-text-primary)" }}
              >
                Commodities
              </h3>
              <div
                className="flex flex-1 items-center gap-2 rounded-xl border px-3 py-2"
                style={{
                  backgroundColor: "var(--ax-card-muted)",
                  borderColor: "var(--ax-border-light)",
                }}
              >
                <FiSearch
                  className="h-4 w-4"
                  style={{ color: "var(--ax-text-secondary)" }}
                />
                <input
                  value={commodityQuery}
                  onChange={(e) => setCommodityQuery(e.target.value)}
                  placeholder="Search"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  setCommoditySort((s) => (s === "name" ? "move" : "name"))
                }
                className="rounded-lg border px-3 py-1.5 text-xs font-medium"
                style={{
                  borderColor: "var(--ax-border)",
                  color: "var(--ax-primary)",
                }}
              >
                Sort: {commoditySort === "name" ? "A—Z" : "Movement"}
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredCommodities.map((item, i) => {
                const positive = Number(item.changePct || 0) >= 0;
                const accent = positive
                  ? "var(--ax-positive)"
                  : "var(--ax-negative)";
                const val = Number(item.value || 0);
                const chg = Number(item.change || 0);
                const price =
                  item.currency === "USD"
                    ? formatINR(val * usdInr)
                    : formatIndex(val);
                const chgLine =
                  item.currency === "USD"
                    ? `${formatINR(chg * usdInr)} (${formatPct(item.changePct)})`
                    : `${positive ? "+" : ""}${formatIndex(chg)} (${formatPct(item.changePct)})`;
                return (
                  <div
                    key={`${item.symbol || item.name}-${i}`}
                    className="ax-card flex overflow-hidden"
                  >
                    <div
                      className="w-1 shrink-0"
                      style={{ backgroundColor: accent }}
                    />
                    <div className="flex-1 px-3 py-3">
                      <p
                        className="truncate text-xs font-medium"
                        style={{ color: "var(--ax-text-primary)" }}
                      >
                        {item.name}
                      </p>
                      <p
                        className="mt-1 truncate text-[10px]"
                        style={{ color: "var(--ax-text-secondary)" }}
                      >
                        {item.currency === "USD"
                          ? "approx ₹ (USD×INR)"
                          : "Front contract"}
                      </p>
                      <p
                        className="mt-2 text-base font-bold"
                        style={{ color: "var(--ax-text-primary)" }}
                      >
                        {price}
                      </p>
                      <p
                        className="mt-1 text-[11px] font-medium"
                        style={{ color: accent }}
                      >
                        {chgLine}
                      </p>
                    </div>
                  </div>
                );
              })}
              {filteredCommodities.length === 0 && !loading ? (
                <p
                  className="col-span-full py-6 text-center text-sm"
                  style={{ color: "var(--ax-text-secondary)" }}
                >
                  No commodities match your search.
                </p>
              ) : null}
            </div>
          </section>

          <section>
            <h3
              className="mb-3 text-base font-semibold"
              style={{ color: "var(--ax-text-primary)" }}
            >
              Products and tools
            </h3>
            <div className="flex gap-6 overflow-x-auto pb-2">
              {PRODUCT_TOOLS.map(({ key, label, Icon, badge }) => (
                <div
                  key={key}
                  className="flex w-20 shrink-0 flex-col items-center text-center"
                >
                  <div
                    className="relative flex h-14 w-14 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: "var(--ax-primary-muted)" }}
                  >
                    <Icon
                      className="h-5 w-5"
                      style={{ color: "var(--ax-primary)" }}
                    />
                    {badge != null ? (
                      <span
                        className="absolute -right-1 -top-1 flex h-4 min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white"
                        style={{ backgroundColor: "var(--ax-negative)" }}
                      >
                        {badge}
                      </span>
                    ) : null}
                  </div>
                  <span
                    className="mt-2 text-xs"
                    style={{ color: "var(--ax-text-primary)" }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : subTab === "Holdings" ? (
        <div className="ax-card overflow-hidden">
          <div
            className="grid grid-cols-2 gap-3 border-b p-4"
            style={{ borderColor: "var(--ax-border)" }}
          >
            <InfoStat label="Current value" value={formatINR(totalHoldingsValue)} />
            <InfoStat label="Count" value={holdings.length.toString()} />
          </div>
          {holdings.length ? (
            holdings.map((item) => {
              const pnl =
                (Number(item.ltp || 0) - Number(item.avgPrice || 0)) *
                Number(item.qty || 0);
              const positive = pnl >= 0;
              return (
                <Row
                  key={item.id || item.symbol}
                  title={item.symbol || "—"}
                  subtitle={`Qty ${item.qty || 0} · Avg ${formatINR(item.avgPrice)}`}
                  value={`${positive ? "+" : ""}${formatINR(pnl)}`}
                  valueColor={
                    positive ? "var(--ax-positive)" : "var(--ax-negative)"
                  }
                />
              );
            })
          ) : (
            <Empty text="No holdings available." />
          )}
        </div>
      ) : subTab === "Positions" ? (
        <div className="ax-card overflow-hidden">
          {positions.length ? (
            positions.map((item) => {
              const pnl = Number(item.pnl || 0);
              const positive = pnl >= 0;
              return (
                <Row
                  key={item.id || item.symbol}
                  title={`${item.symbol || "—"} · ${item.side || ""}`}
                  subtitle={`Qty ${item.qty || 0} · LTP ${formatINR(item.ltp)}`}
                  value={`${positive ? "+" : ""}${formatINR(pnl)}`}
                  valueColor={
                    positive ? "var(--ax-positive)" : "var(--ax-negative)"
                  }
                />
              );
            })
          ) : (
            <Empty text="No open positions right now." />
          )}
        </div>
      ) : subTab === "Orders" ? (
        <div className="ax-card overflow-hidden">
          {openOrders.length ? (
            openOrders.map((item) => (
              <Row
                key={item.id || `${item.symbol}-${item.time}`}
                title={`${item.symbol || "—"} · ${item.side || ""}`}
                subtitle={`${item.segmentKey || ""} · ${item.time || "Live"}`}
                value={formatINR(item.orderPrice ?? item.ltp)}
              />
            ))
          ) : (
            <Empty text="No live orders available." />
          )}
        </div>
      ) : (
        <div className="ax-card overflow-hidden">
          {watchItems.length ? (
            watchItems.map((item) => {
              const positive = Number(item.changePct || 0) >= 0;
              return (
                <Row
                  key={item.symbol}
                  title={item.symbol}
                  subtitle={item.name || item.symbol}
                  value={formatPct(item.changePct)}
                  valueColor={
                    positive ? "var(--ax-positive)" : "var(--ax-negative)"
                  }
                />
              );
            })
          ) : (
            <Empty text="Your watchlist is empty." />
          )}
        </div>
      )}
    </div>
  );
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p
        className="text-xs"
        style={{ color: "var(--ax-text-secondary)" }}
      >
        {label}
      </p>
      <p
        className="mt-1 text-lg font-bold"
        style={{ color: "var(--ax-text-primary)" }}
      >
        {value}
      </p>
    </div>
  );
}

function Row({
  title,
  subtitle,
  value,
  valueColor,
}: {
  title: string;
  subtitle?: string;
  value?: string;
  valueColor?: string;
}) {
  return (
    <div
      className="flex items-center justify-between border-t px-4 py-3 first:border-t-0"
      style={{ borderColor: "var(--ax-border)" }}
    >
      <div className="min-w-0 pr-3">
        <p
          className="truncate text-sm font-medium"
          style={{ color: "var(--ax-text-primary)" }}
        >
          {title}
        </p>
        {subtitle ? (
          <p
            className="mt-0.5 truncate text-xs"
            style={{ color: "var(--ax-text-secondary)" }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {value ? (
        <p
          className="text-sm font-semibold"
          style={{ color: valueColor || "var(--ax-text-primary)" }}
        >
          {value}
        </p>
      ) : null}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p
      className="px-4 py-8 text-center text-sm"
      style={{ color: "var(--ax-text-secondary)" }}
    >
      {text}
    </p>
  );
}
