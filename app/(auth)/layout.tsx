import { type ReactNode } from "react";

/** Login and invite confirmation skip the main sidebar shell. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
  );
}
