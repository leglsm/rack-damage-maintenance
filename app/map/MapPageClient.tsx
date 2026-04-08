"use client";

import dynamic from "next/dynamic";
import { SupabaseProvider } from "@/components/supabase-provider";

const MapView = dynamic(
  () =>
    import("@/components/map/MapView").then((mod) => ({ default: mod.MapView })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center text-zinc-500">
        Loading map…
      </div>
    ),
  },
);

type Props = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export function MapPageClient({ supabaseUrl, supabaseAnonKey }: Props) {
  return (
    <SupabaseProvider url={supabaseUrl} anonKey={supabaseAnonKey}>
      <MapView />
    </SupabaseProvider>
  );
}
