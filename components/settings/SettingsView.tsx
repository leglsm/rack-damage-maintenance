"use client";

import { useCallback, useEffect, useState } from "react";
import { useSupabase } from "@/components/supabase-provider";
import type { Component } from "@/types";

export function SettingsView() {
  const supabase = useSupabase();
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [darkModeUi, setDarkModeUi] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { data, error: e } = await supabase
        .from("components")
        .select("*")
        .order("name", { ascending: true });
      if (e) throw e;
      setComponents((data ?? []) as Component[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load components.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const addComponent = async () => {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const { error: e } = await supabase.from("components").insert({
        name,
        is_active: true,
      });
      if (e) throw e;
      setNewName("");
      setAdding(false);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row: Component) => {
    try {
      const { error: e } = await supabase
        .from("components")
        .update({ is_active: !row.is_active })
        .eq("id", row.id);
      if (e) throw e;
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Update failed.");
    }
  };

  const deleteRow = async (row: Component) => {
    if (
      !window.confirm(
        `Delete component "${row.name}"? This cannot be undone.`,
      )
    )
      return;
    try {
      const { error: e } = await supabase.from("components").delete().eq("id", row.id);
      if (e) throw e;
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  };

  const panel =
    "rounded-xl border border-zinc-700/80 bg-[#22252a] p-5 shadow-sm";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-4 sm:p-6">
      <header>
        <h1 className="text-xl font-semibold text-white">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage rack components and preferences.
        </p>
      </header>

      {error ? (
        <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <section className={panel}>
        <h2 className="text-lg font-semibold text-white">Component Manager</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Components appear in issue forms. Inactive items stay in the list but
          are grayed out.
        </p>

        {adding ? (
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <label className="min-w-[200px] flex-1">
              <span className="text-xs font-medium text-zinc-400">
                New component name
              </span>
              <input
                className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-[#f57c20]"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Upright"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") void addComponent();
                }}
              />
            </label>
            <button
              type="button"
              disabled={saving || !newName.trim()}
              className="rounded-lg bg-[#f57c20] px-4 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
              onClick={() => void addComponent()}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
              onClick={() => {
                setAdding(false);
                setNewName("");
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="mt-4 rounded-lg border border-[#f57c20]/50 bg-[#f57c20]/10 px-4 py-2 text-sm font-semibold text-[#f57c20] hover:bg-[#f57c20]/20"
            onClick={() => setAdding(true)}
          >
            Add Component
          </button>
        )}

        <div className="mt-4 overflow-hidden rounded-lg border border-zinc-700/60">
          {loading ? (
            <p className="p-4 text-sm text-zinc-500">Loading…</p>
          ) : components.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">No components yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-700/60">
              {components.map((c) => (
                <li
                  key={c.id}
                  className={`flex flex-wrap items-center gap-3 px-4 py-3 ${
                    c.is_active ? "" : "bg-zinc-900/40 opacity-70"
                  }`}
                >
                  <span
                    className={`min-w-0 flex-1 font-medium ${
                      c.is_active ? "text-zinc-100" : "text-zinc-500"
                    }`}
                  >
                    {c.name}
                  </span>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
                    <span className="sr-only">Active</span>
                    <input
                      type="checkbox"
                      checked={c.is_active}
                      onChange={() => void toggleActive(c)}
                      className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-[#f57c20] focus:ring-[#f57c20]"
                    />
                    Active
                  </label>
                  <button
                    type="button"
                    className="rounded border border-red-900/60 px-3 py-1 text-sm text-red-400 hover:bg-red-950/40"
                    onClick={() => void deleteRow(c)}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className={panel}>
        <h2 className="text-lg font-semibold text-white">Appearance</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Theme preference (not persisted yet).
        </p>
        <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-zinc-700/60 bg-zinc-900/30 px-4 py-3">
          <span className="text-sm text-zinc-300">Dark mode</span>
          <button
            type="button"
            role="switch"
            aria-checked={darkModeUi}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
              darkModeUi ? "bg-[#f57c20]" : "bg-zinc-600"
            }`}
            onClick={() => setDarkModeUi((v) => !v)}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                darkModeUi ? "left-5" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </section>

      <section className={panel}>
        <h2 className="text-lg font-semibold text-white">About</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4 border-b border-zinc-700/50 py-2">
            <dt className=" shrink-0 text-zinc-500">App name</dt>
            <dd className="max-w-[min(100%,20rem)] text-right font-medium leading-snug text-zinc-200">
              Rack Damage Maintenance Web Application for Opmobility
            </dd>
          </div>
          <div className="flex justify-between gap-4 py-2">
            <dt className="text-zinc-500">Version</dt>
            <dd className="font-mono text-zinc-200">0.1.0</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
