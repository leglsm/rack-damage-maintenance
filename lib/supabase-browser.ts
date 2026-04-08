import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client with cookie-backed session (use with `middleware.ts` + `@supabase/ssr`).
 * Prefer this over plain `createClient` from `supabase-js` in the app shell.
 */
export function createBrowserSupabaseClient(url: string, anonKey: string) {
  const u = typeof url === "string" ? url.trim() : "";
  const k = typeof anonKey === "string" ? anonKey.trim() : "";
  if (!u || !k) {
    throw new Error(
      "createBrowserSupabaseClient: URL and anon key must be non-empty.",
    );
  }
  return createBrowserClient(u, k);
}
