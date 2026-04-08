"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useSupabase } from "@/components/supabase-provider";
import type { Component, Issue, IssuePhoto } from "@/types";
import {
  IssueDetailPanel,
  type IssueWithRelations,
} from "@/components/issues/IssueDetailPanel";
import {
  priorityBadgeClass,
  statusBadgeClass,
} from "@/components/issues/issue-utils";
import { exportIssuesPdf } from "@/lib/export-issues-pdf";

async function fetchIssuesWithRelations(
  supabase: SupabaseClient,
): Promise<IssueWithRelations[]> {
  const { data: issues, error: e1 } = await supabase
    .from("issues")
    .select("*")
    .order("created_at", { ascending: false });
  if (e1) throw e1;
  const list = (issues ?? []) as Issue[];
  if (list.length === 0) return [];

  const spotterIds = [...new Set(list.map((i) => i.spotter_id))];
  const { data: spotters, error: e2 } = await supabase
    .from("spotters")
    .select("id, location_id, location_name, floor_plan_id")
    .in("id", spotterIds);
  if (e2) throw e2;
  const planIds = [
    ...new Set(
      (spotters ?? [])
        .map((s) => s.floor_plan_id as string)
        .filter(Boolean),
    ),
  ];
  const planNameById = new Map<string, string>();
  if (planIds.length > 0) {
    const { data: plans, error: ep } = await supabase
      .from("floor_plans")
      .select("id, name")
      .in("id", planIds);
    if (ep) throw ep;
    for (const p of plans ?? []) {
      planNameById.set(p.id as string, String(p.name ?? ""));
    }
  }
  const sm = new Map(
    (spotters ?? []).map((s) => {
      const fpId = s.floor_plan_id as string;
      return [
        s.id,
        {
          id: s.id,
          location_id: s.location_id,
          location_name: s.location_name,
          floor_plan_id: fpId,
          floor_plan_name: planNameById.get(fpId) ?? "—",
        },
      ];
    }),
  );

  const issueIds = list.map((i) => i.id);
  const { data: photos, error: e3 } = await supabase
    .from("issue_photos")
    .select("*")
    .in("issue_id", issueIds);
  if (e3) throw e3;
  const byIssue = new Map<string, IssuePhoto[]>();
  for (const p of photos ?? []) {
    const arr = byIssue.get(p.issue_id) ?? [];
    arr.push(p);
    byIssue.set(p.issue_id, arr);
  }
  for (const arr of byIssue.values()) {
    arr.sort((a, b) => a.display_order - b.display_order);
  }

  return list.map((issue) => ({
    ...issue,
    spotter: sm.get(issue.spotter_id) ?? null,
    photos: byIssue.get(issue.id) ?? [],
  }));
}

export function IssuesView() {
  const supabase = useSupabase();
  const [rows, setRows] = useState<IssueWithRelations[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailNonce, setDetailNonce] = useState(0);
  const [exportingPdf, setExportingPdf] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [issueData, compData] = await Promise.all([
        fetchIssuesWithRelations(supabase),
        supabase
          .from("components")
          .select("*")
          .eq("is_active", true)
          .order("name"),
      ]);
      if (compData.error) throw compData.error;
      setRows(issueData);
      setComponents((compData.data ?? []) as Component[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load issues.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (priorityFilter !== "All" && r.priority !== priorityFilter) return false;
      if (statusFilter !== "All" && r.status !== statusFilter) return false;
      if (!q) return true;
      const locId = r.spotter?.location_id ?? "";
      const locName = r.spotter?.location_name ?? "";
      return (
        r.component.toLowerCase().includes(q) ||
        locId.toLowerCase().includes(q) ||
        locName.toLowerCase().includes(q) ||
        r.issue_type.toLowerCase().includes(q)
      );
    });
  }, [rows, search, priorityFilter, statusFilter]);

  const selectedIssue = selectedId
    ? rows.find((r) => r.id === selectedId) ?? null
    : null;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-zinc-800 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-lg font-semibold text-white">Issues</h1>
          <button
            type="button"
            disabled={
              loading || !!error || filtered.length === 0 || exportingPdf
            }
            className="shrink-0 rounded-lg border border-[#f57c20] bg-zinc-900 px-4 py-2 text-sm font-semibold text-[#f57c20] shadow-sm hover:bg-[#f57c20]/10 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => {
              setExportingPdf(true);
              void exportIssuesPdf(filtered)
                .catch((e: unknown) => {
                  console.error(e);
                  window.alert(
                    e instanceof Error
                      ? e.message
                      : "PDF export failed. Check photos CORS or try again.",
                  );
                })
                .finally(() => setExportingPdf(false));
            }}
          >
            {exportingPdf ? "Exporting…" : "Export PDF"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="min-w-[180px] flex-1">
            <span className="text-xs text-zinc-500">Search</span>
            <input
              type="search"
              placeholder="Component, location, type…"
              className="mt-0.5 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#f57c20]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label>
            <span className="text-xs text-zinc-500">Priority</span>
            <select
              className="mt-0.5 block rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-[#f57c20]"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option>All</option>
              <option>Low</option>
              <option>Moderate</option>
              <option>High</option>
              <option>Unload</option>
            </select>
          </label>
          <label>
            <span className="text-xs text-zinc-500">Status</span>
            <select
              className="mt-0.5 block rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-[#f57c20]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option>All</option>
              <option>Reported</option>
              <option>In Progress</option>
              <option>Repaired</option>
            </select>
          </label>
        </div>
      </header>

      <div
        className={`min-h-0 flex-1 overflow-auto p-4 ${selectedIssue ? "pr-[380px]" : ""}`}
      >
        {loading ? (
          <p className="text-zinc-500">Loading…</p>
        ) : error ? (
          <p className="text-red-400">{error}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/80 text-xs uppercase tracking-wide text-zinc-500">
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Thumbnail</th>
                  <th className="px-3 py-2 font-medium">Priority</th>
                  <th className="px-3 py-2 font-medium">Component</th>
                  <th className="px-3 py-2 font-medium">Issue Type</th>
                  <th className="px-3 py-2 font-medium">Location ID</th>
                  <th className="px-3 py-2 font-medium">Location Name</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, index) => {
                  const thumb = r.photos[0];
                  const rowNum = filtered.length - index;
                  const isSel = r.id === selectedId;
                  return (
                    <tr
                      key={r.id}
                      role="button"
                      tabIndex={0}
                      className={`cursor-pointer border-b border-zinc-800/80 transition-colors ${
                        isSel
                          ? "bg-[#f57c20]/20 ring-1 ring-inset ring-[#f57c20]"
                          : "hover:bg-zinc-800/50"
                      }`}
                      onClick={() => setSelectedId(r.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          setSelectedId(r.id);
                      }}
                    >
                      <td className="px-3 py-2 font-mono text-zinc-400">
                        {rowNum}
                      </td>
                      <td className="px-3 py-2">
                        <div className="h-12 w-12 overflow-hidden rounded border border-zinc-700 bg-zinc-800">
                          {thumb ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={thumb.photo_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${priorityBadgeClass(r.priority)}`}
                        >
                          {r.priority}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-zinc-200">{r.component}</td>
                      <td className="px-3 py-2 text-zinc-300">
                        {r.issue_type}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-[#f57c20]">
                        {r.spotter?.location_id ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-zinc-300">
                        {r.spotter?.location_name ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClass(r.status)}`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-zinc-500">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 ? (
              <p className="p-6 text-center text-zinc-500">No matching issues.</p>
            ) : null}
          </div>
        )}
      </div>

      {selectedIssue ? (
        <IssueDetailPanel
          key={`${selectedIssue.id}-${detailNonce}`}
          issue={selectedIssue}
          components={components}
          onClose={() => setSelectedId(null)}
          onSaved={() => {
            void load().then(() => setDetailNonce((n) => n + 1));
          }}
          onDeleted={() => {
            setSelectedId(null);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}
