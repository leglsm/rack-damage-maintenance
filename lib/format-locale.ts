/**
 * Fixed en-US formatting so UI stays consistent regardless of browser/OS locale.
 */

export function formatDateTimeEnUS(
  date: string | Date | null | undefined,
): string {
  if (date == null || date === "") return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatNumberEnUS(n: number): string {
  return n.toLocaleString("en-US");
}
