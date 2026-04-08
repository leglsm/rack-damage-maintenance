"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  spotterMarkerAppearance,
  type IssueMarkerInput,
} from "@/lib/spotter-marker-appearance";
import type { FloorPlan, Spotter } from "@/types";

export type MapStageHandle = {
  fitToView: () => void;
};

type MapMode = "MARK" | "VIEW";

type Transform = { scale: number; tx: number; ty: number };

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

/** Movement past this (px) starts drag immediately. */
const SPOTTER_DRAG_THRESHOLD_PX = 5;
/** Hold this long without releasing → treat as drag (can move pin without a big twitch). */
const SPOTTER_LONG_PRESS_MS = 450;

type Props = {
  floorPlan: FloorPlan;
  spotters: Spotter[];
  issuesBySpotterId: Record<string, IssueMarkerInput[]>;
  mode: MapMode;
  transform: Transform;
  onTransform: (t: Transform) => void;
  onMarkImage: (
    norm: { x: number; y: number },
    client: { x: number; y: number },
  ) => void;
  onMarkerSelect: (id: string) => void;
  onMarkerDragEnd: (id: string, x: number, y: number) => void;
};

export const MapStage = forwardRef<MapStageHandle, Props>(function MapStage(
  {
    floorPlan,
    spotters,
    issuesBySpotterId,
    mode,
    transform,
    onTransform,
    onMarkImage,
    onMarkerSelect,
    onMarkerDragEnd,
  },
  ref,
) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const fittedOnce = useRef(false);
  const [livePos, setLivePos] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const panRef = useRef<{
    active: boolean;
    lx: number;
    ly: number;
  } | null>(null);

  const transformRef = useRef(transform);
  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  const dragRef = useRef<{
    id: string;
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
    captureEl: HTMLElement;
    longPressTimer: ReturnType<typeof setTimeout> | null;
  } | null>(null);

  const onMarkerSelectRef = useRef(onMarkerSelect);
  const onMarkerDragEndRef = useRef(onMarkerDragEnd);
  useEffect(() => {
    onMarkerSelectRef.current = onMarkerSelect;
  }, [onMarkerSelect]);
  useEffect(() => {
    onMarkerDragEndRef.current = onMarkerDragEnd;
  }, [onMarkerDragEnd]);

  const fitToView = useCallback(() => {
    const vp = viewportRef.current;
    const img = imgRef.current;
    const iw = img?.naturalWidth ?? imgSize.w;
    const ih = img?.naturalHeight ?? imgSize.h;
    if (!vp || !iw || !ih) return;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    const s = Math.min(vw / iw, vh / ih, 1) * 0.95;
    const padX = (vw - iw * s) / 2;
    const padY = (vh - ih * s) / 2;
    onTransform({ scale: s, tx: padX, ty: padY });
  }, [imgSize.h, imgSize.w, onTransform]);

  useImperativeHandle(ref, () => ({ fitToView }), [fitToView]);

  useEffect(() => {
    if (imgSize.w && imgSize.h && !fittedOnce.current) {
      fittedOnce.current = true;
      fitToView();
    }
  }, [fitToView, imgSize.h, imgSize.w]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const { scale, tx, ty } = transformRef.current;
    const worldX = (mx - tx) / scale;
    const worldY = (my - ty) / scale;
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    const newScale = clamp(scale * factor, 0.04, 10);
    const newTx = mx - worldX * newScale;
    const newTy = my - worldY * newScale;
    onTransform({ scale: newScale, tx: newTx, ty: newTy });
  };

  const onViewportPointerDown = (e: React.PointerEvent) => {
    if (mode !== "VIEW") return;
    if ((e.target as HTMLElement).closest("[data-spotter-marker]")) return;
    panRef.current = { active: true, lx: e.clientX, ly: e.clientY };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const onViewportPointerMove = (e: React.PointerEvent) => {
    const pan = panRef.current;
    if (!pan?.active) return;
    const dx = e.clientX - pan.lx;
    const dy = e.clientY - pan.ly;
    pan.lx = e.clientX;
    pan.ly = e.clientY;
    const t = transformRef.current;
    onTransform({
      ...t,
      tx: t.tx + dx,
      ty: t.ty + dy,
    });
  };

  const onViewportPointerUp = (e: React.PointerEvent) => {
    if (panRef.current?.active) {
      panRef.current = null;
      try {
        (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  };

  const onImageClick = (e: React.MouseEvent) => {
    if (mode !== "MARK") return;
    if ((e.target as HTMLElement).closest("[data-spotter-marker]")) return;
    const img = imgRef.current;
    if (!img) return;
    const r = img.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    onMarkImage({ x: clamp01(x), y: clamp01(y) }, { x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    const clearLongPress = (d: NonNullable<typeof dragRef.current>) => {
      if (d.longPressTimer != null) {
        clearTimeout(d.longPressTimer);
        d.longPressTimer = null;
      }
    };

    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current;
      const img = imgRef.current;
      if (!d || !img || ev.pointerId !== d.pointerId) return;
      const dist = Math.hypot(ev.clientX - d.startX, ev.clientY - d.startY);
      if (dist > SPOTTER_DRAG_THRESHOLD_PX) {
        d.moved = true;
        clearLongPress(d);
      }
      if (!d.moved) return;
      const r = img.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      const x = clamp01((ev.clientX - r.left) / r.width);
      const y = clamp01((ev.clientY - r.top) / r.height);
      setLivePos((prev) => ({ ...prev, [d.id]: { x, y } }));
    };

    const onUp = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d || ev.pointerId !== d.pointerId) return;

      clearLongPress(d);

      try {
        d.captureEl.releasePointerCapture(d.pointerId);
      } catch {
        /* ignore */
      }

      dragRef.current = null;
      const img = imgRef.current;
      if (!img) return;

      if (!d.moved) {
        onMarkerSelectRef.current(d.id);
        return;
      }

      const r = img.getBoundingClientRect();
      const x = r.width > 0 ? clamp01((ev.clientX - r.left) / r.width) : 0;
      const y = r.height > 0 ? clamp01((ev.clientY - r.top) / r.height) : 0;
      setLivePos((prev) => {
        const next = { ...prev };
        delete next[d.id];
        return next;
      });
      onMarkerDragEndRef.current(d.id, x, y);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const { scale, tx, ty } = transform;
  const gx = floorPlan.grid_x;
  const gy = floorPlan.grid_y;

  const gridLines =
    imgSize.w > 0 && imgSize.h > 0 ? (
      <svg
        className="z-[1]"
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        <g
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={0.5}
        >
          {gx > 1
            ? Array.from({ length: gx - 1 }, (_, idx) => {
                const i = idx + 1;
                const x = `${(i / gx) * 100}%`;
                return (
                  <line
                    key={`v-${i}`}
                    x1={x}
                    y1="0%"
                    x2={x}
                    y2="100%"
                  />
                );
              })
            : null}
          {gy > 1
            ? Array.from({ length: gy - 1 }, (_, idx) => {
                const i = idx + 1;
                const y = `${(i / gy) * 100}%`;
                return (
                  <line
                    key={`h-${i}`}
                    x1="0%"
                    y1={y}
                    x2="100%"
                    y2={y}
                  />
                );
              })
            : null}
        </g>
      </svg>
    ) : null;

  return (
    <div
      ref={viewportRef}
      data-map-viewport
      className="relative min-h-0 flex-1 overflow-hidden bg-zinc-950 touch-none"
      onWheel={onWheel}
      onPointerDown={onViewportPointerDown}
      onPointerMove={onViewportPointerMove}
      onPointerUp={onViewportPointerUp}
      onPointerCancel={onViewportPointerUp}
      style={{ cursor: mode === "VIEW" ? "grab" : "default" }}
    >
      <div
        className="absolute left-0 top-0"
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: "0 0",
        }}
      >
        <div
          className="relative inline-block leading-none"
          onClick={onImageClick}
          role="presentation"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={floorPlan.image_url}
            alt={floorPlan.name}
            className="relative z-0 block max-w-none select-none"
            draggable={false}
            onLoad={(e) => {
              const el = e.currentTarget;
              setImgSize({ w: el.naturalWidth, h: el.naturalHeight });
            }}
          />
          {gridLines}
          {spotters.map((s) => {
            const live = livePos[s.id];
            const px = live?.x ?? Number(s.x_coord);
            const py = live?.y ?? Number(s.y_coord);
            const appearance = spotterMarkerAppearance(
              issuesBySpotterId[s.id] ?? [],
            );
            return (
              <button
                key={s.id}
                type="button"
                data-spotter-marker
                className="absolute z-10 flex min-h-[52px] min-w-[52px] -translate-x-1/2 -translate-y-full flex-col items-center justify-end bg-transparent p-0 outline-none touch-manipulation"
                style={{ left: `${px * 100}%`, top: `${py * 100}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const el = e.currentTarget as HTMLElement;
                  const pointerId = e.pointerId;
                  const markerId = s.id;
                  const d: NonNullable<typeof dragRef.current> = {
                    id: markerId,
                    pointerId,
                    startX: e.clientX,
                    startY: e.clientY,
                    moved: false,
                    captureEl: el,
                    longPressTimer: null,
                  };
                  d.longPressTimer = window.setTimeout(() => {
                    const cur = dragRef.current;
                    if (!cur || cur.pointerId !== pointerId || cur.id !== markerId)
                      return;
                    cur.moved = true;
                    cur.longPressTimer = null;
                  }, SPOTTER_LONG_PRESS_MS);
                  dragRef.current = d;
                  try {
                    el.setPointerCapture(e.pointerId);
                  } catch {
                    /* ignore */
                  }
                }}
              >
                <span
                  className={`max-w-[4.5rem] truncate px-0.5 text-center text-[10px] font-mono font-semibold leading-tight ${appearance.labelClass}`}
                >
                  {s.location_id}
                </span>
                <span
                  className="h-0 w-0 border-solid border-x-[7px] border-b-[12px] border-x-transparent"
                  style={{ borderBottomColor: appearance.triangle }}
                />
                <span
                  className="-mt-px h-3 w-3 rounded-full border-2 border-white shadow-md"
                  style={{ backgroundColor: appearance.pin }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});
