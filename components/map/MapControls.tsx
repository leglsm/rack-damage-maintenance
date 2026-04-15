"use client";

type MapMode = "MARK" | "VIEW";

type Props = {
  mode: MapMode;
  onModeChange: (m: MapMode) => void;
  dimFloorPlan: boolean;
  onDimFloorPlanChange: (dim: boolean) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  /** Shift left when a right-side panel is open so controls stay visible */
  issuePanelOpen?: boolean;
};

export function MapControls({
  mode,
  onModeChange,
  dimFloorPlan,
  onDimFloorPlanChange,
  onZoomIn,
  onZoomOut,
  onFit,
  issuePanelOpen,
}: Props) {
  const btn =
    "flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100 shadow-lg transition-colors hover:bg-zinc-800 hover:border-zinc-600";

  return (
    <div
      className={`pointer-events-none fixed bottom-6 z-30 flex flex-col gap-2 ${issuePanelOpen ? "right-[calc(380px+1.5rem)]" : "right-6"}`}
    >
      <div className="pointer-events-auto flex flex-col gap-2">
        <button
          type="button"
          className={btn}
          onClick={onZoomIn}
          title="Zoom in"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          className={btn}
          onClick={onZoomOut}
          title="Zoom out"
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          className={`${btn} text-xs font-semibold px-2 w-auto min-w-[2.75rem]`}
          onClick={onFit}
          title="Fit to view"
        >
          ⊡
        </button>
        <button
          type="button"
          className={`${btn} w-auto px-3 text-xs font-bold ${
            mode === "MARK"
              ? "border-[#f57c20] bg-[#f57c20]/20 text-[#f57c20]"
              : ""
          }`}
          onClick={() => onModeChange(mode === "MARK" ? "VIEW" : "MARK")}
          title="Toggle mark / view mode"
        >
          {mode === "MARK" ? "MARK" : "VIEW"}
        </button>
        <button
          type="button"
          className={`${btn} w-auto px-2.5 text-[10px] font-bold leading-tight ${
            dimFloorPlan
              ? "border-sky-500/70 bg-sky-500/15 text-sky-200"
              : ""
          }`}
          onClick={() => onDimFloorPlanChange(!dimFloorPlan)}
          title={
            dimFloorPlan
              ? "Full sharp floor plan (spotters less emphasized)"
              : "Dim floor plan so spotters stand out"
          }
        >
          {dimFloorPlan ? "Focus" : "Map"}
        </button>
      </div>
    </div>
  );
}
