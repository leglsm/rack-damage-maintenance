export const ISSUE_PHOTOS_BUCKET = "issue-photos";

export function storagePathFromPublicUrl(url: string): string | null {
  const m = url.match(/\/object\/public\/issue-photos\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function priorityBadgeClass(p: string) {
  switch (p) {
    case "Low":
      return "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40";
    case "Moderate":
      return "bg-orange-500/20 text-orange-300 border border-orange-400/50";
    case "High":
      return "bg-red-500/25 text-red-300 border border-red-500/50";
    case "Unload":
      return "bg-red-950 text-white border border-red-900";
    default:
      return "bg-zinc-700 text-zinc-300 border border-zinc-600";
  }
}

export function statusBadgeClass(s: string) {
  switch (s) {
    case "Reported":
      return "bg-zinc-600/40 text-zinc-300 border border-zinc-500/50";
    case "In Progress":
      return "bg-blue-600/30 text-blue-300 border border-blue-500/50";
    case "Repaired":
      return "bg-emerald-600/25 text-emerald-300 border border-emerald-500/50";
    default:
      return "bg-zinc-700 text-zinc-300 border border-zinc-600";
  }
}
