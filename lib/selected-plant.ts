import type { SupabaseClient } from "@supabase/supabase-js";

/** Cookie + localStorage key for the active factory (plant). */
export const SELECTED_PLANT_COOKIE = "rack_selected_plant_id";

export function readSelectedPlantIdFromRequestCookies(
  getCookie: (name: string) => string | undefined,
): string | null {
  const v = getCookie(SELECTED_PLANT_COOKIE)?.trim();
  return v || null;
}

export function getSelectedPlantIdFromDocument(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(
    new RegExp(
      `(?:^|; )${SELECTED_PLANT_COOKIE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`,
    ),
  );
  const raw = m?.[1];
  if (!raw) return null;
  try {
    return decodeURIComponent(raw).trim() || null;
  } catch {
    return raw.trim() || null;
  }
}

export function setSelectedPlantIdClient(id: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SELECTED_PLANT_COOKIE, id);
  } catch {
    /* ignore */
  }
  const maxAge = 60 * 60 * 24 * 400;
  document.cookie = `${SELECTED_PLANT_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function clearSelectedPlantClient(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SELECTED_PLANT_COOKIE);
  } catch {
    /* ignore */
  }
  document.cookie = `${SELECTED_PLANT_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export async function getFloorPlanIdForPlant(
  supabase: SupabaseClient,
  plantId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("floor_plans")
    .select("id")
    .eq("plant_id", plantId)
    .maybeSingle();
  if (error) throw error;
  return (data as { id: string } | null)?.id ?? null;
}
