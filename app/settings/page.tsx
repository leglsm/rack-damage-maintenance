import { MissingSupabaseEnv, readSupabaseEnv } from "@/lib/env-check";
import { SupabaseProvider } from "@/components/supabase-provider";
import { SettingsView } from "@/components/settings/SettingsView";

/** Same NEXT_PUBLIC_* credentials as `lib/supabase.ts`; UI uses SupabaseProvider in the browser. */
export default function SettingsPage() {
  const env = readSupabaseEnv();
  if (!env) return <MissingSupabaseEnv />;

  return (
    <SupabaseProvider url={env.url} anonKey={env.key}>
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#1a1c1e]">
        <SettingsView />
      </div>
    </SupabaseProvider>
  );
}
