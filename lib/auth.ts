/** Comma-separated list from env, e.g. `a@b.com,c@d.com` */
export function parseAdminEmails(): string[] {
  const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.trim() ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdmin(email: string | null | undefined): boolean {
  if (!email?.trim()) return false;
  const list = parseAdminEmails();
  if (list.length === 0) return false;
  return list.includes(email.trim().toLowerCase());
}
