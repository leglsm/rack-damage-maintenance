import { MissingSupabaseEnv, readSupabaseEnv } from "@/lib/env-check";
import { SupabaseProvider } from "@/components/supabase-provider";
import { DashboardView } from "@/components/dashboard/DashboardView";

export default function DashboardPage() {
  const env = readSupabaseEnv();
  if (!env) return <MissingSupabaseEnv />;

  return (
    <SupabaseProvider url={env.url} anonKey={env.key}>
      <div className="min-h-0 flex-1 bg-[#1a1c1e]">
        <DashboardView />
      </div>
    </SupabaseProvider>
  );
}
