"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { locationIdFromGridCell } from "@/lib/grid-location";
import type { IssueMarkerInput } from "@/lib/spotter-marker-appearance";
import { useSupabase } from "@/components/supabase-provider";
import type { Component, FloorPlan, Spotter } from "@/types";
import { FloorPlanUpload } from "@/components/map/FloorPlanUpload";
import { IssuePanel } from "@/components/map/IssuePanel";
import { MapControls } from "@/components/map/MapControls";
import { MapStage, type MapStageHandle } from "@/components/map/MapStage";
import { SpotterPlacePopup } from "@/components/map/SpotterPlacePopup";

type MapMode = "MARK" | "VIEW";

type Transform = { scale: number; tx: number; ty: number };

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

export function MapView() {
  const supabase = useSupabase();
  const stageRef = useRef<MapStageHandle>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null);
  const [spotters, setSpotters] = useState<Spotter[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<MapMode>("VIEW");
  const [transform, setTransform] = useState<Transform>({
    scale: 1,
    tx: 0,
    ty: 0,
  });
  const [selectedSpotterId, setSelectedSpotterId] = useState<string | null>(
    null,
  );
  const [placement, setPlacement] = useState<{
    locationId: string;
    normX: number;
    normY: number;
    clientX: number;
    clientY: number;
  } | null>(null);
  const [issuesBySpotterId, setIssuesBySpotterId] = useState<
    Record<string, IssueMarkerInput[]>
  >({});

  const loadSpotters = useCallback(async (planId: string) => {
    const { data, error } = await supabase
      .from("spotters")
      .select("*")
      .eq("floor_plan_id", planId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    setSpotters((data ?? []) as Spotter[]);
  }, [supabase]);

  const loadComponents = useCallback(async () => {
    const { data, error } = await supabase
      .from("components")
      .select("*")
      .eq("is_active", true)
      .order("name");
    if (error) throw error;
    setComponents((data ?? []) as Component[]);
  }, [supabase]);

  const loadSpotterIssues = useCallback(
    async (spotterIds: string[]) => {
      if (spotterIds.length === 0) {
        setIssuesBySpotterId({});
        return;
      }
      const { data, error } = await supabase
        .from("issues")
        .select("spotter_id, priority, status")
        .in("spotter_id", spotterIds);
      if (error) throw error;
      const next: Record<string, IssueMarkerInput[]> = {};
      for (const id of spotterIds) next[id] = [];
      for (const row of data ?? []) {
        const sid = row.spotter_id as string;
        if (!next[sid]) next[sid] = [];
        next[sid].push({
          priority: String(row.priority ?? ""),
          status: String(row.status ?? ""),
        });
      }
      setIssuesBySpotterId(next);
    },
    [supabase],
  );

  const spotterIdsKey = useMemo(
    () => spotters.map((s) => s.id).sort().join(","),
    [spotters],
  );

  useEffect(() => {
    if (!floorPlan) {
      setIssuesBySpotterId({});
      return;
    }
    const ids = spotterIdsKey ? spotterIdsKey.split(",") : [];
    void loadSpotterIssues(ids).catch((e: unknown) => {
      console.error(e);
    });
  }, [floorPlan, spotterIdsKey, loadSpotterIssues]);

  const refreshFloorPlan = useCallback(async () => {
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from("floor_plans")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      const plan = (data as FloorPlan | null) ?? null;
      setFloorPlan(plan);
      if (plan) await loadSpotters(plan.id);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load data.");
    }
    try {
      await loadComponents();
    } catch {
      /* Issue panel can show empty components */
    } finally {
      setBootstrapped(true);
    }
  }, [supabase, loadComponents, loadSpotters]);

  useEffect(() => {
    void refreshFloorPlan();
  }, [refreshFloorPlan]);

  const onMarkImage = useCallback(
    (norm: { x: number; y: number }, client: { x: number; y: number }) => {
      if (!floorPlan) return;
      const locationId = locationIdFromGridCell(
        norm.x,
        norm.y,
        floorPlan.grid_x,
        floorPlan.grid_y,
      );
      setPlacement({
        locationId,
        normX: norm.x,
        normY: norm.y,
        clientX: client.x,
        clientY: client.y,
      });
    },
    [floorPlan],
  );

  const confirmPlacement = async (locationName: string) => {
    if (!floorPlan || !placement) return;
    try {
      const { error } = await supabase.from("spotters").insert({
        floor_plan_id: floorPlan.id,
        location_id: placement.locationId,
        location_name: locationName,
        x_coord: placement.normX,
        y_coord: placement.normY,
      });
      if (error) throw error;
      setPlacement(null);
      await loadSpotters(floorPlan.id);
    } catch (e: unknown) {
      console.error(e);
    }
  };

  const onMarkerDragEnd = async (id: string, x: number, y: number) => {
    try {
      const { error } = await supabase
        .from("spotters")
        .update({ x_coord: x, y_coord: y })
        .eq("id", id);
      if (error) throw error;
      setSpotters((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, x_coord: x, y_coord: y } : s,
        ),
      );
    } catch (e: unknown) {
      console.error(e);
      void refreshFloorPlan();
    }
  };

  const zoomAroundViewportCenter = (factor: number) => {
    const vp = document.querySelector(
      "[data-map-viewport]",
    ) as HTMLElement | null;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const mx = rect.width / 2;
    const my = rect.height / 2;
    const { scale, tx, ty } = transform;
    const worldX = (mx - tx) / scale;
    const worldY = (my - ty) / scale;
    const newScale = clamp(scale * factor, 0.04, 10);
    setTransform({ scale: newScale, tx: mx - worldX * newScale, ty: my - worldY * newScale });
  };

  const selectedSpotter = selectedSpotterId
    ? spotters.find((s) => s.id === selectedSpotterId) ?? null
    : null;

  if (!bootstrapped) {
    return (
      <div className="flex flex-1 items-center justify-center text-zinc-500">
        Loading map…
      </div>
    );
  }

  if (loadError && !floorPlan) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <p className="text-center text-red-400">{loadError}</p>
        <button
          type="button"
          className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
          onClick={() => {
            setBootstrapped(false);
            void refreshFloorPlan();
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!floorPlan) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <FloorPlanUpload
          onCreated={(plan) => {
            setFloorPlan(plan);
            void loadSpotters(plan.id);
            void loadComponents();
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-zinc-800 px-4 py-3">
        <h1 className="text-lg font-semibold text-white">{floorPlan.name}</h1>
        <p className="text-xs text-zinc-500">
          Grid {floorPlan.grid_x} × {floorPlan.grid_y} ·{" "}
          {mode === "MARK" ? "Mark mode: click map to place" : "View mode: drag to pan"}
        </p>
      </header>

      <MapStage
        ref={stageRef}
        floorPlan={floorPlan}
        spotters={spotters}
        issuesBySpotterId={issuesBySpotterId}
        mode={mode}
        transform={transform}
        onTransform={setTransform}
        onMarkImage={onMarkImage}
        onMarkerSelect={(id) => {
          setPlacement(null);
          setSelectedSpotterId(id);
        }}
        onMarkerDragEnd={onMarkerDragEnd}
      />

      <MapControls
        mode={mode}
        onModeChange={setMode}
        onZoomIn={() => zoomAroundViewportCenter(1.15)}
        onZoomOut={() => zoomAroundViewportCenter(1 / 1.15)}
        onFit={() => stageRef.current?.fitToView()}
        issuePanelOpen={!!selectedSpotter}
      />

      {placement ? (
        <SpotterPlacePopup
          locationId={placement.locationId}
          position={{ left: placement.clientX, top: placement.clientY }}
          onPlace={(name) => void confirmPlacement(name)}
          onCancel={() => setPlacement(null)}
        />
      ) : null}

      {selectedSpotter ? (
        <IssuePanel
          spotter={selectedSpotter}
          components={components}
          onClose={() => setSelectedSpotterId(null)}
          onIssuesChanged={() => {
            void loadSpotterIssues(spotters.map((s) => s.id));
          }}
        />
      ) : null}
    </div>
  );
}
