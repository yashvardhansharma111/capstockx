"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiActivity,
  FiArrowRight,
  FiBarChart2,
  FiBookOpen,
  FiCheck,
  FiClock,
  FiDownload,
  FiGlobe,
  FiHeadphones,
  FiLayers,
  FiLock,
  FiLogIn,
  FiMail,
  FiMinus,
  FiPieChart,
  FiPlus,
  FiRefreshCw,
  FiShield,
  FiSmartphone,
  FiTrendingUp,
  FiUserCheck,
  FiZap,
} from "react-icons/fi";

const APK_URL: string =
  "https://www.dropbox.com/scl/fi/upz4z4t6zfwi7zgrnn94u/Capstockxs.apk?rlkey=lxcr4w9ktae7wn1uvhqdfmfie&st=4rxf2mco&dl=1";
const SUPPORT_EMAIL = "support@capstockx.in";

const TICKER = [
  { symbol: "NIFTY 50", value: "24,583.10", changePct: 0.42 },
  { symbol: "BANK NIFTY", value: "52,110.85", changePct: 0.71 },
  { symbol: "SENSEX", value: "80,920.15", changePct: 0.38 },
  { symbol: "RELIANCE", value: "2,914.30", changePct: 1.12 },
  { symbol: "HDFCBANK", value: "1,671.55", changePct: -0.23 },
  { symbol: "TCS", value: "3,948.20", changePct: 0.57 },
  { symbol: "INFY", value: "1,503.45", changePct: -0.18 },
  { symbol: "GOLD", value: "74,210.00", changePct: 0.95 },
  { symbol: "SILVER", value: "89,345.00", changePct: 1.34 },
  { symbol: "CRUDE", value: "6,728.00", changePct: -0.46 },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do I get an account?",
    a: "Fill out the signup form with your KYC details (PAN, Aadhaar, bank, signature). The Capstockx team reviews each request and emails your Client ID and password from support@capstockx.in once approved.",
  },
  {
    q: "How fresh is the market data?",
    a: "Candles stream from our Angel One integration. Intraday charts refresh every few seconds and the last candle ticks live between fetches using a server-sent-events stream.",
  },
  {
    q: "Can I use the web and Android app at the same time?",
    a: "Yes. Both share the same session and the same backend, so placing an order on one reflects on the other the moment you refresh.",
  },
  {
    q: "What markets are supported?",
    a: "NSE (equities + indices), BSE (SENSEX), and MCX (gold, silver, crude, natural gas, copper and more) — plus mutual funds with live NAV.",
  },
  {
    q: "Where can I reach support?",
    a: `Email ${SUPPORT_EMAIL}. Replies to your credential email land straight in the same inbox.`,
  },
];

const D = {
  bg: "#FFFFFF",
  panel: "#F8FAFC",
  panelMuted: "#F1F5F9",
  border: "#E2E8F0",
  primary: "#DC2626",
  primaryMuted: "rgba(220,38,38,0.12)",
  text: "#0F172A",
  textSec: "#475569",
  textMuted: "#475569",
  positive: "#10B981",
  negative: "#F04E5A",
  negativeMuted: "rgba(240,78,90,0.12)",
};

export default function HomePage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: loginId, password }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");
      router.replace("/app/markets");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  const isApkReady = APK_URL !== "#apk-coming-soon";

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ backgroundColor: D.bg, color: D.text }}
    >
      {/* Decorative background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[1100px]"
      >
        <div
          className="absolute -top-48 -left-32 h-[520px] w-[520px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, rgba(220,38,38,0.18), rgba(220,38,38,0))",
          }}
        />
        <div
          className="absolute -top-20 right-[-80px] h-[460px] w-[460px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, rgba(153,27,27,0.12), rgba(153,27,27,0))",
          }}
        />
        <div
          className="absolute bottom-0 left-1/2 h-[400px] w-[760px] -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, rgba(220,38,38,0.08), rgba(220,38,38,0))",
          }}
        />
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.25]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="cs-grid"
              width="36"
              height="36"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 36 0 L 0 0 0 36"
                fill="none"
                stroke="rgba(220,38,38,0.15)"
                strokeWidth="1"
              />
            </pattern>
            <radialGradient id="cs-grid-fade" cx="50%" cy="0%" r="80%">
              <stop offset="0%" stopColor="black" stopOpacity="1" />
              <stop offset="100%" stopColor="black" stopOpacity="0" />
            </radialGradient>
            <mask id="cs-grid-mask">
              <rect width="100%" height="100%" fill="url(#cs-grid-fade)" />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="url(#cs-grid)"
            mask="url(#cs-grid-mask)"
          />
        </svg>
      </div>

      {/* Header */}
      <header
        className="sticky top-0 z-20 backdrop-blur-md"
        style={{
          backgroundColor: "rgba(255,255,255,0.92)",
          borderBottom: `1px solid ${D.border}`,
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 md:px-6">
          <Link href="/" className="flex items-center gap-3 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Capstockx"
              className="h-10 w-10 rounded-xl object-contain transition-transform group-hover:scale-105"
              style={{ boxShadow: "0 0 20px rgba(220,38,38,0.25)" }}
            />
            <div className="leading-none">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: D.primary }}
              >
                Cap
              </p>
              <p className="mt-0.5 text-base font-bold" style={{ color: D.text }}>
                Stocks
              </p>
            </div>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            {[
              { href: "#features", label: "Features" },
              { href: "#how", label: "How it works" },
              { href: "#security", label: "Security" },
              { href: "#faq", label: "FAQ" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="hidden rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-slate-100 hover:text-slate-900 md:inline transition"
                style={{ color: D.textSec }}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* Ticker */}
      <div
        className="border-b"
        style={{ borderColor: D.border, backgroundColor: "#F8FAFC" }}
      >
        <div className="relative flex overflow-hidden">
          <div className="ax-marquee flex shrink-0 items-center gap-8 whitespace-nowrap px-6 py-2.5">
            {[...TICKER, ...TICKER].map((t, i) => {
              const positive = t.changePct >= 0;
              return (
                <span
                  key={`${t.symbol}-${i}`}
                  className="flex items-center gap-2 text-[11px] font-medium"
                  style={{ color: D.textSec }}
                >
                  <span className="font-semibold" style={{ color: D.text }}>
                    {t.symbol}
                  </span>
                  <span>{t.value}</span>
                  <span style={{ color: positive ? D.positive : D.negative }}>
                    {positive ? "+" : ""}
                    {t.changePct.toFixed(2)}%
                  </span>
                </span>
              );
            })}
          </div>
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 h-full w-16"
            style={{
              background: "linear-gradient(90deg, #F8FAFC, rgba(248,250,252,0))",
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute right-0 top-0 h-full w-16"
            style={{
              background: "linear-gradient(270deg, #F8FAFC, rgba(248,250,252,0))",
            }}
          />
        </div>
        <style jsx>{`
          .ax-marquee {
            animation: ax-marquee 40s linear infinite;
          }
          @keyframes ax-marquee {
            from {
              transform: translateX(0);
            }
            to {
              transform: translateX(-50%);
            }
          }
        `}</style>
      </div>

      {/* Hero */}
      <main className="relative">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pt-12 pb-16 md:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12 lg:pt-20 lg:pb-20">
          <div>
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold"
              style={{
                borderColor: "rgba(220,38,38,0.35)",
                backgroundColor: D.primaryMuted,
                color: D.primary,
              }}
            >
              <span
                className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
                style={{ backgroundColor: D.primary }}
              />
              LIVE MARKETS · NSE · BSE · MCX
            </span>

            <h1
              className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-[60px]"
              style={{ color: D.text }}
            >
              Trade smarter.
              <br />
              <span
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, #DC2626, #B91C1C)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                Wherever you are.
              </span>
            </h1>

            <p
              className="mt-5 max-w-xl text-base leading-relaxed sm:text-lg"
              style={{ color: D.textSec }}
            >
              Live charts, orders, mutual funds and a running ledger — all in
              one place. Sign in on the web, or take Capstockx with you on
              Android.{" "}
              <span className="font-semibold" style={{ color: D.text }}>
                One account. Every market.
              </span>
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#signin"
                className="group inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white transition hover:scale-[1.02]"
                style={{
                  background:
                    "linear-gradient(135deg, #DC2626 0%, #991B1B 100%)",
                  boxShadow: "0 0 24px rgba(220,38,38,0.35)",
                }}
              >
                <FiLogIn className="h-4 w-4" />
                Sign in
                <FiArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </a>
              <a
                href="#download"
                className="inline-flex items-center gap-2 rounded-xl border px-6 py-3.5 text-sm font-semibold transition hover:bg-slate-100"
                style={{
                  borderColor: D.border,
                  color: D.text,
                  backgroundColor: D.panel,
                }}
              >
                <FiDownload className="h-4 w-4" />
                Download APK
              </a>
            </div>

            <div
              className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs"
              style={{ color: D.textSec }}
            >
              <div className="flex items-center gap-1.5">
                <FiShield className="h-3.5 w-3.5" style={{ color: D.primary }} />
                <span>SEBI-aware onboarding</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FiZap className="h-3.5 w-3.5" style={{ color: D.primary }} />
                <span>Live ticks · sub-second</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FiHeadphones
                  className="h-3.5 w-3.5"
                  style={{ color: D.primary }}
                />
                <span>Human support</span>
              </div>
            </div>

            <ul className="mt-8 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {[
                "Real-time candlestick charts",
                "Positions · holdings · ledger",
                "Admin-approved onboarding",
                "Mutual funds in one view",
              ].map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2 text-sm"
                  style={{ color: D.textSec }}
                >
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: D.primaryMuted,
                      color: D.primary,
                    }}
                  >
                    <FiCheck className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Login card */}
          <div id="signin" className="relative">
            <div
              aria-hidden
              className="absolute -inset-6 -z-10 rounded-[32px] opacity-50 blur-2xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(220,38,38,0.30), rgba(153,27,27,0.20))",
              }}
            />
            <div
              className="relative overflow-hidden rounded-3xl border p-7 sm:p-8"
              style={{
                borderColor: D.border,
                backgroundColor: D.panel,
                boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
              }}
            >
              <div
                aria-hidden
                className="absolute -top-12 -right-12 h-40 w-40 rounded-full blur-2xl"
                style={{
                  background:
                    "radial-gradient(closest-side, rgba(220,38,38,0.15), rgba(220,38,38,0))",
                }}
              />

              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: D.primaryMuted,
                      color: D.primary,
                    }}
                  >
                    <FiLogIn className="h-4 w-4" />
                  </span>
                  <h2
                    className="text-lg font-bold"
                    style={{ color: D.text }}
                  >
                    Welcome back
                  </h2>
                </div>
                <span
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ backgroundColor: D.primaryMuted, color: D.primary }}
                >
                  <FiShield className="h-3 w-3" />
                  Secure
                </span>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label
                    className="text-xs font-medium"
                    style={{ color: D.textSec }}
                  >
                    Client ID or email
                  </label>
                  <input
                    type="text"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    className="mt-1 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-2"
                    style={{
                      borderColor: D.border,
                      backgroundColor: D.panelMuted,
                      color: D.text,
                    }}
                    placeholder="your-client-id"
                    autoComplete="username"
                  />
                </div>
                <div>
                  <label
                    className="text-xs font-medium"
                    style={{ color: D.textSec }}
                  >
                    Password
                  </label>
                  <div className="relative mt-1">
                    <FiLock
                      className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                      style={{ color: D.textSec }}
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border py-3 pl-9 pr-4 text-sm outline-none transition focus:ring-2"
                      style={{
                        borderColor: D.border,
                        backgroundColor: D.panelMuted,
                        color: D.text,
                      }}
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                {err ? (
                  <p
                    className="rounded-lg px-3 py-2 text-sm"
                    style={{
                      backgroundColor: D.negativeMuted,
                      color: D.negative,
                    }}
                  >
                    {err}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={loading || !loginId || !password}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background:
                      "linear-gradient(135deg, #DC2626 0%, #991B1B 100%)",
                    boxShadow: "0 0 20px rgba(220,38,38,0.30)",
                  }}
                >
                  {loading ? (
                    "Signing in…"
                  ) : (
                    <>
                      Continue
                      <FiArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>

              <div
                className="mt-6 rounded-xl border px-4 py-3 text-center text-sm"
                style={{
                  borderColor: D.border,
                  backgroundColor: D.panelMuted,
                  color: D.textSec,
                }}
              >
                New to Capstockx?{" "}
                <Link
                  href="/signup"
                  className="font-semibold"
                  style={{ color: D.primary }}
                >
                  Request account →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats strip */}
        <section
          className="border-y"
          style={{ borderColor: D.border, backgroundColor: D.panel }}
        >
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-8 text-center md:grid-cols-4 md:px-6">
            <Stat value="3" label="Exchanges · NSE / BSE / MCX" />
            <Stat value="1,000+" label="Symbols tracked live" />
            <Stat value="6" label="Timeframes · 1m → 1W" />
            <Stat value="< 2s" label="Tick-to-chart latency" />
          </div>
        </section>

        {/* How it works */}
        <section
          id="how"
          className="mx-auto max-w-6xl px-5 py-16 md:px-6 lg:py-24"
        >
          <div className="mb-12 max-w-2xl">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: D.primary }}
            >
              How it works
            </p>
            <h2
              className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
              style={{ color: D.text }}
            >
              Three steps to your first trade.
            </h2>
            <p className="mt-3 text-base" style={{ color: D.textSec }}>
              No cold onboarding. Every account is reviewed by the Capstockx
              Exchange team before it goes live.
            </p>
          </div>
          <div className="relative grid gap-5 md:grid-cols-3">
            <StepCard
              number="01"
              icon={FiUserCheck}
              title="Request your account"
              text="Fill in the signup form with KYC basics — name, email, phone, PAN, Aadhaar, bank and signature."
            />
            <StepCard
              number="02"
              icon={FiMail}
              title="Admin approval"
              text={`Our team verifies your details and emails your Client ID and password from ${SUPPORT_EMAIL}.`}
            />
            <StepCard
              number="03"
              icon={FiZap}
              title="Trade live"
              text="Sign in on web or Android, load real-time charts, and place orders in seconds."
            />
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="mx-auto max-w-6xl px-5 pb-16 md:px-6 lg:pb-24"
        >
          <div className="mb-10 max-w-2xl">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: D.primary }}
            >
              Everything you need
            </p>
            <h2
              className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
              style={{ color: D.text }}
            >
              One account. Every market.
            </h2>
            <p className="mt-3 text-base" style={{ color: D.textSec }}>
              The same live data your mobile app serves, laid out beautifully
              for the web.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={FiActivity}
              title="Live charts"
              text="Candlesticks, volume, live price line — intraday through weekly."
            />
            <FeatureCard
              icon={FiBarChart2}
              title="Markets feed"
              text="Indices, equities, mutual funds and commodities in one feed."
            />
            <FeatureCard
              icon={FiBookOpen}
              title="Orders & ledger"
              text="Positions, holdings and a running order ledger with CSV export."
            />
            <FeatureCard
              icon={FiPieChart}
              title="Mutual funds"
              text="Live NAV, top gainers and losers at a glance."
            />
            <FeatureCard
              icon={FiLayers}
              title="Options & F&O"
              text="CE / PE pricing, strike selection and clear side pills across positions."
            />
            <FeatureCard
              icon={FiRefreshCw}
              title="Live tick stream"
              text="Server-sent events update the last candle and LTPs between fetches."
            />
          </div>
        </section>

        {/* Product deep-dives */}
        <section
          className="border-y"
          style={{ borderColor: D.border, backgroundColor: D.panel }}
        >
          <div className="mx-auto max-w-6xl space-y-20 px-5 py-16 md:px-6 lg:py-24">
            <ProductRow
              badge="Charts"
              title="Real-time candlesticks, right in the browser."
              text="Six timeframes from 1m to 1W. Green/red candles, volume bars, a live price line that follows the stream, and a crosshair that reads out OHLC + volume on hover."
              bullets={[
                "Silent background refresh on a per-range schedule",
                "Live LTP stream updates the last candle's close, high and low",
                "Same Angel One data your mobile app uses",
              ]}
              visual={<ChartVisual />}
            />
            <ProductRow
              reverse
              badge="Orders"
              title="Positions, holdings and a running ledger."
              text="One card shows your total P&L with the invested and current figures alongside. Filter chips for positions, holdings and history — every executed order lands in the ledger."
              bullets={[
                "Total P&L hero with +/- color accents",
                "Exit / sell strip on open positions",
                "One-click CSV export for the full ledger",
              ]}
              visual={<OrdersVisual />}
            />
            <ProductRow
              badge="Markets"
              title="Indices, funds and commodities — one place."
              text="Tap an index to switch the hero chart. The Explore tab scrolls your watchlist, top gainers, top losers, mutual funds and commodity futures as horizontal cards."
              bullets={[
                "NSE · BSE · MCX coverage out of the box",
                "Mutual-fund NAV with change % baked in",
                "Commodities sorted by name or by today's move",
              ]}
              visual={<MarketsVisual />}
            />
          </div>
        </section>

        {/* Security */}
        <section
          id="security"
          className="mx-auto max-w-6xl px-5 py-16 md:px-6 lg:py-24"
        >
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: D.primary }}
              >
                Security you can feel
              </p>
              <h2
                className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
                style={{ color: D.text }}
              >
                Built with the basics done right.
              </h2>
              <p className="mt-3 text-base" style={{ color: D.textSec }}>
                No shortcuts on the parts that matter. Passwords are hashed.
                Sessions are HTTP-only cookies. Every account is reviewed
                manually before it ever places a trade.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <SecurityBullet
                  icon={FiLock}
                  title="bcrypt-hashed passwords"
                  text="Plain passwords never touch the database. All hashes are salted."
                />
                <SecurityBullet
                  icon={FiShield}
                  title="HTTP-only sessions"
                  text="Session cookies are inaccessible to client-side scripts."
                />
                <SecurityBullet
                  icon={FiUserCheck}
                  title="Admin-approved onboarding"
                  text="Every signup is reviewed before credentials are issued."
                />
                <SecurityBullet
                  icon={FiMail}
                  title="Branded email delivery"
                  text={`Credentials are sent from ${SUPPORT_EMAIL} — never shared.`}
                />
              </div>
            </div>
            <div
              className="relative overflow-hidden rounded-3xl border p-8"
              style={{
                borderColor: D.border,
                backgroundColor: D.panel,
                background:
                  "linear-gradient(135deg, rgba(220,38,38,0.10), rgba(153,27,27,0.06))",
              }}
            >
              <div
                aria-hidden
                className="absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl"
                style={{
                  background:
                    "radial-gradient(closest-side, rgba(220,38,38,0.20), rgba(220,38,38,0))",
                }}
              />
              <FiShield
                className="h-10 w-10"
                style={{ color: D.primary }}
              />
              <p
                className="mt-6 text-xl font-semibold leading-snug"
                style={{ color: D.text }}
              >
                &ldquo;Trading infrastructure shouldn&apos;t feel intimidating.
                We handle the boring security parts so you can focus on the
                markets.&rdquo;
              </p>
              <p className="mt-4 text-sm font-medium" style={{ color: D.textSec }}>
                — Capstockx team
              </p>
              <div
                className="mt-8 flex flex-wrap gap-2 border-t pt-6 text-[10px] font-semibold uppercase tracking-wider"
                style={{ borderColor: D.border, color: D.textSec }}
              >
                {[
                  "TLS everywhere",
                  "No 3rd-party sharing",
                  "Manual onboarding",
                  "Audit trail",
                ].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border px-3 py-1"
                    style={{
                      borderColor: D.border,
                      backgroundColor: D.panelMuted,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Download */}
        <section
          id="download"
          className="border-y"
          style={{ borderColor: D.border, backgroundColor: "#F8FAFC" }}
        >
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:px-6 md:py-20 lg:grid-cols-2 lg:items-center">
            <div>
              <span
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold"
                style={{
                  backgroundColor: "rgba(220,38,38,0.15)",
                  color: "#DC2626",
                }}
              >
                <FiSmartphone className="h-3.5 w-3.5" />
                Android app
              </span>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Trade on the go.
              </h2>
              <p className="mt-3 max-w-xl text-base text-slate-600">
                Install the APK to get live markets, orders and mutual funds on
                your phone. Your web and mobile accounts share the same session.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={APK_URL}
                  target={isApkReady ? "_blank" : undefined}
                  rel={isApkReady ? "noreferrer" : undefined}
                  aria-disabled={!isApkReady}
                  className="inline-flex items-center gap-3 rounded-xl px-5 py-3.5 text-sm font-semibold shadow-lg transition"
                  style={{
                    backgroundColor: isApkReady ? D.primary : "#E2E8F0",
                    color: isApkReady ? "#fff" : "#64748B",
                    pointerEvents: isApkReady ? "auto" : "none",
                    boxShadow: isApkReady
                      ? "0 10px 30px -12px rgba(220,38,38,0.45)"
                      : undefined,
                  }}
                >
                  <FiDownload className="h-5 w-5" />
                  <span className="flex flex-col items-start leading-tight">
                    <span className="text-[10px] font-medium uppercase tracking-wider opacity-80">
                      {isApkReady ? "Download" : "Coming soon"}
                    </span>
                    <span>Android APK</span>
                  </span>
                </a>
                <a
                  href="#signin"
                  className="inline-flex items-center gap-3 rounded-xl border border-slate-200 px-5 py-3.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                >
                  <FiZap className="h-5 w-5" style={{ color: "#DC2626" }} />
                  <span className="flex flex-col items-start leading-tight">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                      Or open
                    </span>
                    <span>Web version</span>
                  </span>
                </a>
              </div>
              <div className="mt-8 grid grid-cols-3 gap-3 text-center">
                {[
                  { icon: FiGlobe, label: "NSE · BSE · MCX" },
                  { icon: FiClock, label: "Live · < 2s latency" },
                  { icon: FiHeadphones, label: "Email support" },
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-3"
                  >
                    <Icon
                      className="mx-auto h-4 w-4"
                      style={{ color: "#DC2626" }}
                    />
                    <p className="mt-2 text-[11px] font-medium text-slate-600">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
              {!isApkReady ? (
                <p className="mt-4 text-xs text-slate-400">
                  The download link will be enabled once the EAS build is
                  published.
                </p>
              ) : null}
            </div>

            {/* Phone mockup */}
            <div className="relative mx-auto w-full max-w-sm">
              <div
                className="absolute -inset-8 rounded-[48px] opacity-70 blur-3xl"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(220,38,38,0.35), rgba(153,27,27,0.25))",
                }}
              />
              <div className="relative overflow-hidden rounded-[36px] border border-slate-200 bg-slate-50 p-3 shadow-2xl">
                <div
                  className="overflow-hidden rounded-[28px]"
                  style={{ backgroundColor: D.panel }}
                >
                  <div
                    className="flex items-center justify-between px-4 py-3 text-[10px] font-semibold"
                    style={{ color: D.text }}
                  >
                    <span>Markets</span>
                    <span
                      className="flex items-center gap-1"
                      style={{ color: D.primary }}
                    >
                      <span
                        className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
                        style={{ backgroundColor: D.primary }}
                      />
                      LIVE
                    </span>
                  </div>
                  <MockChart />
                  <div className="grid grid-cols-2 gap-2 p-3">
                    {TICKER.slice(0, 4).map((t) => {
                      const positive = t.changePct >= 0;
                      return (
                        <div
                          key={t.symbol}
                          className="rounded-xl border p-2.5"
                          style={{ borderColor: D.border }}
                        >
                          <p
                            className="text-[10px] font-medium"
                            style={{ color: D.textSec }}
                          >
                            {t.symbol}
                          </p>
                          <p
                            className="mt-1 text-sm font-bold"
                            style={{ color: D.text }}
                          >
                            {t.value}
                          </p>
                          <p
                            className="mt-0.5 text-[10px] font-semibold"
                            style={{
                              color: positive ? D.positive : D.negative,
                            }}
                          >
                            {positive ? "+" : ""}
                            {t.changePct.toFixed(2)}%
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonial */}
        <section className="mx-auto max-w-5xl px-5 py-16 md:px-6 lg:py-24">
          <div
            className="relative overflow-hidden rounded-3xl border p-8 text-center md:p-12"
            style={{
              borderColor: D.border,
              background:
                "linear-gradient(135deg, rgba(220,38,38,0.08), rgba(153,27,27,0.05))",
              backgroundColor: D.panel,
            }}
          >
            <svg
              aria-hidden
              width="40"
              height="30"
              viewBox="0 0 40 30"
              className="mx-auto mb-6 opacity-20"
              style={{ color: D.primary }}
            >
              <path
                d="M9 30C3.4 30 0 26.6 0 21C0 15.4 3.4 12 9 12C10.4 12 11.7 12.3 13 12.7C12 5.8 7 0 0 0V4C4 4 7 7 7 11C7 11.3 7 11.7 6.9 12C4 13.5 2 16.5 2 21C2 26.6 5.4 30 9 30ZM31 30C25.4 30 22 26.6 22 21C22 15.4 25.4 12 31 12C32.4 12 33.7 12.3 35 12.7C34 5.8 29 0 22 0V4C26 4 29 7 29 11C29 11.3 29 11.7 28.9 12C26 13.5 24 16.5 24 21C24 26.6 27.4 30 31 30Z"
                fill="currentColor"
              />
            </svg>
            <p
              className="mx-auto max-w-3xl text-xl font-medium leading-relaxed sm:text-2xl"
              style={{ color: D.text }}
            >
              Everything you need — charts, orders, funds, ledger — without
              the noise. Clean on the web, equally clean on Android.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: D.primary }}
              >
                CS
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold" style={{ color: D.text }}>
                  Capstockx
                </p>
                <p className="text-xs" style={{ color: D.textSec }}>
                  Product mandate
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          className="mx-auto max-w-4xl px-5 py-16 md:px-6 lg:py-24"
        >
          <div className="mb-10 text-center">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: D.primary }}
            >
              Frequently asked
            </p>
            <h2
              className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
              style={{ color: D.text }}
            >
              Good questions, quick answers.
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((item, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={item.q}
                  className="overflow-hidden rounded-2xl border transition"
                  style={{ borderColor: D.border, backgroundColor: D.panel }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span
                      className="text-sm font-semibold"
                      style={{ color: D.text }}
                    >
                      {item.q}
                    </span>
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-full border"
                      style={{ borderColor: D.border, color: D.primary }}
                    >
                      {open ? (
                        <FiMinus className="h-3.5 w-3.5" />
                      ) : (
                        <FiPlus className="h-3.5 w-3.5" />
                      )}
                    </span>
                  </button>
                  {open ? (
                    <p
                      className="px-5 pb-5 text-sm leading-relaxed"
                      style={{ color: D.textSec }}
                    >
                      {item.a}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-5 pb-16 md:px-6 lg:pb-24">
          <div
            className="overflow-hidden rounded-3xl border p-8 md:p-12"
            style={{
              borderColor: D.border,
              backgroundColor: D.panel,
              background:
                "linear-gradient(135deg, rgba(220,38,38,0.10), rgba(153,27,27,0.07))",
            }}
          >
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div className="max-w-xl">
                <h3
                  className="text-2xl font-bold sm:text-3xl"
                  style={{ color: D.text }}
                >
                  Ready to get started?
                </h3>
                <p className="mt-2 text-sm sm:text-base" style={{ color: D.textSec }}>
                  Request an account — the Capstockx team reviews every request
                  and emails credentials from {SUPPORT_EMAIL} once approved.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.02]"
                  style={{
                    backgroundColor: D.primary,
                    boxShadow: "0 10px 30px -12px rgba(220,38,38,0.45)",
                  }}
                >
                  Request account
                  <FiArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#signin"
                  className="inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold"
                  style={{
                    borderColor: D.border,
                    color: D.text,
                    backgroundColor: D.panelMuted,
                  }}
                >
                  Sign in
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        className="border-t"
        style={{ borderColor: D.border, backgroundColor: "#F8FAFC", color: "#475569" }}
      >
        <div className="mx-auto max-w-6xl px-5 py-12 md:px-6">

          {/* Top grid */}
          <div className="grid gap-10 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt="Capstockx"
                  className="h-10 w-10 rounded-xl object-contain"
                />
                <div className="leading-none">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#DC2626" }}>Cap</p>
                  <p className="mt-0.5 text-lg font-bold text-slate-900">Stocks</p>
                </div>
              </div>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-400">
                Live markets, orders, mutual funds and a running ledger — on
                web and Android, backed by the same data pipeline.
              </p>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100"
              >
                <FiMail className="h-3.5 w-3.5" />
                {SUPPORT_EMAIL}
              </a>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Product</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-400">
                <li><a href="#features" className="hover:text-slate-900">Features</a></li>
                <li><a href="#how" className="hover:text-slate-900">How it works</a></li>
                <li><a href="#security" className="hover:text-slate-900">Security</a></li>
                <li><a href="#download" className="hover:text-slate-900">Download APK</a></li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Account</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-400">
                <li><a href="#signin" className="hover:text-slate-900">Sign in</a></li>
                <li><Link href="/signup" className="hover:text-slate-900">Request account</Link></li>
                <li><Link href="/admin" className="hover:text-slate-900">Admin panel</Link></li>
                <li><a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-slate-900">Contact support</a></li>
              </ul>
            </div>
          </div>

          {/* Office addresses */}
          <div className="mt-10 rounded-2xl border border-slate-100 bg-slate-50 p-6">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-5">Our Offices</p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 text-xs text-slate-400 leading-relaxed">

              {/* Main / Head Office */}
              <div className="space-y-0.5">
                <p className="font-semibold text-slate-800 text-[11px] mb-1">Main Office</p>
                <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Registered &amp; Corporate</p>
                <p>
                  Capstockx Towers,<br />
                  Thakaraparambu Road,<br />
                  Fort P.O, Trivandrum 695023<br />
                </p>
                <p className="mt-1">Ph: +91-471-4093333, 4093444</p>
                <a href="mailto:cspl@capstockx.com" className="block hover:text-slate-900">cspl@capstockx.com</a>
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">Annexe 1 — Legal</p>
                  <p>&ldquo;Gokulam&rdquo;, SRA-62,<br />Sreekanteswaram, Fort P.O,<br />Vanchiyoor, Trivandrum 695023, Kerala</p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">Annexe 2</p>
                  <p>Ananda Bhavan,<br />Thakaraparambu Road,<br />Fort P.O, Trivandrum 695023</p>
                </div>
              </div>

              {/* Regional — South */}
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-slate-800 text-[11px] mb-1">Ernakulam</p>
                  <p>IInd Floor, 39/1728D, Tharakan House,<br />Pallimukku, Opp. Coir Board,<br />M.G. Road, Ernakulam 682016</p>
                  <p className="mt-1">Ph: 0484–4031998, 4618558<br />Mob: 9847460187</p>
                  <a href="mailto:kochi@capstockx.com" className="block hover:text-slate-900">kochi@capstockx.com</a>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <p className="font-semibold text-slate-800 text-[11px] mb-1">Thrissur</p>
                  <p>Room No 41, 2nd Floor,<br />Suharsha Towers, Shornur Road,<br />Round North, Thrissur 680001</p>
                  <p className="mt-1">Ph: 0487–2994553<br />Mob: 9349050226, 9847768658</p>
                  <a href="mailto:thrissur@capstockx.com" className="block hover:text-slate-900">thrissur@capstockx.com</a>
                </div>
              </div>

              {/* Regional — North */}
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-slate-800 text-[11px] mb-1">Calicut</p>
                  <p>19/2096, Indus Avenue, C2 Part,<br />1st Floor, Kallai Road,<br />Calicut 673002</p>
                  <p className="mt-1">Ph: 0495-4017734, 2301734, 2951734<br />Mob: 9387440171, 9387077723</p>
                  <a href="mailto:calicutro@capstockx.com" className="block hover:text-slate-900">calicutro@capstockx.com</a>
                </div>
              </div>

              {/* Metro */}
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-slate-800 text-[11px] mb-1">Chennai</p>
                  <p>20/3 &amp; 4, Indiradevi Complex,<br />Gopalakrishna Street, T. Nagar,<br />Chennai 600017</p>
                  <p className="mt-1">Ph: 044-28156920, 28156921<br />Mob: 9791802660, 9380010870</p>
                  <a href="mailto:chennai@capstockx.com" className="block hover:text-slate-900">chennai@capstockx.com</a>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <p className="font-semibold text-slate-800 text-[11px] mb-1">Bangalore</p>
                  <p>802, Ground Floor, 9th A-Main Road,<br />Indira Nagar 1st Stage,<br />Bangalore 560038</p>
                  <p className="mt-1">Ph: 080-25287565 / 25287566<br />Mob: 9343686898, 9379585700</p>
                  <a href="mailto:bangalore@capstockx.com" className="block hover:text-slate-900">bangalore@capstockx.com</a>
                </div>
              </div>

            </div>
          </div>

          {/* Regulatory info */}
          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Membership</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  <span className="text-slate-600 font-medium">Members in:</span> NSE, BSE, MCX<br />
                  <span className="text-slate-600 font-medium">DP:</span> CDSL &nbsp;|&nbsp; Portfolio Manager<br />
                  <span className="text-slate-600 font-medium">Helpdesk:</span>{" "}
                  <a href="mailto:helpdesk@capstockx.com" className="hover:text-slate-900">helpdesk@capstockx.com</a>
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">SEBI Registrations</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  SEBI Reg (NSE, BSE &amp; MCX): <span className="text-slate-600">INZ000165931</span><br />
                  DP: <span className="text-slate-600">IN-DP-CDSL-203-2003</span><br />
                  PMS: <span className="text-slate-600">INP000001066</span><br />
                  Research Entity: <span className="text-slate-600">INH2000003109</span><br />
                  AMFI Reg No: <span className="text-slate-600">20149</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Exchange &amp; Corporate</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  BSE Enlisted No: <span className="text-slate-600">5189</span><br />
                  Member ID — NSE: <span className="text-slate-600">11674</span> | BSE: <span className="text-slate-600">3086</span> | MCX: <span className="text-slate-600">55990</span><br />
                  CIN: <span className="text-slate-600">U67120KL2001PTC014680</span><br />
                  <span className="text-slate-600 font-medium">Investor Grievances:</span>{" "}
                  <a href="mailto:Customer.redressal@capstockxindia.com" className="hover:text-slate-900 break-all">
                    Customer.redressal@capstockxindia.com
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-6 flex flex-col items-start justify-between gap-3 border-t border-slate-100 pt-6 text-xs text-slate-400 md:flex-row md:items-center">
            <p>© {new Date().getFullYear()} Capstockx. All rights reserved.</p>
            <p className="max-w-xl text-center md:text-right">
              Investments in securities market are subject to market risks.
              Read all scheme related documents carefully before investing.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* --------- Presentational helpers --------- */

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p
        className="text-3xl font-bold tracking-tight sm:text-4xl"
        style={{
          backgroundImage: "linear-gradient(90deg, #DC2626, #B91C1C)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {value}
      </p>
      <p className="mt-1 text-xs font-medium" style={{ color: "#475569" }}>
        {label}
      </p>
    </div>
  );
}

function StepCard({
  number,
  icon: Icon,
  title,
  text,
}: {
  number: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-6"
      style={{ borderColor: "#E2E8F0", backgroundColor: "#F8FAFC" }}
    >
      <span
        className="absolute right-4 top-4 text-4xl font-bold opacity-10"
        style={{ color: "#DC2626" }}
      >
        {number}
      </span>
      <div
        className="flex h-11 w-11 items-center justify-center rounded-xl"
        style={{ backgroundColor: "rgba(220,38,38,0.12)", color: "#DC2626" }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-5 text-base font-semibold" style={{ color: "#0F172A" }}>
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: "#475569" }}>
        {text}
      </p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
      style={{ borderColor: "#E2E8F0", backgroundColor: "#F8FAFC" }}
    >
      <div
        aria-hidden
        className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(closest-side, rgba(220,38,38,0.22), rgba(220,38,38,0))",
        }}
      />
      <div
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: "rgba(220,38,38,0.12)", color: "#DC2626" }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold" style={{ color: "#0F172A" }}>
        {title}
      </h3>
      <p className="mt-1 text-sm leading-relaxed" style={{ color: "#475569" }}>
        {text}
      </p>
    </div>
  );
}

function ProductRow({
  badge,
  title,
  text,
  bullets,
  visual,
  reverse,
}: {
  badge: string;
  title: string;
  text: string;
  bullets: string[];
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div
      className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
        reverse ? "lg:[direction:rtl]" : ""
      }`}
    >
      <div className={reverse ? "lg:[direction:ltr]" : ""}>
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold"
          style={{
            backgroundColor: "rgba(220,38,38,0.12)",
            color: "#DC2626",
          }}
        >
          {badge}
        </span>
        <h3
          className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl"
          style={{ color: "#0F172A" }}
        >
          {title}
        </h3>
        <p
          className="mt-3 max-w-xl text-base leading-relaxed"
          style={{ color: "#475569" }}
        >
          {text}
        </p>
        <ul className="mt-6 space-y-2.5">
          {bullets.map((b) => (
            <li
              key={b}
              className="flex items-start gap-2.5 text-sm"
              style={{ color: "#0F172A" }}
            >
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                style={{
                  backgroundColor: "rgba(220,38,38,0.12)",
                  color: "#DC2626",
                }}
              >
                <FiCheck className="h-3 w-3" strokeWidth={3} />
              </span>
              {b}
            </li>
          ))}
        </ul>
      </div>
      <div className={reverse ? "lg:[direction:ltr]" : ""}>{visual}</div>
    </div>
  );
}

function SecurityBullet({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ borderColor: "#E2E8F0", backgroundColor: "#F1F5F9" }}
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ backgroundColor: "rgba(220,38,38,0.12)", color: "#DC2626" }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-3 text-sm font-semibold" style={{ color: "#0F172A" }}>
        {title}
      </p>
      <p className="mt-1 text-xs leading-relaxed" style={{ color: "#475569" }}>
        {text}
      </p>
    </div>
  );
}

/* --------- Decorative visuals --------- */

function ChartVisual() {
  return (
    <div
      className="relative overflow-hidden rounded-3xl border p-4 shadow-xl"
      style={{ borderColor: "#E2E8F0", backgroundColor: "#F8FAFC" }}
    >
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
            style={{ backgroundColor: "#10B981" }}
          />
          <span className="font-bold tracking-wider" style={{ color: "#10B981" }}>
            LIVE · 5m
          </span>
        </div>
        <span
          className="rounded px-2 py-0.5 text-[10px] font-bold text-white"
          style={{ backgroundColor: "#10B981" }}
        >
          24,583.10
        </span>
      </div>
      <MockChart large />
      <div className="mt-3 flex gap-1 rounded-xl p-1" style={{ backgroundColor: "#F1F5F9" }}>
        {["1m", "5m", "15m", "1H", "1D", "1W"].map((t, i) => (
          <span
            key={t}
            className="flex-1 rounded-lg py-1.5 text-center text-[11px] font-semibold"
            style={
              i === 1
                ? {
                    backgroundColor: "#E2E8F0",
                    color: "#DC2626",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  }
                : { color: "#64748B" }
            }
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function OrdersVisual() {
  const rows = [
    { sym: "RELIANCE", side: "BUY", qty: 10, pnl: 1240, pct: 2.1 },
    { sym: "TCS", side: "BUY", qty: 5, pnl: 420, pct: 0.9 },
    { sym: "HDFCBANK", side: "SELL", qty: 15, pnl: -310, pct: -0.6 },
  ];
  return (
    <div
      className="overflow-hidden rounded-3xl border shadow-xl"
      style={{ borderColor: "#E2E8F0", backgroundColor: "#F8FAFC" }}
    >
      <div
        className="flex items-center justify-between gap-4 border-l-4 p-5"
        style={{ borderLeftColor: "#10B981" }}
      >
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "#64748B" }}
          >
            Total P&amp;L
          </p>
          <p className="mt-1 text-2xl font-bold" style={{ color: "#10B981" }}>
            +₹1,350.00
          </p>
          <p className="text-xs font-semibold" style={{ color: "#10B981" }}>
            +1.42%
          </p>
        </div>
      </div>
      <div className="flex gap-2 px-5 py-3" style={{ borderTop: "1px solid #1E293B" }}>
        {["Positions", "Holdings", "History"].map((t, i) => (
          <span
            key={t}
            className="rounded-full border px-3 py-1 text-[11px] font-semibold"
            style={
              i === 0
                ? { backgroundColor: "#DC2626", borderColor: "#DC2626", color: "#fff" }
                : { borderColor: "#E2E8F0", color: "#64748B" }
            }
          >
            {t}
          </span>
        ))}
      </div>
      <div className="divide-y" style={{ borderColor: "#E2E8F0" }}>
        {rows.map((r) => (
          <div
            key={r.sym}
            className="flex items-center justify-between px-5 py-3"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold" style={{ color: "#0F172A" }}>
                  {r.sym}
                </p>
                <span
                  className="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider"
                  style={
                    r.side === "BUY"
                      ? { backgroundColor: "rgba(16,185,129,0.12)", color: "#10B981" }
                      : { backgroundColor: "rgba(240,78,90,0.12)", color: "#F04E5A" }
                  }
                >
                  {r.side}
                </span>
              </div>
              <p className="mt-0.5 text-[11px]" style={{ color: "#64748B" }}>
                Qty {r.qty}
              </p>
            </div>
            <p
              className="text-sm font-bold"
              style={{ color: r.pnl >= 0 ? "#10B981" : "#F04E5A" }}
            >
              {r.pnl >= 0 ? "+" : ""}₹{Math.abs(r.pnl).toLocaleString("en-IN")}
              <span className="ml-1 text-[10px]">
                ({r.pnl >= 0 ? "+" : ""}
                {r.pct.toFixed(1)}%)
              </span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarketsVisual() {
  const items = [
    { name: "NIFTY 50", value: "24,583.10", pct: 0.42, pos: true },
    { name: "BANK NIFTY", value: "52,110.85", pct: 0.71, pos: true },
    { name: "SENSEX", value: "80,920.15", pct: 0.38, pos: true },
    { name: "GOLD", value: "74,210.00", pct: 0.95, pos: true },
    { name: "SILVER", value: "89,345.00", pct: 1.34, pos: true },
    { name: "CRUDE", value: "6,728.00", pct: -0.46, pos: false },
  ];
  return (
    <div
      className="rounded-3xl border p-5 shadow-xl"
      style={{ borderColor: "#E2E8F0", backgroundColor: "#F8FAFC" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: "#0F172A" }}>
          Markets feed
        </p>
        <span
          className="flex items-center gap-1.5 text-[10px] font-bold"
          style={{ color: "#10B981" }}
        >
          <span
            className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
            style={{ backgroundColor: "#10B981" }}
          />
          LIVE
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {items.map((it) => (
          <div
            key={it.name}
            className="rounded-xl border p-3"
            style={{ borderColor: "#E2E8F0", backgroundColor: "#F1F5F9" }}
          >
            <p className="text-[10px] font-medium" style={{ color: "#64748B" }}>
              {it.name}
            </p>
            <p className="mt-1 text-sm font-bold" style={{ color: "#0F172A" }}>
              {it.value}
            </p>
            <p
              className="mt-0.5 text-[10px] font-semibold"
              style={{ color: it.pos ? "#10B981" : "#F04E5A" }}
            >
              {it.pos ? "+" : ""}
              {it.pct.toFixed(2)}%
            </p>
          </div>
        ))}
      </div>
      <div
        className="mt-4 flex items-center justify-between border-t pt-3 text-[11px]"
        style={{ borderColor: "#E2E8F0", color: "#64748B" }}
      >
        <span className="flex items-center gap-1">
          <FiTrendingUp className="h-3 w-3" style={{ color: "#10B981" }} />
          5 up · 1 down
        </span>
        <span>Updated a moment ago</span>
      </div>
    </div>
  );
}

function MockChart({ large = false }: { large?: boolean }) {
  const candles = [
    { o: 40, c: 52, h: 58, l: 36 },
    { o: 52, c: 48, h: 55, l: 44 },
    { o: 48, c: 56, h: 60, l: 46 },
    { o: 56, c: 62, h: 66, l: 54 },
    { o: 62, c: 58, h: 64, l: 55 },
    { o: 58, c: 68, h: 72, l: 56 },
    { o: 68, c: 74, h: 78, l: 66 },
    { o: 74, c: 70, h: 76, l: 68 },
    { o: 70, c: 80, h: 84, l: 68 },
    { o: 80, c: 86, h: 90, l: 78 },
    { o: 86, c: 82, h: 88, l: 80 },
    { o: 82, c: 90, h: 94, l: 80 },
    { o: 90, c: 96, h: 100, l: 88 },
    { o: 96, c: 92, h: 98, l: 90 },
    { o: 92, c: 102, h: 106, l: 90 },
  ];
  const width = 280;
  const height = large ? 180 : 120;
  const padY = 10;
  const maxY = 115;
  const minY = 30;
  const scale = (v: number) =>
    height - padY - ((v - minY) / (maxY - minY)) * (height - padY * 2);
  const cw = width / candles.length;
  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: "block" }}
    >
      {[0.25, 0.5, 0.75].map((p) => (
        <line
          key={p}
          x1={0}
          x2={width}
          y1={height * p}
          y2={height * p}
          stroke="rgba(255,255,255,0.04)"
          strokeDasharray="3,3"
        />
      ))}
      {candles.map((c, i) => {
        const x = i * cw + cw / 2;
        const up = c.c >= c.o;
        const color = up ? "#10B981" : "#F04E5A";
        const bodyTop = scale(Math.max(c.o, c.c));
        const bodyH = Math.max(2, Math.abs(scale(c.o) - scale(c.c)));
        return (
          <g key={i}>
            <line
              x1={x}
              x2={x}
              y1={scale(c.h)}
              y2={scale(c.l)}
              stroke={color}
              strokeWidth={1}
            />
            <rect
              x={x - cw * 0.3}
              y={bodyTop}
              width={cw * 0.6}
              height={bodyH}
              fill={color}
              rx={1}
            />
          </g>
        );
      })}
      <line
        x1={0}
        x2={width}
        y1={scale(candles[candles.length - 1].c)}
        y2={scale(candles[candles.length - 1].c)}
        stroke="#10B981"
        strokeDasharray="2,3"
        strokeOpacity={0.5}
      />
    </svg>
  );
}
