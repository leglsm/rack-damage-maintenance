"use client";

import { useCallback, useEffect, useState } from "react";
import { useSupabase } from "@/components/supabase-provider";
import type { FloorPlan } from "@/types";

function extFromFile(file: File): string {
  const n = file.name.toLowerCase();
  if (n.endsWith(".png")) return "png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "jpg";
  if (n.endsWith(".webp")) return "webp";
  if (n.endsWith(".gif")) return "gif";
  return "png";
}

type Props = {
  floorPlan: FloorPlan;
  open: boolean;
  onClose: () => void;
  onSaved: (plan: FloorPlan) => void;
};

/**
 * Updates the existing `floor_plans` row by primary key only (UPDATE, never DELETE).
 */
export function FloorPlanManageModal({
  floorPlan,
  open,
  onClose,
  onSaved,
}: Props) {
  const supabase = useSupabase();
  const [name, setName] = useState(floorPlan.name);
  const [gridX, setGridX] = useState(floorPlan.grid_x);
  const [gridY, setGridY] = useState(floorPlan.grid_y);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(floorPlan.name);
    setGridX(floorPlan.grid_x);
    setGridY(floorPlan.grid_y);
    setFile(null);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setError(null);
  }, [open, floorPlan]);

  const setFileFromList = useCallback((f: File | null) => {
    setFile(f);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return f ? URL.createObjectURL(f) : null;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const onSave = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Plan name is required.");
      return;
    }
    const gx = Number(gridX);
    const gy = Number(gridY);
    if (!Number.isFinite(gx) || gx < 1 || !Number.isFinite(gy) || gy < 1) {
      setError("Grid X and Grid Y must be at least 1.");
      return;
    }

    setSaving(true);
    try {
      const patch: {
        name: string;
        grid_x: number;
        grid_y: number;
        image_url?: string;
      } = {
        name: name.trim(),
        grid_x: gx,
        grid_y: gy,
      };

      if (file) {
        const ext = extFromFile(file);
        const path = `floor-plans/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("issue-photos")
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        const {
          data: { publicUrl },
        } = supabase.storage.from("issue-photos").getPublicUrl(path);
        patch.image_url = publicUrl;
      }

      const { data: row, error: upRow } = await supabase
        .from("floor_plans")
        .update(patch)
        .eq("id", floorPlan.id)
        .select()
        .single();

      if (upRow) throw upRow;
      if (!row) throw new Error("Update returned no row.");

      onSaved(row as FloorPlan);
      setFile(null);
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-700 bg-[#141517] p-6 shadow-2xl"
        role="dialog"
        aria-labelledby="floor-plan-manage-title"
      >
        <div className="flex items-start justify-between gap-2">
          <h2
            id="floor-plan-manage-title"
            className="text-lg font-semibold text-white"
          >
            Manage floor plan
          </h2>
          <button
            type="button"
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            aria-label="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-zinc-700/80 bg-zinc-900/40 p-3 text-sm text-zinc-300">
          <p>
            <span className="text-zinc-500">Current name:</span>{" "}
            {floorPlan.name}
          </p>
          <p className="mt-1">
            <span className="text-zinc-500">Grid:</span> {floorPlan.grid_x} ×{" "}
            {floorPlan.grid_y}
          </p>
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-zinc-300">Plan name</span>
          <input
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-[#f57c20]"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium text-zinc-300">Grid X</span>
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-[#f57c20]"
              value={gridX}
              onChange={(e) => setGridX(Number(e.target.value) || 1)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-300">Grid Y</span>
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-[#f57c20]"
              value={gridY}
              onChange={(e) => setGridY(Number(e.target.value) || 1)}
            />
          </label>
        </div>

        <div className="mt-4">
          <span className="text-sm font-medium text-zinc-300">
            Upload new floor plan image (optional)
          </span>
          <p className="mt-0.5 text-xs text-zinc-500">
            Replaces the map image only. Spotters and issues keep the same
            floor plan record.
          </p>
          <input
            type="file"
            accept="image/*"
            className="mt-2 block w-full text-sm text-zinc-400 file:mr-2 file:rounded file:border-0 file:bg-zinc-800 file:px-2 file:py-1 file:text-zinc-200"
            onChange={(e) => setFileFromList(e.target.files?.[0] ?? null)}
          />
          {preview ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={preview}
              alt="New preview"
              className="mt-2 max-h-36 w-full object-contain"
            />
          ) : null}
        </div>

        {error ? (
          <p className="mt-3 text-sm text-red-400">{error}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            className="flex-1 rounded-lg bg-[#f57c20] px-4 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
            onClick={() => void onSave()}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            disabled={saving}
            className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
