"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSupabase } from "@/components/supabase-provider";
import type { Component, Issue, IssuePhoto, Spotter } from "@/types";
import {
  ACTIONS,
  ISSUE_TYPES,
  PRIORITIES,
  STATUSES,
} from "@/components/map/issue-options";

function priorityBadge(p: string) {
  switch (p) {
    case "Low":
      return "border border-yellow-500/40 bg-yellow-500/15 text-yellow-400";
    case "Moderate":
      return "border border-orange-400/50 bg-orange-500/15 text-orange-400";
    case "High":
      return "border border-red-500/50 bg-red-500/15 text-red-400";
    case "Unload":
      return "border border-red-900 bg-red-950/80 text-red-200";
    default:
      return "border border-zinc-600 bg-zinc-800 text-zinc-300";
  }
}

type Props = {
  spotter: Spotter;
  components: Component[];
  onClose: () => void;
  /** Called after issues are created/updated from this panel so the map can refresh marker colors. */
  onIssuesChanged?: () => void;
};

export function IssuePanel({
  spotter,
  components,
  onClose,
  onIssuesChanged,
}: Props) {
  const supabase = useSupabase();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [photos, setPhotos] = useState<IssuePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [componentName, setComponentName] = useState("");
  const [level, setLevel] = useState(0);
  const [depth, setDepth] = useState(0);
  const [issueType, setIssueType] = useState<string>(ISSUE_TYPES[0]);
  const [priority, setPriority] = useState<string>(PRIORITIES[0]);
  const [actionToTake, setActionToTake] = useState<string>(ACTIONS[0]);
  const [status, setStatus] = useState<string>(STATUSES[0]);
  const [details, setDetails] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = photoFiles.map((f) => URL.createObjectURL(f));
    setPhotoPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [photoFiles]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: issueRows, error: e1 } = await supabase
        .from("issues")
        .select("*")
        .eq("spotter_id", spotter.id)
        .order("created_at", { ascending: false });
      if (e1) throw e1;
      const list = (issueRows ?? []) as Issue[];
      setIssues(list);
      const ids = list.map((i) => i.id);
      if (ids.length === 0) {
        setPhotos([]);
        return;
      }
      const { data: phRows, error: e2 } = await supabase
        .from("issue_photos")
        .select("*")
        .in("issue_id", ids)
        .order("display_order", { ascending: true });
      if (e2) throw e2;
      setPhotos((phRows ?? []) as IssuePhoto[]);
    } finally {
      setLoading(false);
    }
  }, [spotter.id, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const photosByIssue = useMemo(() => {
    const m = new Map<string, IssuePhoto[]>();
    for (const p of photos) {
      const arr = m.get(p.issue_id) ?? [];
      arr.push(p);
      m.set(p.issue_id, arr);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => a.display_order - b.display_order);
    }
    return m;
  }, [photos]);

  const resetForm = () => {
    setComponentName(components[0]?.name ?? "");
    setLevel(0);
    setDepth(0);
    setIssueType(ISSUE_TYPES[0]);
    setPriority(PRIORITIES[0]);
    setActionToTake(ACTIONS[0]);
    setStatus(STATUSES[0]);
    setDetails("");
    setPhotoFiles([]);
    setFormError(null);
  };

  useEffect(() => {
    if (components.length && !componentName) {
      setComponentName(components[0].name);
    }
  }, [components, componentName]);

  const onPickPhotos = (files: FileList | null) => {
    if (!files?.length) return;
    const next = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setPhotoFiles(next.slice(0, 3));
  };

  const saveIssue = async () => {
    setFormError(null);
    if (!componentName) {
      setFormError("Select a component.");
      return;
    }
    if (photoFiles.length > 3) {
      setFormError("Maximum 3 photos.");
      return;
    }
    setSaving(true);
    try {
      const repairedAt = status === "Repaired" ? new Date().toISOString() : null;
      const { data: inserted, error: insErr } = await supabase
        .from("issues")
        .insert({
          spotter_id: spotter.id,
          component: componentName,
          level,
          depth,
          issue_type: issueType,
          priority,
          action_to_take: actionToTake,
          status,
          details: details || "",
          repaired_at: repairedAt,
        })
        .select("id")
        .single();

      if (insErr) throw insErr;
      const issueId = (inserted as { id: string }).id;

      for (let i = 0; i < photoFiles.length; i++) {
        const file = photoFiles[i];
        const ext = file.name.split(".").pop() || "jpg";
        const path = `issues/${issueId}/${i}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("issue-photos")
          .upload(path, file, { upsert: true });
        if (upErr) throw upErr;
        const {
          data: { publicUrl },
        } = supabase.storage.from("issue-photos").getPublicUrl(path);
        const { error: phErr } = await supabase.from("issue_photos").insert({
          issue_id: issueId,
          photo_url: publicUrl,
          display_order: i,
        });
        if (phErr) throw phErr;
      }

      setShowForm(false);
      resetForm();
      await load();
      onIssuesChanged?.();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-white outline-none focus:border-[#f57c20]";
  const labelCls = "block text-xs font-medium text-zinc-400";

  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex w-[380px] flex-col border-l border-zinc-800 bg-[#141517] shadow-2xl">
      <div className="flex items-start justify-between gap-2 border-b border-zinc-800 p-4">
        <div>
          <div className="font-mono text-sm text-[#f57c20]">
            {spotter.location_id}
          </div>
          <div className="text-lg font-semibold text-white">
            {spotter.location_name}
          </div>
        </div>
        <button
          type="button"
          aria-label="Close panel"
          className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Issues
          </h2>
          <button
            type="button"
            disabled={showForm}
            className="rounded-lg bg-[#f57c20] px-3 py-1.5 text-sm font-semibold text-zinc-900 disabled:opacity-40"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            Add issue
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {issues.map((issue) => {
              const ph = photosByIssue.get(issue.id) ?? [];
              const repaired = issue.status === "Repaired";
              return (
                <li
                  key={issue.id}
                  className={`rounded-xl border p-3 ${
                    repaired
                      ? "border-emerald-600/60 bg-emerald-950/30"
                      : "border-zinc-800 bg-zinc-900/40"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${priorityBadge(issue.priority)}`}
                    >
                      {issue.priority}
                    </span>
                    <span className="text-xs text-zinc-500">{issue.status}</span>
                  </div>
                  <div className="mt-2 text-sm text-zinc-200">
                    <span className="text-zinc-500">Component:</span>{" "}
                    {issue.component}
                  </div>
                  <div className="text-xs text-zinc-400">
                    L{issue.level} · D{issue.depth} · {issue.issue_type} ·{" "}
                    {issue.action_to_take}
                  </div>
                  {issue.details ? (
                    <p className="mt-2 text-sm text-zinc-300">{issue.details}</p>
                  ) : null}
                  {repaired && issue.repaired_at ? (
                    <p className="mt-1 text-xs text-emerald-400/90">
                      Repaired {new Date(issue.repaired_at).toLocaleString()}
                    </p>
                  ) : null}
                  {ph.length > 0 ? (
                    <div className="mt-2 grid grid-cols-3 gap-1">
                      {ph.map((p) => (
                        <a
                          key={p.id}
                          href={p.photo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative aspect-square overflow-hidden rounded bg-zinc-800"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.photo_url}
                            alt=""
                            className="h-full w-full object-contain"
                          />
                        </a>
                      ))}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {showForm ? (
          <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-900/50 p-3">
            <h3 className="text-sm font-semibold text-white">New issue</h3>

            <label className="mt-3 block">
              <span className={labelCls}>Component</span>
              <select
                className={`${inputCls} max-h-32`}
                size={Math.min(6, Math.max(components.length, 1))}
                value={componentName}
                onChange={(e) => setComponentName(e.target.value)}
              >
                {components.length === 0 ? (
                  <option value="">No components — add rows in Supabase</option>
                ) : (
                  components.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </label>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="block">
                <span className={labelCls}>Level</span>
                <input
                  type="number"
                  className={inputCls}
                  value={level}
                  onChange={(e) => setLevel(Number(e.target.value))}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Depth</span>
                <input
                  type="number"
                  className={inputCls}
                  value={depth}
                  onChange={(e) => setDepth(Number(e.target.value))}
                />
              </label>
            </div>

            <label className="mt-3 block">
              <span className={labelCls}>Issue type</span>
              <select
                className={inputCls}
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
              >
                {ISSUE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-3 block">
              <span className={labelCls}>Priority</span>
              <select
                className={inputCls}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {PRIORITIES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-3 block">
              <span className={labelCls}>Action to take</span>
              <select
                className={inputCls}
                value={actionToTake}
                onChange={(e) => setActionToTake(e.target.value)}
              >
                {ACTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-3 block">
              <span className={labelCls}>Status</span>
              <select
                className={inputCls}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUSES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-3 block">
              <span className={labelCls}>Details</span>
              <textarea
                className={`${inputCls} min-h-[72px] resize-y`}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </label>

            <label className="mt-3 block">
              <span className={labelCls}>Photos (max 3)</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="mt-1 w-full text-sm text-zinc-400 file:mr-2 file:rounded file:border-0 file:bg-zinc-800 file:px-2 file:py-1 file:text-zinc-200"
                onChange={(e) => onPickPhotos(e.target.files)}
              />
            </label>

            {photoPreviews.length > 0 ? (
              <div className="mt-2 grid grid-cols-3 gap-1">
                {photoPreviews.map((src) => (
                  <div
                    key={src}
                    className="relative aspect-square overflow-hidden rounded bg-zinc-800"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  </div>
                ))}
              </div>
            ) : null}

            {formError ? (
              <p className="mt-2 text-sm text-red-400">{formError}</p>
            ) : null}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={saving}
                className="flex-1 rounded-lg bg-[#f57c20] py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
                onClick={() => void saveIssue()}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="rounded-lg border border-zinc-600 px-3 py-2 text-sm text-zinc-300"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
