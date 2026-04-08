import { createClient } from "@supabase/supabase-js";

/**
 * Server / scripts. Browser UIs use {@link SupabaseProvider} from
 * `@/components/supabase-provider` with the same NEXT_PUBLIC_* env vars.
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
