export const ISSUE_TYPES = [
  "Detached",
  "Deformed",
  "Missing",
  "Twisted",
  "Clearance",
  "Other",
] as const;

export const PRIORITIES = ["Low", "Moderate", "High", "Unload"] as const;

export const ACTIONS = ["Replace", "Repair", "Monitor"] as const;

export const STATUSES = ["Reported", "In Progress", "Repaired"] as const;

export type IssueType = (typeof ISSUE_TYPES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type ActionToTake = (typeof ACTIONS)[number];
export type IssueStatus = (typeof STATUSES)[number];
