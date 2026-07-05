"use client";

import { useCallback, useEffect, useState } from "react";
import { adminJson } from "./adminFetch";

type RowKind =
  | "real-position"
  | "real-trade"
  | "admin-position"
  | "admin-trade";

type Position = {
  id: string;
  kind: RowKind;
  symbol: string;
  exchange: string;
  side: "BUY" | "SELL";
  qty: number;
  avgPrice: number;
  ltp: number;
  pnl: number;
  pnlPct: number;
  currentValue: number;
  investedValue: number;
  pnlOverridden: boolean;
};

type Trade = {
  id: string;
  kind: RowKind;
  symbol: string;
  exchange: string;
  side: string;
  qty: number;
  price: number;
  productType: string;
  status: string;
  pnl: number;
  pnlOverridden: boolean;
  createdAt?: string | Date;
  executedAt?: string | Date;
};

type LoadedData = {
  positions: Position[];
  trades: Trade[];
};

export function RealPositionsPanel({ scopeUserId }: { scopeUserId: string }) {
  const [data, setData] = useState<LoadedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!scopeUserId.trim()) {
      setData(null);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await adminJson<LoadedData>(
        `/api/admin/real-positions?scopeUserId=${encodeURIComponent(scopeUserId.trim())}`,
      );
      setData(res);
      setDrafts({});
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [scopeUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(kind: RowKind, id: string, raw: string) {
    setMsg(null);
    setErr(null);
    const trimmed = raw.trim();
    let pnlOverride: number | null;
    if (trimmed === "") {
      pnlOverride = null;
    } else {
      const n = Number(trimmed);
      if (!Number.isFinite(n)) {
        setErr("Override must be a number (or empty to clear)");
        return;
      }
      pnlOverride = n;
    }
    const draftKey = `${kind}:${id}`;
    setSavingId(draftKey);
    try {
      const isAdmin = kind === "admin-position" || kind === "admin-trade";
      await adminJson("/api/admin/real-positions", {
        method: "PATCH",
        body: JSON.stringify({
          kind,
          id,
          pnlOverride,
          ...(isAdmin ? { scopeUserId } : {}),
        }),
      });
      setMsg(
        pnlOverride === null
          ? "Override cleared. Live P&L will resume."
          : "Override saved.",
      );
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[draftKey];
        return next;
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingId(null);
    }
  }

  if (!scopeUserId.trim()) {
    return (
      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">
          Real positions (user-placed)
        </h3>
        <p className="mt-2 text-xs text-slate-500">
          Pick a scope user above to load and override their live P&amp;L.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            P&amp;L override (positions &amp; trades the user sees)
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Includes both <strong>real</strong> positions placed from the
            mobile app and <strong>admin-config</strong> rows from the editor
            below. Type a number and click <strong>Save</strong> to override
            what the user sees on mobile. Empty + Save clears the override.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {msg ? (
        <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900">
          {msg}
        </p>
      ) : null}
      {err ? (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-900">
          {err}
        </p>
      ) : null}

      {/* Open positions */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <th className="px-2 py-2 font-medium">Symbol</th>
              <th className="px-2 py-2 font-medium">Side</th>
              <th className="px-2 py-2 text-right font-medium">Qty</th>
              <th className="px-2 py-2 text-right font-medium">Avg</th>
              <th className="px-2 py-2 text-right font-medium">LTP</th>
              <th className="px-2 py-2 text-right font-medium">Live P/L</th>
              <th className="px-2 py-2 font-medium">Override</th>
              <th className="px-2 py-2 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {!data ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : data.positions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                  No positions for this user.
                </td>
              </tr>
            ) : (
              data.positions.map((p) => {
                const draftKey = `${p.kind}:${p.id}`;
                const draft =
                  drafts[draftKey] !== undefined
                    ? drafts[draftKey]
                    : p.pnlOverridden
                      ? String(p.pnl)
                      : "";
                const busy = savingId === draftKey;
                const isAdmin = p.kind === "admin-position";
                return (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="px-2 py-2 font-medium text-slate-900">
                      <span className="flex flex-wrap items-center gap-1">
                        {p.symbol}
                        <span className="text-[10px] text-slate-400">
                          {p.exchange}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                            isAdmin
                              ? "bg-violet-100 text-violet-700"
                              : "bg-sky-100 text-sky-700"
                          }`}
                        >
                          {isAdmin ? "ADMIN" : "REAL"}
                        </span>
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          p.side === "BUY"
                            ? "bg-sky-50 text-sky-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {p.side}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{p.qty}</td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {p.avgPrice.toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {p.ltp.toFixed(2)}
                    </td>
                    <td
                      className={`px-2 py-2 text-right font-mono tabular-nums ${
                        p.pnl >= 0 ? "text-sky-700" : "text-rose-700"
                      }`}
                    >
                      {p.pnl >= 0 ? "+" : ""}
                      {p.pnl.toFixed(2)}
                      {p.pnlOverridden ? (
                        <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold text-amber-800">
                          OVR
                        </span>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className="w-24 rounded border border-slate-200 px-2 py-1 text-right text-xs"
                        placeholder="empty = live"
                        value={draft}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [draftKey]: e.target.value,
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void save(p.kind, p.id, draft)}
                        className="rounded bg-sky-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                      >
                        {busy ? "…" : "Save"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Recent trades */}
      <h4 className="mt-6 text-sm font-semibold text-slate-900">
        Recent trades (history)
      </h4>
      <p className="mt-1 text-xs text-slate-500">
        Override realised P&amp;L on individual trade rows.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <th className="px-2 py-2 font-medium">Symbol</th>
              <th className="px-2 py-2 font-medium">Side</th>
              <th className="px-2 py-2 text-right font-medium">Qty</th>
              <th className="px-2 py-2 text-right font-medium">Price</th>
              <th className="px-2 py-2 font-medium">Status</th>
              <th className="px-2 py-2 text-right font-medium">P/L</th>
              <th className="px-2 py-2 font-medium">Override</th>
              <th className="px-2 py-2 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {!data ? null : data.trades.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                  No trades for this user.
                </td>
              </tr>
            ) : (
              data.trades.map((t) => {
                const draftKey = `${t.kind}:${t.id}`;
                const draft =
                  drafts[draftKey] !== undefined
                    ? drafts[draftKey]
                    : t.pnlOverridden
                      ? String(t.pnl)
                      : "";
                const busy = savingId === draftKey;
                const isAdmin = t.kind === "admin-trade";
                return (
                  <tr key={t.id} className="border-b border-slate-100">
                    <td className="px-2 py-2 font-medium text-slate-900">
                      <span className="flex flex-wrap items-center gap-1">
                        {t.symbol}
                        <span className="text-[10px] text-slate-400">
                          {t.exchange}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                            isAdmin
                              ? "bg-violet-100 text-violet-700"
                              : "bg-sky-100 text-sky-700"
                          }`}
                        >
                          {isAdmin ? "ADMIN" : "REAL"}
                        </span>
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          t.side === "BUY"
                            ? "bg-sky-50 text-sky-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {t.side}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{t.qty}</td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {Number(t.price || 0).toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-[11px] text-slate-600">
                      {t.status}
                    </td>
                    <td
                      className={`px-2 py-2 text-right font-mono tabular-nums ${
                        Number(t.pnl || 0) >= 0
                          ? "text-sky-700"
                          : "text-rose-700"
                      }`}
                    >
                      {Number(t.pnl || 0) >= 0 ? "+" : ""}
                      {Number(t.pnl || 0).toFixed(2)}
                      {t.pnlOverridden ? (
                        <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold text-amber-800">
                          OVR
                        </span>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className="w-24 rounded border border-slate-200 px-2 py-1 text-right text-xs"
                        placeholder="empty = clear"
                        value={draft}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [draftKey]: e.target.value,
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void save(t.kind, t.id, draft)}
                        className="rounded bg-sky-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                      >
                        {busy ? "…" : "Save"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
