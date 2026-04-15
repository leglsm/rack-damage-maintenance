"use client";

import type { EmailOtpType } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/supabase-provider";

export function InviteConfirmForm() {
  const supabase = useSupabase();
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setBootstrapError(null);
      try {
        const search = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(
          window.location.hash.replace(/^#/, ""),
        );

        const code = search.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) return;
          if (error) {
            setBootstrapError(error.message);
            return;
          }
          window.history.replaceState({}, "", "/auth/confirm");
          setSessionReady(true);
          return;
        }

        const token_hash = search.get("token_hash");
        const typeRaw = search.get("type")?.trim();
        if (token_hash && typeRaw) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: typeRaw as EmailOtpType,
          });
          if (cancelled) return;
          if (error) {
            setBootstrapError(error.message);
            return;
          }
          window.history.replaceState({}, "", "/auth/confirm");
          setSessionReady(true);
          return;
        }

        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (cancelled) return;
          if (error) {
            setBootstrapError(error.message);
            return;
          }
          window.history.replaceState({}, "", "/auth/confirm");
          setSessionReady(true);
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session?.user) {
          setSessionReady(true);
        } else {
          setBootstrapError(
            "Invalid or expired invite link. Request a new invite from your administrator.",
          );
        }
      } catch (e) {
        if (!cancelled) {
          const message =
            e instanceof Error ? e.message : "Something went wrong.";
          setBootstrapError(message);
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const onSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (password.length < 6) {
      setSubmitError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setSubmitError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setSubmitError(error.message);
        return;
      }
      router.push("/plants");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const stuckEmpty =
    !bootstrapping && !bootstrapError && !sessionReady;

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-[#1a1c1e] p-6">
      <div className="w-full max-w-[400px] rounded-2xl border border-zinc-800 bg-[#141517] p-8 shadow-xl">
        <h1 className="text-center text-xl font-semibold tracking-tight text-[#f57c20]">
          Rack-Damage_Maintenance
        </h1>

        {bootstrapping ? (
          <p className="mt-6 text-center text-sm text-zinc-500">
            Completing invite…
          </p>
        ) : bootstrapError ? (
          <p className="mt-6 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-center text-sm text-red-300">
            {bootstrapError}
          </p>
        ) : sessionReady ? (
          <>
            <h2 className="mt-4 text-center text-lg font-semibold text-white">
              Set your password
            </h2>
            <p className="mt-1 text-center text-sm text-zinc-500">
              Choose a password to finish activating your account.
            </p>
            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => void onSetPassword(e)}
            >
              <label className="block">
                <span className="text-xs font-medium text-zinc-400">
                  Password
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-[#f57c20]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-zinc-400">
                  Confirm password
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-[#f57c20]"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </label>
              {submitError ? (
                <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
                  {submitError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-[#f57c20] py-2.5 text-sm font-semibold text-zinc-900 transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Save password"}
              </button>
            </form>
          </>
        ) : stuckEmpty ? (
          <p className="mt-6 text-center text-sm text-zinc-400">
            Something went wrong loading this page. Please refresh or open your
            invite link again.
          </p>
        ) : null}
      </div>
    </div>
  );
}
