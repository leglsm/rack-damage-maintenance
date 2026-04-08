"use client";

import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/supabase-provider";

export function FloatingSignOut() {
  const supabase = useSupabase();
  const router = useRouter();

  const onClick = () => {
    if (!window.confirm("Sign out?")) return;
    void supabase.auth.signOut().then(() => {
      router.push("/login");
      router.refresh();
    });
  };

  return (
    <div className="group fixed bottom-4 right-4 z-[9999] flex items-center">
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-0 overflow-hidden rounded-lg border border-[#f57c20] bg-[#141517] py-2 pl-2 text-[#f57c20] shadow-lg transition-[gap,padding] hover:gap-2 hover:pr-3"
        aria-label="Sign out"
      >
        <svg
          className="h-5 w-5 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"
          />
        </svg>
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium text-[#f57c20] transition-all duration-200 group-hover:max-w-[5rem]">
          Sign Out
        </span>
      </button>
    </div>
  );
}
