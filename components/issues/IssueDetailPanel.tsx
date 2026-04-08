"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSupabase } from "@/components/supabase-provider";
import {
  ACTIONS,
  ISSUE_TYPES,
  PRIORITIES,
  STATUSES,
} from "@/components/map/issue-options";
import type { Component, Issue, IssuePhoto } from "@/types";
import {
  ISSUE_PHOTOS_BUCKET,
  priorityBadgeClass,
  statusBadgeClass,
  storagePathFromPublicUrl,
} from "@/components/issues/issue-utils";

export type IssueWithRelations = Issue & {
  spotter: {
    id: string;
    location_id: string;
    location_name: string;
    floor_plan_id: string;
    floor_plan_name: string;
  } | null;
  photos: IssuePhoto[];
};

type Props = {
  issue: IssueWithRelations;
  components: Component[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
};

export function IssueDetailPanel({
  issue,
  components,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const supabase = useSupabase();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [componentName, setComponentName] = useState(issue.component);
  const [level, setLevel] = useState(issue.level);
  const [depth, setDepth] = useState(issue.depth);
  const [issueType, setIssueType] = useState(issue.issue_type);
  const [priority, setPriority] = useState(issue.priority);
  const [actionToTake, setActionToTake] = useState(issue.action_to_take);
  const [status, setStatus] = useState(issue.status);
  const [details, setDetails] = useState(issue.details);
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([]);
  const [newPhotoUrls, setNewPhotoUrls] = useState<string[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Sync when opening a different issue. After save, parent remounts via key so props stay fresh.
  useEffect(() => {
    setMode("view");
    setComponentName(issue.component);
    setLevel(issue.level);
    setDepth(issue.depth);
    setIssueType(issue.issue_type);
    setPriority(issue.priority);
    setActionToTake(issue.action_to_take);
    setStatus(issue.status);
    setDetails(issue.details);
    setDeletedPhotoIds(new Set());
    setNewPhotoFiles([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset when switching issue row
  }, [issue.id]);

  useEffect(() => {
    const urls = newPhotoFiles.map((f) => URL.createObjectURL(f));
    setNewPhotoUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [newPhotoFiles]);

  const remainingPhotos = useMemo(
    () => issue.photos.filter((p) => !deletedPhotoIds.has(p.id)),
    [issue.photos, deletedPhotoIds],
  );

  const totalPhotoCount = remainingPhotos.length + newPhotoFiles.length;

  const resetEditFromIssue = useCallback(() => {
    setComponentName(issue.component);
    setLevel(issue.level);
    setDepth(issue.depth);
    setIssueType(issue.issue_type);
    setPriority(issue.priority);
    setActionToTake(issue.action_to_take);
    setStatus(issue.status);
    setDetails(issue.details);
    setDeletedPhotoIds(new Set());
    setNewPhotoFiles([]);
    setMode("view");
  }, [issue]);

  const onPickMorePhotos = (files: FileList | null) => {
    if (!files?.length) return;
    const incoming = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setNewPhotoFiles((prev) => {
      const slots = 3 - remainingPhotos.length - prev.length;
      if (slots <= 0) return prev;
      return [...prev, ...incoming.slice(0, slots)];
    });
  };

  const removeNewPhotoAt = (idx: number) => {
    setNewPhotoFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const markPhotoDeleted = (photoId: string) => {
    setDeletedPhotoIds((prev) => new Set(prev).add(photoId));
  };

  const unmarkPhotoDeleted = (photoId: string) => {
    setDeletedPhotoIds((prev) => {
      const next = new Set(prev);
      next.delete(photoId);
      return next;
    });
  };

  const saveEdit = async () => {
    if (totalPhotoCount > 3) return;
    setSaving(true);
    try {
      const repairedAt = status === "Repaired" ? new Date().toISOString() : null;

      const { error: upErr } = await supabase
        .from("issues")
        .update({
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
        .eq("id", issue.id);
      if (upErr) throw upErr;

      for (const pid of deletedPhotoIds) {
        const photo = issue.photos.find((p) => p.id === pid);
        if (photo) {
          const path = storagePathFromPublicUrl(photo.photo_url);
          if (path) {
            await supabase.storage.from(ISSUE_PHOTOS_BUCKET).remove([path]);
          }
        }
        await supabase.from("issue_photos").delete().eq("id", pid);
      }

      const maxOrder =
        remainingPhotos.length > 0
          ? Math.max(...remainingPhotos.map((p) => p.display_order))
          : -1;

      for (let i = 0; i < newPhotoFiles.length; i++) {
        const file = newPhotoFiles[i];
        const ext = file.name.split(".").pop() || "jpg";
        const order = maxOrder + 1 + i;
        const path = `issues/${issue.id}/${order}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
        const { error: stErr } = await supabase.storage
          .from(ISSUE_PHOTOS_BUCKET)
          .upload(path, file, { upsert: true });
        if (stErr) throw stErr;
        const {
          data: { publicUrl },
        } = supabase.storage.from(ISSUE_PHOTOS_BUCKET).getPublicUrl(path);
        const { error: insErr } = await supabase.from("issue_photos").insert({
          issue_id: issue.id,
          photo_url: publicUrl,
          display_order: order,
        });
        if (insErr) throw insErr;
      }

      setMode("view");
      setDeletedPhotoIds(new Set());
      setNewPhotoFiles([]);
      onSaved();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteIssue = async () => {
    if (!window.confirm("Delete this issue? This cannot be undone.")) return;
    setDeleting(true);
    try {
      for (const ph of issue.photos) {
        const path = storagePathFromPublicUrl(ph.photo_url);
        if (path)
          await supabase.storage.from(ISSUE_PHOTOS_BUCKET).remove([path]);
      }
      await supabase.from("issue_photos").delete().eq("issue_id", issue.id);
      const { error } = await supabase.from("issues").delete().eq("id", issue.id);
      if (error) throw error;
      onDeleted();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  const locId = issue.spotter?.location_id ?? "—";
  const locName = issue.spotter?.location_name ?? "—";

  const inputCls =
    "mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-white outline-none focus:border-[#f57c20]";
  const labelCls = "text-xs font-medium text-zinc-400";

  return (
    <>
      <aside className="fixed inset-y-0 right-0 z-40 flex w-[380px] flex-col border-l border-zinc-800 bg-[#141517] shadow-2xl">
        <div className="flex items-start justify-between gap-2 border-b border-zinc-800 p-4">
          <div>
            <div className="font-mono text-sm text-[#f57c20]">{locId}</div>
            <div className="text-lg font-semibold text-white">{locName}</div>
          </div>
          <button
            type="button"
            aria-label="Close"
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {mode === "view" ? (
            <>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${priorityBadgeClass(issue.priority)}`}
                >
                  {issue.priority}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClass(issue.status)}`}
                >
                  {issue.status}
                </span>
              </div>

              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className={labelCls}>Component</dt>
                  <dd className="text-zinc-200">{issue.component}</dd>
                </div>
                <div>
                  <dt className={labelCls}>Level / Depth</dt>
                  <dd className="text-zinc-200">
                    {issue.level} / {issue.depth}
                  </dd>
                </div>
                <div>
                  <dt className={labelCls}>Issue type</dt>
                  <dd className="text-zinc-200">{issue.issue_type}</dd>
                </div>
                <div>
                  <dt className={labelCls}>Action to take</dt>
                  <dd className="text-zinc-200">{issue.action_to_take}</dd>
                </div>
                <div>
                  <dt className={labelCls}>Details</dt>
                  <dd className="whitespace-pre-wrap text-zinc-300">
                    {issue.details || "—"}
                  </dd>
                </div>
              </dl>

              {issue.photos.length > 0 ? (
                <div className="mt-4">
                  <div className={labelCls}>Photos</div>
                  <div className="mt-2 flex flex-row flex-wrap gap-2">
                    {issue.photos
                      .slice()
                      .sort((a, b) => a.display_order - b.display_order)
                      .map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="h-24 w-24 shrink-0 overflow-hidden rounded border border-zinc-700 bg-zinc-900"
                          onClick={() => setLightboxUrl(p.photo_url)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.photo_url}
                            alt=""
                            className="h-full w-full object-contain"
                          />
                        </button>
                      ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  className="flex-1 rounded-lg bg-[#f57c20] py-2 text-sm font-semibold text-zinc-900"
                  onClick={() => setMode("edit")}
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  className="flex-1 rounded-lg border border-red-800 py-2 text-sm font-semibold text-red-400 hover:bg-red-950/40 disabled:opacity-50"
                  onClick={() => void handleDeleteIssue()}
                >
                  {deleting ? "…" : "Delete"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${priorityBadgeClass(priority)}`}
                >
                  {priority}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClass(status)}`}
                >
                  {status}
                </span>
              </div>

              <label className="mt-4 block">
                <span className={labelCls}>Component</span>
                <select
                  className={inputCls}
                  value={componentName}
                  onChange={(e) => setComponentName(e.target.value)}
                >
                  {components.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
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
                  className={`${inputCls} min-h-[80px] resize-y`}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                />
              </label>

              <div className="mt-3">
                <span className={labelCls}>
                  Photos (max 3 total) — {totalPhotoCount} / 3
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {issue.photos
                    .slice()
                    .sort((a, b) => a.display_order - b.display_order)
                    .map((p) => {
                      const isDel = deletedPhotoIds.has(p.id);
                      return (
                        <div
                          key={p.id}
                          className={`relative h-20 w-20 overflow-hidden rounded border ${
                            isDel
                              ? "border-red-600 opacity-40"
                              : "border-zinc-700"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.photo_url}
                            alt=""
                            className="h-full w-full object-contain"
                          />
                          <button
                            type="button"
                            className="absolute right-0 top-0 rounded-bl bg-red-900 px-1.5 py-0.5 text-xs font-bold text-white"
                            onClick={() =>
                              isDel
                                ? unmarkPhotoDeleted(p.id)
                                : markPhotoDeleted(p.id)
                            }
                          >
                            {isDel ? "↩" : "×"}
                          </button>
                        </div>
                      );
                    })}
                  {newPhotoUrls.map((src, idx) => (
                    <div
                      key={src}
                      className="relative h-20 w-20 overflow-hidden rounded border border-[#f57c20]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                      <button
                        type="button"
                        className="absolute right-0 top-0 rounded-bl bg-red-900 px-1.5 py-0.5 text-xs text-white"
                        onClick={() => removeNewPhotoAt(idx)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                {totalPhotoCount < 3 ? (
                  <label className="mt-2 inline-block cursor-pointer rounded-lg border border-zinc-600 px-3 py-1.5 text-sm text-[#f57c20] hover:bg-zinc-800">
                    Add photos
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(e) => {
                        onPickMorePhotos(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                ) : null}
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  disabled={saving || totalPhotoCount > 3}
                  className="flex-1 rounded-lg bg-[#f57c20] py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
                  onClick={() => void saveEdit()}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300"
                  onClick={resetEditFromIssue}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      {lightboxUrl ? (
        <button
          type="button"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightboxUrl(null)}
          aria-label="Close enlarged image"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt=""
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </button>
      ) : null}
    </>
  );
}
