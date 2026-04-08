"use client";

import { useState } from "react";

type Props = {
  locationId: string;
  position: { left: number; top: number };
  onPlace: (locationName: string) => void;
  onCancel: () => void;
};

export function SpotterPlacePopup({
  locationId,
  position,
  onPlace,
  onCancel,
}: Props) {
  const [name, setName] = useState("");

  return (
    <div
      className="fixed z-50 w-64 rounded-lg border border-zinc-700 bg-zinc-900 p-3 shadow-xl"
      style={{
        left: position.left,
        top: position.top,
        transform: "translate(-50%, calc(-100% - 12px))",
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="text-xs font-medium text-zinc-500">Location ID</div>
      <div className="font-mono text-sm text-[#f57c20]">{locationId}</div>
      <label className="mt-3 block">
        <span className="text-xs font-medium text-zinc-400">Location name</span>
        <input
          className="mt-1 w-full rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-sm text-white outline-none focus:border-[#f57c20]"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Loading Dock"
          autoFocus
        />
      </label>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="flex-1 rounded bg-[#f57c20] py-1.5 text-sm font-semibold text-zinc-900"
          onClick={() => onPlace(name.trim() || "Unnamed")}
        >
          Place marker
        </button>
        <button
          type="button"
          className="rounded border border-zinc-600 px-2 text-sm text-zinc-300 hover:bg-zinc-800"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
