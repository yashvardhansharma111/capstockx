"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import { useAppData } from "@/components/app/AppDataContext";
import { formatINR, formatPct } from "@/components/app/format";
import { buildStockHref } from "@/components/app/chartResolve";

type SearchHit = {
  symbol: string;
  name?: string;
  tradingsymbol?: string;
  exch_seg?: string;
};

async function j<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export default function ExplorePage() {
  const { dashboard, watchlist } = useAppData();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchHit[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      try {
        const data = await j<{ results?: SearchHit[] }>(
          `/api/angel/search?q=${encodeURIComponent(q)}`,
        );
        setResults(data.results || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  const equities = dashboard?.stocks || [];
  const funds = dashboard?.mutualFunds || [];
  const commodities = dashboard?.commodities || [];
  const watchItems = watchlist?.items || [];

  const topGainers = useMemo(
    () =>
      [...equities]
        .sort((a, b) => Number(b.changePct || 0) - Number(a.changePct || 0))
        .slice(0, 8),
    [equities],
  );

  const topLosers = useMemo(
    () =>
      [...equities]
        .sort((a, b) => Number(a.changePct || 0) - Number(b.changePct || 0))
        .slice(0, 8),
    [equities],
  );

  const isSearching = query.trim().length >= 2;

  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-xl font-bold"
          style={{ color: "var(--ax-text-primary)" }}
        >
          Explore
        </h2>
        <div
          className="mt-4 flex items-center gap-3 rounded-xl border px-4 py-3"
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
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stocks, options, ETFs…"
            className="w-full bg-transparent text-sm outline-none"
            style={{ color: "var(--ax-text-primary)" }}
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="rounded p-1"
              style={{ color: "var(--ax-text-secondary)" }}
            >
              <FiX className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {isSearching ? (
        <div className="ax-card overflow-hidden">
          {searching ? (
            <p
              className="px-4 py-6 text-center text-sm"
              style={{ color: "var(--ax-text-secondary)" }}
            >
              Searching…
            </p>
          ) : results.length ? (
            results.map((r, i) => {
              const sym = r.tradingsymbol || r.symbol;
              const exch = r.exch_seg || "NSE";
              const p = new URLSearchParams({ exchange: exch, name: r.name || sym, price: "0", changePct: "0" });
              const href = `/app/stock/${encodeURIComponent(sym)}?${p.toString()}`;
              return (
                <a
                  key={`${r.symbol}-${i}`}
                  href={href}
                  className="flex items-center justify-between border-t px-4 py-3 first:border-t-0 hover:bg-slate-50 transition"
                  style={{ borderColor: "var(--ax-border)" }}
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--ax-text-primary)" }}
                    >
                      {sym}
                    </p>
                    <p
                      className="mt-0.5 text-xs truncate"
                      style={{ color: "var(--ax-text-secondary)" }}
                    >
                      {r.name || ""} {exch ? `· ${exch}` : ""}
                    </p>
                  </div>
                  <span
                    className="ml-3 rounded px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: "var(--ax-primary-muted)", color: "var(--ax-primary)" }}
                  >
                    {exch}
                  </span>
                </a>
              );
            })
          ) : (
            <p
              className="px-4 py-6 text-center text-sm"
              style={{ color: "var(--ax-text-secondary)" }}
            >
              No matches.
            </p>
          )}
        </div>
      ) : (
        <>
          <Section title="Your watchlist" empty="Your watchlist is empty.">
            {watchItems.map((item) => {
              const positive = Number(item.changePct || 0) >= 0;
              return (
                <Card
                  key={item.symbol}
                  title={item.symbol}
                  subtitle={item.name || item.symbol}
                  value={formatINR(item.ltp)}
                  change={formatPct(item.changePct)}
                  positive={positive}
                  href={stockHref(
                    item.symbol,
                    item.name || item.symbol,
                    item.ltp,
                    item.changePct,
                  )}
                />
              );
            })}
          </Section>

          <Section
            title="Top gainers"
            empty="No market data available."
          >
            {topGainers.map((item) => (
              <Card
                key={item.symbol}
                title={item.symbol}
                subtitle={item.name || item.symbol}
                value={formatINR(item.ltp)}
                change={formatPct(item.changePct)}
                positive
                href={stockHref(
                  item.symbol,
                  item.name || item.symbol,
                  item.ltp,
                  item.changePct,
                )}
              />
            ))}
          </Section>

          <Section title="Top losers" empty="No market data available.">
            {topLosers.map((item) => (
              <Card
                key={item.symbol}
                title={item.symbol}
                subtitle={item.name || item.symbol}
                value={formatINR(item.ltp)}
                change={formatPct(item.changePct)}
                positive={false}
                href={stockHref(
                  item.symbol,
                  item.name || item.symbol,
                  item.ltp,
                  item.changePct,
                )}
              />
            ))}
          </Section>

          <Section title="Mutual funds" empty="No fund data.">
            {funds.map((item, i) => (
              <Card
                key={`${item.schemeCode || item.name}-${i}`}
                title={item.name}
                subtitle={item.category || item.fundHouse || "Mutual Fund"}
                value={`NAV ${formatINR(item.nav)}`}
                change={formatPct(item.changePct)}
                positive={Number(item.changePct || 0) >= 0}
              />
            ))}
          </Section>

          <Section title="Commodities" empty="No commodity data.">
            {commodities.map((item, i) => (
              <Card
                key={`${item.symbol || item.name}-${i}`}
                title={item.name}
                subtitle={item.symbol || ""}
                value={formatINR(item.value)}
                change={formatPct(item.changePct)}
                positive={Number(item.changePct || 0) >= 0}
              />
            ))}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children : [children];
  return (
    <section>
      <h3
        className="mb-3 text-base font-semibold"
        style={{ color: "var(--ax-text-primary)" }}
      >
        {title}
      </h3>
      {items.length ? (
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
          {items}
        </div>
      ) : (
        <p
          className="text-xs"
          style={{ color: "var(--ax-text-secondary)" }}
        >
          {empty}
        </p>
      )}
    </section>
  );
}

function Card({
  title,
  subtitle,
  value,
  change,
  positive,
  href,
}: {
  title: string;
  subtitle?: string;
  value: string;
  change: string;
  positive: boolean;
  href?: string;
}) {
  const inner = (
    <>
      <p
        className="truncate text-sm font-semibold"
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
      <p
        className="mt-3 text-base font-bold"
        style={{ color: "var(--ax-text-primary)" }}
      >
        {value}
      </p>
      <p
        className="mt-1 text-xs font-medium"
        style={{
          color: positive ? "var(--ax-positive)" : "var(--ax-negative)",
        }}
      >
        {change}
      </p>
    </>
  );
  if (href) {
    return (
      <a
        href={href}
        className="ax-card w-56 shrink-0 px-4 py-3 transition hover:border-sky-300"
      >
        {inner}
      </a>
    );
  }
  return (
    <div className="ax-card w-56 shrink-0 px-4 py-3">{inner}</div>
  );
}

function stockHref(
  symbol: string,
  name: string,
  ltp: number | undefined,
  changePct: number | undefined,
) {
  return buildStockHref(symbol, name, ltp, changePct);
}
