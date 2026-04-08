"use client";

import dynamic from "next/dynamic";

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

export function MapPageClient() {
  return <MapView />;
}
