import { MissingSupabaseEnv, readSupabaseEnv } from "@/lib/env-check";
import { SupabaseProvider } from "@/components/supabase-provider";
import { IssuesView } from "@/components/issues/IssuesView";

/** Uses the same NEXT_PUBLIC_* env vars as `lib/supabase.ts`; client gets a browser client from SupabaseProvider. */
export default function IssuesPage() {
  const env = readSupabaseEnv();
  if (!env) return <MissingSupabaseEnv />;

  return (
    <SupabaseProvider url={env.url} anonKey={env.key}>
      <IssuesView />
    </SupabaseProvider>
  );
}
