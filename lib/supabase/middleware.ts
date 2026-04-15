import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { readSelectedPlantIdFromRequestCookies } from "@/lib/selected-plant";

/**
 * Refreshes Auth session + cookie jar. Gate routes after `getUser()`.
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  /** Invite / email links use `/auth/confirm?token_hash=…` (no session yet); never gate behind login. */
  const isPublic =
    pathname === "/login" ||
    pathname === "/auth/confirm" ||
    pathname.startsWith("/auth/confirm/");

  const plantScopedPaths = ["/map", "/issues", "/dashboard", "/settings"] as const;
  const requiresPlantSelection =
    !!user &&
    plantScopedPaths.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );

  if (requiresPlantSelection) {
    const plantId = readSelectedPlantIdFromRequestCookies((name) =>
      request.cookies.get(name)?.value,
    );
    if (!plantId) {
      const url = request.nextUrl.clone();
      url.pathname = "/plants";
      url.search = "";
      const redirectResponse = NextResponse.redirect(url);
      for (const c of supabaseResponse.cookies.getAll()) {
        redirectResponse.cookies.set(c.name, c.value);
      }
      return redirectResponse;
    }
  }

  if (!isPublic && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/plants";
    url.search = "";
    const redirectResponse = NextResponse.redirect(url);
    for (const c of supabaseResponse.cookies.getAll()) {
      redirectResponse.cookies.set(c.name, c.value);
    }
    return redirectResponse;
  }

  return supabaseResponse;
}
