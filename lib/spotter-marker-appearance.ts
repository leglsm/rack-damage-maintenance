/** Issue fields used for map marker coloring */
export type IssueMarkerInput = {
  priority: string;
  status: string;
};

export type SpotterMarkerAppearance = {
  /** Pin / dot fill */
  pin: string;
  /** Triangle “pointer” fill (CSS border-bottom color) */
  triangle: string;
  /** Tailwind classes for location_id label */
  labelClass: string;
};

/**
 * Priority for open (non-repaired) issues. Unknown priorities fall through to gray.
 */
export function spotterMarkerAppearance(
  issues: IssueMarkerInput[],
): SpotterMarkerAppearance {
  if (issues.length === 0) {
    return {
      pin: "#607d8b",
      triangle: "#607d8b",
      labelClass: "text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]",
    };
  }

  const open = issues.filter((i) => i.status !== "Repaired");

  if (open.length === 0) {
    return {
      pin: "#43a047",
      triangle: "#43a047",
      labelClass: "text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]",
    };
  }

  if (open.some((i) => i.priority === "Unload")) {
    return {
      pin: "#e53935",
      triangle: "#e53935",
      labelClass: "text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]",
    };
  }
  if (open.some((i) => i.priority === "High")) {
    return {
      pin: "#f57c20",
      triangle: "#f57c20",
      labelClass: "text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]",
    };
  }
  if (open.some((i) => i.priority === "Moderate")) {
    return {
      pin: "#fdd835",
      triangle: "#fdd835",
      labelClass:
        "text-zinc-900 [text-shadow:0_1px_0_rgba(255,255,255,0.35)]",
    };
  }
  if (open.some((i) => i.priority === "Low")) {
    return {
      pin: "#fff9c4",
      triangle: "#fff9c4",
      labelClass: "text-zinc-900 [text-shadow:0_1px_0_rgba(255,255,255,0.5)]",
    };
  }

  return {
    pin: "#607d8b",
    triangle: "#607d8b",
    labelClass: "text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]",
  };
}
