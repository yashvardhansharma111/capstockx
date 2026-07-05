"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type DashboardIndex = {
  symbol?: string;
  name?: string;
  value?: number;
  change?: number;
  changePct?: number;
  tvSymbol?: string;
  currency?: string;
  details?: unknown;
};

export type DashboardStock = {
  symbol: string;
  name?: string;
  ltp?: number;
  change?: number;
  changePct?: number;
};

export type DashboardFund = {
  schemeCode?: string | number;
  name: string;
  category?: string;
  fundHouse?: string;
  nav?: number;
  change?: number;
  changePct?: number;
  asOf?: string;
};

export type DashboardCommodity = {
  symbol?: string;
  name: string;
  value?: number;
  change?: number;
  changePct?: number;
  currency?: string;
};

export type Dashboard = {
  indices?: DashboardIndex[];
  stocks?: DashboardStock[];
  mutualFunds?: DashboardFund[];
  commodities?: DashboardCommodity[];
  usdInr?: number;
  updatedAt?: string;
};

export type WatchlistItem = {
  symbol: string;
  name?: string;
  ltp?: number;
  changePct?: number;
};

export type OrderRow = {
  id?: string;
  segmentKey?: string;
  symbol?: string;
  side?: string;
  status?: string;
  productType?: string;
  qty?: number;
  avgPrice?: number;
  ltp?: number;
  pnl?: number;
  pnlPct?: number;
  orderPrice?: number;
  time?: string;
};

export type OrdersConfig = {
  orders?: OrderRow[];
  segments?: { key: string; label: string }[];
  summary?: { totalPnl?: number; dayPnl?: number };
};

export type Me = {
  _id?: string;
  fullName?: string;
  clientId?: string;
  email?: string;
  phone?: string;
  status?: string;
  tradingBalance?: number;
  margin?: number;
  hasProfilePhoto?: boolean;
};

type Ctx = {
  user: Me | null;
  dashboard: Dashboard | null;
  watchlist: { items?: WatchlistItem[] } | null;
  orders: OrdersConfig | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AppDataContext = createContext<Ctx | null>(null);

async function jfetch<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return (await res.json()) as T;
}

export function AppDataProvider({
  initialUser,
  children,
}: {
  initialUser: Me;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<Me | null>(initialUser);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [watchlist, setWatchlist] = useState<{ items?: WatchlistItem[] } | null>(
    null,
  );
  const [orders, setOrders] = useState<OrdersConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, w, o, m] = await Promise.all([
        jfetch<{ config?: Dashboard }>("/api/config/dashboard-home").catch(
          () => ({ config: null }),
        ),
        jfetch<{ config?: { items?: WatchlistItem[] } }>(
          "/api/config/watchlist",
        ).catch(() => ({ config: null })),
        jfetch<{ config?: OrdersConfig }>("/api/config/orders").catch(() => ({
          config: null,
        })),
        jfetch<{ user?: Me }>("/api/auth/me").catch(() => ({ user: null })),
      ]);
      setDashboard(d?.config ?? null);
      setWatchlist(w?.config ?? null);
      setOrders(o?.config ?? null);
      if (m?.user) setUser(m.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore
    }
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      user,
      dashboard,
      watchlist,
      orders,
      loading,
      error,
      refresh: load,
      logout,
    }),
    [user, dashboard, watchlist, orders, loading, error, load, logout],
  );

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error("useAppData must be used inside AppDataProvider");
  }
  return ctx;
}
