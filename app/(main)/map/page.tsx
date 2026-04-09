import { MapPageClient } from "./MapPageClient";

/** Map UI (including admin-only “Manage Floor Plan” in the top bar) lives in `MapView`. */
export default function MapPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#1a1c1e]">
      <MapPageClient />
    </div>
  );
}
