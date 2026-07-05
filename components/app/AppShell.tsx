"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FiBarChart2,
  FiBookOpen,
  FiCompass,
  FiLogOut,
  FiPieChart,
  FiUser,
} from "react-icons/fi";
import { useAppData } from "./AppDataContext";

const NAV = [
  { href: "/app/markets", label: "Markets", icon: FiBarChart2 },
  { href: "/app/orders", label: "Orders", icon: FiBookOpen },
  { href: "/app/explore", label: "Explore", icon: FiCompass },
  { href: "/app/investments", label: "Mutual Funds", icon: FiPieChart },
  { href: "/app/profile", label: "Profile", icon: FiUser },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAppData();
  const name =
    user?.fullName || user?.clientId || user?.email?.split("@")[0] || "Account";
  const initials = name.slice(0, 2).toUpperCase();

  // Render the authenticated shell only after the client mounts. Browser
  // extensions (BitDefender, Brave Shields, etc.) inject attributes like
  // `bis_skin_checked` into every <div> before React hydrates, which causes
  // hydration mismatch warnings. Deferring the whole tree to post-mount means
  // there is nothing on the server for the extension to touch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: "var(--ax-card)" }}
        suppressHydrationWarning
      >
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: "var(--ax-primary)", borderTopColor: "transparent" }}
          suppressHydrationWarning
        />
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen"
      style={{ backgroundColor: "var(--ax-card)" }}
    >
      <aside
        className="hidden w-64 shrink-0 flex-col border-r bg-white shadow-sm md:flex"
        style={{ borderColor: "var(--ax-border)" }}
      >
        <Link
          href="/app/markets"
          className="flex items-center gap-3 border-b px-5 py-5"
          style={{ borderColor: "var(--ax-border)" }}
        >
          <Image
            src="/icon.jpeg"
            alt="Capstockx"
            width={40}
            height={40}
            className="rounded-xl object-contain"
          />
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--ax-primary)" }}
            >
              Cap
            </p>
            <p
              className="-mt-0.5 text-base font-bold"
              style={{ color: "var(--ax-text-primary)" }}
            >
              Stocks
            </p>
          </div>
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition"
                style={
                  active
                    ? {
                        backgroundColor: "var(--ax-primary-muted)",
                        color: "var(--ax-primary)",
                      }
                    : { color: "var(--ax-text-secondary)" }
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div
          className="border-t p-3"
          style={{ borderColor: "var(--ax-border)" }}
        >
          <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold"
              style={{
                backgroundColor: "var(--ax-primary-muted)",
                color: "var(--ax-primary)",
              }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p
                className="truncate text-sm font-semibold"
                style={{ color: "var(--ax-text-primary)" }}
              >
                {name}
              </p>
              <p
                className="truncate text-xs"
                style={{ color: "var(--ax-text-secondary)" }}
              >
                {user?.clientId || user?.email || ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-rose-50"
            style={{ color: "var(--ax-negative)" }}
          >
            <FiLogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-10 border-b bg-white"
          style={{ borderColor: "var(--ax-border)" }}
        >
          <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-6">
            <Link
              href="/app/markets"
              className="flex items-center gap-2 md:hidden"
            >
              <Image
                src="/icon.jpeg"
                alt="Capstockx"
                width={32}
                height={32}
                className="rounded-lg object-contain"
              />
              <span
                className="text-sm font-bold"
                style={{ color: "var(--ax-text-primary)" }}
              >
                Capstockx
              </span>
            </Link>
            <div className="hidden md:block">
              <h1
                className="text-lg font-bold"
                style={{ color: "var(--ax-text-primary)" }}
              >
                {NAV.find(
                  (n) =>
                    pathname === n.href || pathname.startsWith(n.href + "/"),
                )?.label || "Capstockx"}
              </h1>
            </div>

            <div className="flex items-center gap-3 md:hidden">
              <button
                type="button"
                onClick={() => void logout()}
                className="rounded-lg border px-2.5 py-1 text-xs font-medium hover:bg-rose-50"
                style={{
                  borderColor: "var(--ax-border)",
                  color: "var(--ax-negative)",
                }}
              >
                Log out
              </button>
            </div>
          </div>
          <MobileNav pathname={pathname} />
        </header>

        <main className="flex-1 overflow-x-hidden px-4 py-5 md:px-6 md:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  return (
    <nav className="flex gap-1 overflow-x-auto border-t px-2 py-2 md:hidden"
      style={{ borderColor: "var(--ax-border)" }}>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
            style={
              active
                ? {
                    backgroundColor: "var(--ax-primary-muted)",
                    color: "var(--ax-primary)",
                  }
                : { color: "var(--ax-text-secondary)" }
            }
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
