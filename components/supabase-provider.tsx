"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

const SupabaseContext = createContext<SupabaseClient | null>(null);

type ProviderProps = {
  url: string;
  anonKey: string;
  children: ReactNode;
};

export function SupabaseProvider({ url, anonKey, children }: ProviderProps) {
  const client = useMemo(() => {
    const u = url.trim();
    const k = anonKey.trim();
    if (!u || !k) return null;
    return createBrowserSupabaseClient(u, k);
  }, [url, anonKey]);

  if (!client) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-red-400">Supabase URL or anon key is empty.</p>
        <p className="text-sm text-zinc-500">
          Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in
          .env.local, then restart the dev server.
        </p>
      </div>
    );
  }

  return (
    <SupabaseContext.Provider value={client}>{children}</SupabaseContext.Provider>
  );
}

export function useSupabase(): SupabaseClient {
  const client = useContext(SupabaseContext);
  if (!client) {
    throw new Error("useSupabase must be used inside SupabaseProvider");
  }
  return client;
}
