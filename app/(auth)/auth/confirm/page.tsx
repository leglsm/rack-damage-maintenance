import { InviteConfirmForm } from "@/components/auth/InviteConfirmForm";

/** Ensure confirm flow is not served from a stale static shell; session cookies must apply per-request. */
export const dynamic = "force-dynamic";

export default function AuthConfirmPage() {
  return <InviteConfirmForm />;
}
