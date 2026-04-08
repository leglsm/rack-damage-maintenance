/** Shared “missing env” UI for server pages that need Supabase. */
export function MissingSupabaseEnv() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="font-medium text-red-400">
        Missing Supabase environment variables
      </p>
      <p className="max-w-md text-sm text-zinc-400">
        Add{" "}
        <code className="text-zinc-200">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="text-zinc-200">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
        <code className="text-zinc-200">.env.local</code> in the project root,
        save, stop the dev server (Ctrl+C), then run{" "}
        <code className="text-zinc-200">npm run dev</code> again.
      </p>
    </div>
  );
}

export function readSupabaseEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  if (!url || !key) return null;
  return { url, key };
}
