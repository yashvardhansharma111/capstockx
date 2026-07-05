"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type Range = {
  key: string;
  label: string;
  interval: string;
  range: string;
  refreshMs: number;
};

const RANGES: Range[] = [
  { key: "1m", label: "1m", interval: "ONE_MINUTE", range: "3D", refreshMs: 3000 },
  { key: "5m", label: "5m", interval: "FIVE_MINUTE", range: "5D", refreshMs: 5000 },
  { key: "15m", label: "15m", interval: "FIFTEEN_MINUTE", range: "1W", refreshMs: 10000 },
  { key: "1H", label: "1H", interval: "ONE_HOUR", range: "1M", refreshMs: 15000 },
  { key: "1D", label: "1D", interval: "ONE_DAY", range: "3M", refreshMs: 30000 },
  { key: "1W", label: "1W", interval: "ONE_DAY", range: "1Y", refreshMs: 0 },
];

const PADDING = { top: 16, bottom: 40, left: 0, right: 64 };
const VOLUME_RATIO = 0.18;
const POSITIVE = "#06B6D4";
const NEGATIVE = "#E55461";
const PRIMARY = "#DC2626";

type Props = {
  symbol?: string;
  exchange?: string;
  initialRange?: string;
  height?: number;
  showRanges?: boolean;
  onPriceUpdate?: (price: number) => void;
};

type Tick = {
  symbol?: string;
  exchange?: string;
  ltp?: number;
  high?: number;
  low?: number;
};

export function CandleChart({
  symbol = "NIFTY",
  exchange = "NSE",
  initialRange = "5m",
  height = 320,
  showRanges = true,
  onPriceUpdate,
}: Props) {
  const [rangeKey, setRangeKey] = useState(initialRange);
  const range = useMemo(
    () => RANGES.find((r) => r.key === rangeKey) || RANGES[1],
    [rangeKey],
  );

  const [candles, setCandles] = useState<Candle[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(0);
  const [crosshair, setCrosshair] = useState<number | null>(null);
  const [pulse, setPulse] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Observe container width for responsive sizing.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Defensive: if a caller passes a still-prefixed symbol ("NSE:NIFTY") or
  // Yahoo suffix (".NS"), strip it so the API gets a clean Angel symbol.
  const cleanSymbol = symbol.includes(":")
    ? symbol.split(":")[1]
    : symbol.endsWith(".NS")
      ? symbol.replace(".NS", "")
      : symbol.endsWith(".BO")
        ? symbol.replace(".BO", "")
        : symbol;

  const loadData = useCallback(
    async (r: Range, silent: boolean) => {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const qs = new URLSearchParams({
          symbol: cleanSymbol,
          exchange,
          range: r.range,
          interval: r.interval,
        }).toString();
        const res = await fetch(`/api/angel/candles?${qs}`, {
          credentials: "include",
        });
        const data = (await res.json()) as {
          candles?: Candle[];
          error?: string;
        };
        if (!res.ok || !data.candles?.length) {
          if (!silent) {
            setError(data.error || "No data available");
            setCandles(null);
          }
          return;
        }
        setCandles(data.candles);
        setLastUpdated(Date.now());
        setPulse(true);
        setTimeout(() => setPulse(false), 600);
        if (onPriceUpdate) {
          onPriceUpdate(data.candles[data.candles.length - 1].close);
        }
      } catch (e) {
        if (!silent) {
          setError(e instanceof Error ? e.message : "Failed to load chart");
          setCandles(null);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [cleanSymbol, exchange, onPriceUpdate],
  );

  // Initial + range change â†' full reload
  useEffect(() => {
    void loadData(range, false);
  }, [range, loadData]);

  // Silent background refresh
  useEffect(() => {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    if (range.refreshMs > 0) {
      refreshTimerRef.current = setInterval(() => {
        void loadData(range, true);
      }, range.refreshMs);
    }
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [range, loadData]);

  // Live LTP stream — updates last candle's close/high/low between refetches.
  const onPriceUpdateRef = useRef(onPriceUpdate);
  useEffect(() => {
    onPriceUpdateRef.current = onPriceUpdate;
  }, [onPriceUpdate]);

  useEffect(() => {
    if (range.refreshMs === 0) return;
    if (typeof window === "undefined") return;
    if (typeof EventSource === "undefined") return;

    const qs = new URLSearchParams({
      symbols: `${exchange}:${cleanSymbol}`,
      interval: "1500",
    }).toString();
    const es = new EventSource(`/api/angel/stream?${qs}`);

    es.onmessage = (evt) => {
      try {
        const parsed = JSON.parse(evt.data) as Tick[] | { error?: string };
        if (!Array.isArray(parsed)) return;
        const tick = parsed[0];
        if (!tick?.ltp) return;
        const ltp = Number(tick.ltp);
        setCandles((prev) => {
          if (!prev?.length) return prev;
          const updated = prev.slice();
          const last = { ...updated[updated.length - 1] };
          last.close = ltp;
          if (ltp > last.high) last.high = ltp;
          if (ltp < last.low) last.low = ltp;
          updated[updated.length - 1] = last;
          return updated;
        });
        onPriceUpdateRef.current?.(ltp);
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      // Browser auto-retries EventSource; nothing to do.
    };

    return () => es.close();
  }, [cleanSymbol, exchange, range.refreshMs]);

  const width = containerWidth;
  const drawArea = useMemo(
    () => ({
      x: PADDING.left,
      y: PADDING.top,
      w: Math.max(0, width - PADDING.left - PADDING.right),
      h: height - PADDING.top - PADDING.bottom,
    }),
    [width, height],
  );

  // Viewport — show more candles for short timeframes so they don't look blocky.
  const visibleCandles = useMemo(() => {
    if (!candles?.length) return [] as Candle[];
    const maxVisible = ["1m", "5m"].includes(rangeKey) ? 120 : 60;
    const take = Math.min(maxVisible, candles.length);
    return candles.slice(candles.length - take);
  }, [candles, rangeKey]);

  const { priceMin, priceMax, volMax } = useMemo(() => {
    if (!visibleCandles.length)
      return { priceMin: 0, priceMax: 1, volMax: 1 };
    let lo = Infinity;
    let hi = -Infinity;
    let vm = 0;
    for (const c of visibleCandles) {
      if (c.low < lo) lo = c.low;
      if (c.high > hi) hi = c.high;
      if (c.volume > vm) vm = c.volume;
    }
    const pad = (hi - lo) * 0.08 || 1;
    return { priceMin: lo - pad, priceMax: hi + pad, volMax: vm || 1 };
  }, [visibleCandles]);

  const candleWidth =
    visibleCandles.length && drawArea.w > 0
      ? drawArea.w / visibleCandles.length
      : 0;

  const priceToY = useCallback(
    (price: number) => {
      const volZone = drawArea.h * VOLUME_RATIO;
      const chartH = drawArea.h - volZone;
      const ratio = (price - priceMin) / (priceMax - priceMin || 1);
      return drawArea.y + chartH * (1 - ratio);
    },
    [drawArea, priceMin, priceMax],
  );

  const formatTime = useCallback(
    (ts: number) => {
      const d = new Date(ts * 1000);
      const intraday = ["1m", "5m", "15m", "1H"].includes(rangeKey);
      if (intraday) {
        return d.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
      }
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      });
    },
    [rangeKey],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (!visibleCandles.length || candleWidth <= 0) {
        setCrosshair(null);
        return;
      }
      const idx = Math.floor((x - drawArea.x) / candleWidth);
      if (idx >= 0 && idx < visibleCandles.length) setCrosshair(idx);
      else setCrosshair(null);
    },
    [visibleCandles, drawArea.x, candleWidth],
  );

  const handleMouseLeave = useCallback(() => setCrosshair(null), []);

  const latest = visibleCandles[visibleCandles.length - 1];
  const liveIsUp = latest ? latest.close >= latest.open : true;
  const liveColor = liveIsUp ? POSITIVE : NEGATIVE;

  const crosshairCandle =
    crosshair != null && crosshair < visibleCandles.length
      ? visibleCandles[crosshair]
      : null;

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-2xl bg-white"
      style={{ border: "1px solid var(--ax-border-light)" }}
    >
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        {crosshairCandle ? (
          <div className="flex flex-wrap gap-3 text-[11px]"
            style={{ color: "#94A3B8" }}>
            <OhlcPair label="O" value={crosshairCandle.open.toFixed(2)} />
            <OhlcPair
              label="H"
              value={crosshairCandle.high.toFixed(2)}
              color={POSITIVE}
            />
            <OhlcPair
              label="L"
              value={crosshairCandle.low.toFixed(2)}
              color={NEGATIVE}
            />
            <OhlcPair label="C" value={crosshairCandle.close.toFixed(2)} />
            <OhlcPair
              label="V"
              value={formatVolume(crosshairCandle.volume)}
            />
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: POSITIVE,
                opacity: range.refreshMs > 0 && pulse ? 1 : 0.45,
                boxShadow: pulse ? `0 0 6px ${POSITIVE}` : undefined,
                transition: "opacity 300ms ease",
              }}
            />
            <span
              className="text-[10px] font-bold tracking-wider"
              style={{ color: POSITIVE }}
            >
              LIVE · {range.label}
            </span>
            {lastUpdated > 0 ? (
              <span
                className="text-[10px]"
                style={{ color: "#94A3B8" }}
              >
                {formatAgo(Date.now() - lastUpdated)}
              </span>
            ) : null}
          </div>
        )}
        {latest ? (
          <div
            className="rounded px-2 py-0.5 text-[10px] font-bold text-white"
            style={{ backgroundColor: liveColor }}
          >
            {latest.close.toFixed(2)}
          </div>
        ) : null}
      </div>

      <div className="relative" style={{ height }}>
        {loading && !candles ? (
          <div
            className="flex h-full items-center justify-center text-xs"
            style={{ color: "var(--ax-text-secondary)" }}
          >
            Loading chart…
          </div>
        ) : error && !candles?.length ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <p
              className="text-sm"
              style={{ color: "var(--ax-text-secondary)" }}
            >
              {error}
            </p>
            <button
              type="button"
              onClick={() => void loadData(range, false)}
              className="rounded-full border px-3 py-1 text-xs font-semibold"
              style={{
                borderColor: PRIMARY,
                color: PRIMARY,
              }}
            >
              Retry
            </button>
          </div>
        ) : width > 0 ? (
          <svg
            width={width}
            height={height}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ display: "block" }}
          >
            {renderChart({
              candles: visibleCandles,
              drawArea,
              candleWidth,
              priceMin,
              priceMax,
              volMax,
              priceToY,
              formatTime,
              crosshair: crosshair ?? -1,
            })}
          </svg>
        ) : null}
      </div>

      {showRanges ? (
        <div className="m-2 flex gap-1 rounded-xl bg-slate-50 p-1">
          {RANGES.map((r) => {
            const active = r.key === rangeKey;
            return (
              <button
                type="button"
                key={r.key}
                onClick={() => {
                  setCrosshair(null);
                  setRangeKey(r.key);
                }}
                className="flex-1 rounded-lg py-1.5 text-xs font-semibold transition"
                style={
                  active
                    ? {
                        backgroundColor: "#fff",
                        color: PRIMARY,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                      }
                    : { color: "var(--ax-text-secondary)" }
                }
              >
                {r.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function renderChart({
  candles,
  drawArea,
  candleWidth,
  priceMin,
  priceMax,
  volMax,
  priceToY,
  formatTime,
  crosshair,
}: {
  candles: Candle[];
  drawArea: { x: number; y: number; w: number; h: number };
  candleWidth: number;
  priceMin: number;
  priceMax: number;
  volMax: number;
  priceToY: (p: number) => number;
  formatTime: (ts: number) => string;
  crosshair: number;
}) {
  if (!candles.length || candleWidth <= 0) return null;

  const bodyWidth = Math.max(1, Math.min(12, candleWidth * 0.6));
  const wickWidth = Math.max(0.5, Math.min(1.5, candleWidth * 0.08));
  const halfBody = bodyWidth / 2;
  const baseY = drawArea.y + drawArea.h;

  const elements: React.ReactNode[] = [];

  // Gridlines + price labels
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const price = priceMin + ((priceMax - priceMin) * i) / steps;
    const y = priceToY(price);
    elements.push(
      <line
        key={`grid-${i}`}
        x1={drawArea.x}
        y1={y}
        x2={drawArea.x + drawArea.w}
        y2={y}
        stroke="rgba(232,236,237,0.6)"
        strokeWidth={0.5}
        strokeDasharray="4,4"
      />,
    );
    elements.push(
      <text
        key={`plbl-${i}`}
        x={drawArea.x + drawArea.w + 4}
        y={y + 3}
        fontSize={9}
        fill="#9CA3A8"
        fontFamily="Inter, Arial, sans-serif"
      >
        {price >= 1000
          ? Math.round(price).toLocaleString("en-IN")
          : price.toFixed(2)}
      </text>,
    );
  }

  // Time labels
  const step = Math.max(1, Math.floor(candles.length / 5));
  for (let i = 0; i < candles.length; i += step) {
    const cx = drawArea.x + i * candleWidth + candleWidth / 2;
    elements.push(
      <text
        key={`tlbl-${i}`}
        x={cx}
        y={baseY + 14}
        fontSize={9}
        fill="#9CA3A8"
        textAnchor="middle"
        fontFamily="Inter, Arial, sans-serif"
      >
        {formatTime(candles[i].time)}
      </text>,
    );
  }

  // Candles + volume
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const cx = drawArea.x + i * candleWidth + candleWidth / 2;
    const isUp = c.close >= c.open;
    const color = isUp ? POSITIVE : NEGATIVE;
    const openY = priceToY(c.open);
    const closeY = priceToY(c.close);
    const highY = priceToY(c.high);
    const lowY = priceToY(c.low);
    const bodyTop = Math.min(openY, closeY);
    const bodyH = Math.max(1, Math.abs(closeY - openY));

    elements.push(
      <line
        key={`w-${i}`}
        x1={cx}
        y1={highY}
        x2={cx}
        y2={lowY}
        stroke={color}
        strokeWidth={wickWidth}
      />,
    );
    elements.push(
      <rect
        key={`b-${i}`}
        x={cx - halfBody}
        y={bodyTop}
        width={bodyWidth}
        height={bodyH}
        fill={color}
        rx={bodyWidth > 4 ? 1 : 0}
      />,
    );

    const vH = (c.volume / volMax) * drawArea.h * VOLUME_RATIO;
    elements.push(
      <rect
        key={`v-${i}`}
        x={cx - halfBody}
        y={baseY - vH}
        width={bodyWidth}
        height={Math.max(0.5, vH)}
        fill={isUp ? "rgba(6, 182, 212,0.18)" : "rgba(229,84,97,0.18)"}
        rx={bodyWidth > 4 ? 1 : 0}
      />,
    );
  }

  // Live price line + badge
  const latest = candles[candles.length - 1];
  if (latest) {
    const y = priceToY(latest.close);
    const isUp = latest.close >= latest.open;
    const color = isUp ? POSITIVE : NEGATIVE;
    elements.push(
      <line
        key="live-line"
        x1={drawArea.x}
        y1={y}
        x2={drawArea.x + drawArea.w}
        y2={y}
        stroke={color}
        strokeWidth={0.8}
        strokeDasharray="2,3"
        strokeOpacity={0.7}
      />,
    );
    elements.push(
      <rect
        key="live-badge"
        x={drawArea.x + drawArea.w + 1}
        y={y - 8}
        width={58}
        height={16}
        rx={3}
        fill={color}
      />,
    );
    elements.push(
      <text
        key="live-text"
        x={drawArea.x + drawArea.w + 30}
        y={y + 3}
        fontSize={9}
        fill="#fff"
        textAnchor="middle"
        fontFamily="Inter, Arial, sans-serif"
        fontWeight={600}
      >
        {latest.close.toFixed(2)}
      </text>,
    );
  }

  // Crosshair
  if (crosshair >= 0 && crosshair < candles.length) {
    const c = candles[crosshair];
    const cx = drawArea.x + crosshair * candleWidth + candleWidth / 2;
    const cy = priceToY(c.close);
    elements.push(
      <line
        key="ch-v"
        x1={cx}
        y1={drawArea.y}
        x2={cx}
        y2={baseY}
        stroke="rgba(220,38,38,0.5)"
        strokeWidth={0.8}
        strokeDasharray="3,3"
      />,
      <line
        key="ch-h"
        x1={drawArea.x}
        y1={cy}
        x2={drawArea.x + drawArea.w}
        y2={cy}
        stroke="rgba(220,38,38,0.5)"
        strokeWidth={0.8}
        strokeDasharray="3,3"
      />,
      <rect
        key="ch-badge"
        x={drawArea.x + drawArea.w + 1}
        y={cy - 8}
        width={58}
        height={16}
        rx={3}
        fill={PRIMARY}
      />,
      <text
        key="ch-text"
        x={drawArea.x + drawArea.w + 30}
        y={cy + 3}
        fontSize={9}
        fill="#fff"
        textAnchor="middle"
        fontFamily="Inter, Arial, sans-serif"
      >
        {c.close.toFixed(2)}
      </text>,
    );
  }

  return <>{elements}</>;
}

function OhlcPair({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <span className="whitespace-nowrap">
      {label}{" "}
      <span
        style={{
          color: color || "var(--ax-text-primary)",
          fontWeight: 700,
        }}
      >
        {value}
      </span>
    </span>
  );
}

function formatVolume(v: number) {
  if (v >= 10000000) return (v / 10000000).toFixed(1) + "Cr";
  if (v >= 100000) return (v / 100000).toFixed(1) + "L";
  if (v >= 1000) return (v / 1000).toFixed(1) + "K";
  return String(v);
}

function formatAgo(ms: number) {
  if (ms < 10000) return "now";
  if (ms < 60000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
  return `${Math.floor(ms / 3600000)}h ago`;
}
