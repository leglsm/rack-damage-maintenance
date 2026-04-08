import { MapPageClient } from "./MapPageClient";

export default function MapPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

  if (!supabaseUrl || !supabaseAnonKey) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="font-medium text-red-400">
          Missing Supabase environment variables
        </p>
        <p className="max-w-md text-sm text-zinc-400">
          Add{" "}
          <code className="text-zinc-200">
            NEXT_PUBLIC_SUPABASE_URL
          </code> and{" "}
          <code className="text-zinc-200">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>{" "}
          to <code className="text-zinc-200">.env.local</code> in the project
          root (next to package.json), save the file, stop the dev server with
          Ctrl+C, then run <code className="text-zinc-200">npm run dev</code>{" "}
          again.
        </p>
      </div>
    );
  }

  return (
    <MapPageClient
      supabaseUrl={supabaseUrl}
      supabaseAnonKey={supabaseAnonKey}
    />
  );
}
