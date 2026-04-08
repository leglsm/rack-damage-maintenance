import { createClient } from "@supabase/supabase-js";

/**
 * Server-side / scripts Supabase client (throws if env missing).
 * Browser UIs use {@link createBrowserSupabaseClient} from `@/lib/supabase-browser`
 * inside {@link SupabaseProvider} so sessions sync with middleware cookies.
 */
function requireEnv(name: string): string {
  const raw = process.env[name];
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) {
    throw new Error(
      [
        `Missing environment variable: ${name}`,
        "Add it to .env.local in the project root, for example:",
        `  ${name}=your-value-here`,
        "Then stop the dev server (Ctrl+C) and run npm run dev again.",
      ].join("\n"),
    );
  }
  return value;
}

export const supabase = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
);

export { createBrowserSupabaseClient } from "@/lib/supabase-browser";
