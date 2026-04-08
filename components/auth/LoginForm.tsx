"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/supabase-provider";

export function LoginForm() {
  const supabase = useSupabase();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signErr) {
        setError(signErr.message || "Invalid email or password.");
        return;
      }
      router.push("/map");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-[#1a1c1e] p-6">
      <div className="w-full max-w-[400px] rounded-2xl border border-zinc-800 bg-[#141517] p-8 shadow-xl">
        <h1 className="text-center text-xl font-semibold tracking-tight text-[#f57c20]">
          Rack-Damage_Maintenance
        </h1>
        <p className="mt-2 text-center text-sm text-zinc-500">
          Sign in with your email and password
        </p>

        <form className="mt-8 space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <label className="block">
            <span className="text-xs font-medium text-zinc-400">Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-[#f57c20]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-zinc-400">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-[#f57c20]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error ? (
            <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#f57c20] py-2.5 text-sm font-semibold text-zinc-900 transition-opacity hover:opacity-95 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
