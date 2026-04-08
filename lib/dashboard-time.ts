/** Last 12 calendar months ending at `ref` (inclusive of ref’s month). */
export function last12Months(ref: Date = new Date()) {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const out: { key: string; label: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(y, m - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", { month: "short", year: "numeric" });
    out.push({ key, label });
  }
  return out;
}

export function monthKeyFromIso(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
