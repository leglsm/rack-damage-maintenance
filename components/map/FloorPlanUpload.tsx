"use client";

import { useCallback, useState } from "react";
import { useSupabase } from "@/components/supabase-provider";
import type { FloorPlan } from "@/types";

type Props = {
  onCreated: (plan: FloorPlan) => void;
};

function extFromFile(file: File): string {
  const n = file.name.toLowerCase();
  if (n.endsWith(".png")) return "png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "jpg";
  if (n.endsWith(".webp")) return "webp";
  if (n.endsWith(".gif")) return "gif";
  return "png";
}

export function FloorPlanUpload({ onCreated }: Props) {
  const supabase = useSupabase();
  const [planName, setPlanName] = useState("");
  const [gridX, setGridX] = useState(100);
  const [gridY, setGridY] = useState(50);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const setFileFromList = useCallback((f: File | null) => {
    setFile(f);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return f ? URL.createObjectURL(f) : null;
    });
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f?.type.startsWith("image/")) setFileFromList(f);
    },
    [setFileFromList],
  );

  const onSave = async () => {
    setError(null);
    if (!file || !planName.trim()) {
      setError("Choose an image and enter a plan name.");
      return;
    }
    setBusy(true);
    try {
      const ext = extFromFile(file);
      const path = `floor-plans/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("issue-photos")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;

      const {
        data: { publicUrl },
      } = supabase.storage.from("issue-photos").getPublicUrl(path);

      const { data: row, error: insErr } = await supabase
        .from("floor_plans")
        .insert({
          name: planName.trim(),
          image_url: publicUrl,
          grid_x: gridX,
          grid_y: gridY,
        })
        .select()
        .single();

      if (insErr) throw insErr;
      onCreated(row as FloorPlan);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      lang="en-US"
      translate="no"
      className="mx-auto flex max-w-lg flex-col gap-6 p-8"
    >
      <div>
        <h1 className="text-2xl font-semibold text-white">Upload floor plan</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Drag and drop a CAD or image, or click to browse. Then set the grid used
          for location IDs.
        </p>
      </div>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            document.getElementById("floor-plan-file")?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById("floor-plan-file")?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dragOver
            ? "border-[#f57c20] bg-[#f57c20]/10"
            : "border-zinc-600 bg-zinc-900/50 hover:border-zinc-500"
        }`}
      >
        <input
          id="floor-plan-file"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setFileFromList(f);
          }}
        />
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Preview"
            className="mx-auto max-h-48 max-w-full object-contain"
          />
        ) : (
          <p className="text-zinc-400">
            Drop image here or click to upload
          </p>
        )}
      </div>

      <label className="block">
        <span className="text-sm font-medium text-zinc-300">Plan name</span>
        <input
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-[#f57c20]"
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          placeholder="e.g. Building A — Level 1"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium text-zinc-300">Grid X</span>
          <input
            type="number"
            min={1}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-[#f57c20]"
            value={gridX}
            onChange={(e) => setGridX(Number(e.target.value) || 100)}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-300">Grid Y</span>
          <input
            type="number"
            min={1}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-[#f57c20]"
            value={gridY}
            onChange={(e) => setGridY(Number(e.target.value) || 50)}
          />
        </label>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <button
        type="button"
        disabled={busy}
        onClick={onSave}
        className="rounded-lg bg-[#f57c20] px-4 py-2.5 font-semibold text-zinc-900 transition-opacity disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save floor plan"}
      </button>
    </div>
  );
}
