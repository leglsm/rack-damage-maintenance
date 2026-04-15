"use client";

import { useCallback, useEffect, useState } from "react";
import { useSupabase } from "@/components/supabase-provider";
import type { Plant } from "@/types";
import { setSelectedPlantIdClient } from "@/lib/selected-plant";

const CARD_BACKGROUNDS = [
  "from-teal-600 to-teal-800",
  "from-blue-600 to-blue-900",
  "from-emerald-700 to-emerald-950",
  "from-violet-600 to-violet-900",
  "from-fuchsia-600 to-fuchsia-900",
  "from-amber-700 to-amber-950",
  "from-sky-600 to-sky-900",
  "from-rose-600 to-rose-900",
] as const;

function PlantCard({
  plant,
  index,
  onSelect,
}: {
  plant: Plant;
  index: number;
  onSelect: (id: string) => void;
}) {
  const bg = CARD_BACKGROUNDS[index % CARD_BACKGROUNDS.length];
  return (
    <button
      type="button"
      onClick={() => onSelect(plant.id)}
      className={`group relative flex min-h-[140px] flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-left text-white shadow-lg ring-1 ring-white/10 transition hover:ring-2 hover:ring-[#f57c20]/80 hover:brightness-105 ${bg}`}
    >
      <span
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute bottom-0 left-0 h-16 w-32 -skew-x-12 bg-black/10"
        aria-hidden
      />
      <IconFactory className="relative h-9 w-9 shrink-0 text-white/95 drop-shadow" />
      <span className="relative mt-4 text-lg font-bold leading-tight tracking-tight">
        {plant.name}
      </span>
    </button>
  );
}

export function PlantPickerView() {
  const supabase = useSupabase();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { data, error: qErr } = await supabase
        .from("plants")
        .select("*")
        .order("name", { ascending: true });
      if (qErr) throw qErr;
      setPlants((data ?? []) as Plant[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load plants.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSelectPlant = (id: string) => {
    const clean = id.trim();
    if (!clean) return;
    setSelectedPlantIdClient(clean);
    // Full navigation so the next request always includes the plant cookie
    // (client router.push + refresh can race and skip the cookie on middleware).
    window.location.assign("/map");
  };

  const onCreatePlant = async () => {
    const name = newName.trim();
    if (!name) {
      setSaveError("Enter a plant name.");
      return;
    }
    setSaveError(null);
    setSaving(true);
    try {
      const { data, error: insErr } = await supabase
        .from("plants")
        .insert({ name })
        .select()
        .single();
      if (insErr) throw insErr;
      setAddOpen(false);
      setNewName("");
      setPlants((prev) =>
        [...prev, data as Plant].sort((a, b) => a.name.localeCompare(b.name)),
      );
      onSelectPlant((data as Plant).id);
    } catch (e: unknown) {
      setSaveError(
        e instanceof Error ? e.message : "Could not create plant.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-zinc-500">
        Loading plants…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#1a1c1e] p-6 md:p-10">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl font-semibold text-white">Choose a plant</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Select where you are working. You can switch plants anytime from the
          sidebar.
        </p>

        {error ? (
          <p className="mt-6 rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {plants.map((plant, i) => (
            <PlantCard
              key={plant.id}
              plant={plant}
              index={i}
              onSelect={onSelectPlant}
            />
          ))}

          <button
            type="button"
            onClick={() => {
              setSaveError(null);
              setNewName("");
              setAddOpen(true);
            }}
            className="group relative flex min-h-[140px] flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed border-zinc-600 bg-zinc-900/40 p-5 text-zinc-300 transition hover:border-[#f57c20]/60 hover:bg-zinc-800/60 hover:text-white"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-zinc-500 text-3xl font-light text-zinc-400 group-hover:border-[#f57c20]/70 group-hover:text-[#f57c20]">
              +
            </span>
            <span className="text-sm font-semibold">Add new plant</span>
          </button>
        </div>
      </div>

      {addOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setAddOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-zinc-700 bg-[#141517] p-6 shadow-2xl"
            role="dialog"
            aria-labelledby="add-plant-title"
          >
            <h2
              id="add-plant-title"
              className="text-lg font-semibold text-white"
            >
              New plant
            </h2>
            <label className="mt-4 block">
              <span className="text-xs font-medium text-zinc-400">Name</span>
              <input
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white outline-none focus:border-[#f57c20]"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Duncan Plant"
                autoFocus
              />
            </label>
            {saveError ? (
              <p className="mt-3 text-sm text-red-400">{saveError}</p>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                className="rounded-lg bg-[#f57c20] px-4 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
                onClick={() => void onCreatePlant()}
              >
                {saving ? "Creating…" : "Create & open"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function IconFactory({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.25}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
      />
    </svg>
  );
}
