"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";

const bareLayout = (pathname: string | null) =>
  pathname === "/login" ||
  pathname === "/auth/confirm" ||
  pathname?.startsWith("/auth/confirm/");

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const bare = bareLayout(pathname);

  if (bare) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-row">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
