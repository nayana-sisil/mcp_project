"use client";
import * as React from "react";
import type { OverviewResponse } from "@/lib/types";
import { api } from "@/lib/api";

type Ctx = {
  overview: OverviewResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const OverviewContext = React.createContext<Ctx | null>(null);

export function OverviewProvider({ children }: { children: React.ReactNode }) {
  const [overview, setOverview] = React.useState<OverviewResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.overview();
      setOverview(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
    // Light polling so the model-ready badge updates after startup.
    const id = setInterval(() => {
      refresh().catch(() => {});
    }, 8000);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <OverviewContext.Provider value={{ overview, loading, error, refresh }}>
      {children}
    </OverviewContext.Provider>
  );
}

export function useOverview(): Ctx {
  const ctx = React.useContext(OverviewContext);
  if (!ctx) throw new Error("useOverview must be used inside OverviewProvider");
  return ctx;
}
