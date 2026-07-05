"use client";

import { useMemo } from "react";
import { useAppData } from "@/components/app/AppDataContext";
import { formatINR, formatPct } from "@/components/app/format";

export default function InvestmentsPage() {
  const { user, dashboard, loading } = useAppData();
  const funds = dashboard?.mutualFunds || [];

  const topGainer = useMemo(() => {
    if (!funds.length) return null;
    return [...funds].sort(
      (a, b) => Number(b.changePct || 0) - Number(a.changePct || 0),
    )[0];
  }, [funds]);

  const topLoser = useMemo(() => {
    if (!funds.length) return null;
    return [...funds].sort(
      (a, b) => Number(a.changePct || 0) - Number(b.changePct || 0),
    )[0];
  }, [funds]);

  return (
    <div className="space-y-6">
      <h2
        className="text-xl font-bold"
        style={{ color: "var(--ax-text-primary)" }}
      >
        Mutual Funds
      </h2>

      <div className="ax-card flex flex-wrap gap-6 p-5">
        <div className="flex-1 min-w-[140px]">
          <p
            className="text-xs"
            style={{ color: "var(--ax-text-secondary)" }}
          >
            Trading balance
          </p>
          <p
            className="mt-1 text-2xl font-bold"
            style={{ color: "var(--ax-text-primary)" }}
          >
            {formatINR(user?.tradingBalance ?? 0)}
          </p>
        </div>
        <div className="flex-1 min-w-[140px]">
          <p
            className="text-xs"
            style={{ color: "var(--ax-text-secondary)" }}
          >
            Margin
          </p>
          <p
            className="mt-1 text-2xl font-bold"
            style={{ color: "var(--ax-text-primary)" }}
          >
            {formatINR(user?.margin ?? 0)}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="ax-card p-5">
          <p
            className="text-xs font-medium"
            style={{ color: "var(--ax-text-secondary)" }}
          >
            Top gainer
          </p>
          <p
            className="mt-2 line-clamp-2 text-sm font-semibold"
            style={{ color: "var(--ax-text-primary)" }}
          >
            {topGainer?.name || "No data"}
          </p>
          <p
            className="mt-2 text-sm font-bold"
            style={{ color: "var(--ax-positive)" }}
          >
            {topGainer ? formatPct(topGainer.changePct) : "—"}
          </p>
        </div>
        <div className="ax-card p-5">
          <p
            className="text-xs font-medium"
            style={{ color: "var(--ax-text-secondary)" }}
          >
            Top loser
          </p>
          <p
            className="mt-2 line-clamp-2 text-sm font-semibold"
            style={{ color: "var(--ax-text-primary)" }}
          >
            {topLoser?.name || "No data"}
          </p>
          <p
            className="mt-2 text-sm font-bold"
            style={{ color: "var(--ax-negative)" }}
          >
            {topLoser ? formatPct(topLoser.changePct) : "—"}
          </p>
        </div>
      </div>

      <section>
        <h3
          className="mb-3 text-base font-semibold"
          style={{ color: "var(--ax-text-primary)" }}
        >
          All funds
        </h3>
        {loading && !funds.length ? (
          <p
            className="text-sm"
            style={{ color: "var(--ax-text-secondary)" }}
          >
            Loading…
          </p>
        ) : funds.length ? (
          <div className="ax-card divide-y overflow-hidden"
            style={{ borderColor: "var(--ax-border)" }}>
            {funds.map((item, i) => {
              const positive = Number(item.changePct || 0) >= 0;
              return (
                <div
                  key={`${item.schemeCode || item.name}-${i}`}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p
                      className="line-clamp-2 text-sm font-medium"
                      style={{ color: "var(--ax-text-primary)" }}
                    >
                      {item.name}
                    </p>
                    <p
                      className="mt-0.5 truncate text-xs"
                      style={{ color: "var(--ax-text-secondary)" }}
                    >
                      {item.category || item.fundHouse || "Mutual Fund"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--ax-text-primary)" }}
                    >
                      {formatINR(item.nav)}
                    </p>
                    <p
                      className="text-xs font-medium"
                      style={{
                        color: positive
                          ? "var(--ax-positive)"
                          : "var(--ax-negative)",
                      }}
                    >
                      {formatPct(item.changePct)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p
            className="text-sm"
            style={{ color: "var(--ax-text-secondary)" }}
          >
            No fund data available.
          </p>
        )}
      </section>
    </div>
  );
}
