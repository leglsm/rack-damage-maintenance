"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Line, Pie } from "react-chartjs-2";
import { useSupabase } from "@/components/supabase-provider";
import { registerChartJs } from "@/components/dashboard/register-charts";
import { last12Months, monthKeyFromIso } from "@/lib/dashboard-time";
import { formatNumberEnUS } from "@/lib/format-locale";

registerChartJs();

const PRIORITY_ORDER = ["Low", "Moderate", "High", "Unload"] as const;
const PRIORITY_COLORS: Record<(typeof PRIORITY_ORDER)[number], string> = {
  Low: "#fdd835",
  Moderate: "#f57c20",
  High: "#e53935",
  Unload: "#7b0000",
};

const STATUS_ORDER = ["Reported", "In Progress", "Repaired"] as const;
const STATUS_COLORS: Record<(typeof STATUS_ORDER)[number], string> = {
  Reported: "#607d8b",
  "In Progress": "#1e88e5",
  Repaired: "#43a047",
};

const COMPONENT_PALETTE = [
  "#f57c20",
  "#42a5f5",
  "#ab47bc",
  "#26a69a",
  "#ff7043",
  "#78909c",
  "#ec407a",
  "#7e57c2",
  "#ffca28",
  "#66bb6a",
  "#5c6bc0",
  "#ef5350",
  "#29b6f6",
  "#8d6e63",
  "#d4e157",
  "#ffee58",
];

type IssueRow = {
  id: string;
  component: string;
  priority: string;
  status: string;
  created_at: string;
  repaired_at: string | null;
  spotters: {
    id: string;
    location_id: string;
    location_name: string;
  } | null;
};

function normalizeIssues(raw: unknown): IssueRow[] {
  const rows = (raw ?? []) as Array<
    IssueRow & {
      spotters?: IssueRow["spotters"] | IssueRow["spotters"][];
    }
  >;
  return rows.map((r) => {
    let s = r.spotters;
    if (Array.isArray(s)) s = s[0] ?? null;
    return { ...r, spotters: s ?? null };
  });
}

function filterPie(
  labels: string[],
  values: number[],
  colors: string[],
): { labels: string[]; data: number[]; backgroundColor: string[] } {
  const pairs = labels
    .map((l, i) => ({ l, v: values[i], c: colors[i] }))
    .filter((p) => p.v > 0);
  if (pairs.length === 0) {
    return {
      labels: ["No data"],
      data: [1],
      backgroundColor: ["#3f3f46"],
    };
  }
  return {
    labels: pairs.map((p) => p.l),
    data: pairs.map((p) => p.v),
    backgroundColor: pairs.map((p) => p.c),
  };
}

const chartPlugins = {
  legend: {
    position: "bottom" as const,
    labels: {
      color: "#c4c4c4",
      boxWidth: 12,
      padding: 12,
      font: { size: 11 },
    },
  },
  tooltip: {
    backgroundColor: "#2a2d33",
    titleColor: "#fff",
    bodyColor: "#e4e4e7",
    borderColor: "#3f3f46",
    borderWidth: 1,
  },
};

const pieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: chartPlugins,
};

export function DashboardView() {
  const supabase = useSupabase();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spotterCount, setSpotterCount] = useState(0);
  const [issues, setIssues] = useState<IssueRow[]>([]);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [{ count: sc, error: e0 }, { data: rows, error: e1 }] =
        await Promise.all([
          supabase
            .from("spotters")
            .select("*", { count: "exact", head: true }),
          supabase.from("issues").select(`
            id,
            component,
            priority,
            status,
            created_at,
            repaired_at,
            spotters (
              id,
              location_id,
              location_name
            )
          `),
        ]);
      if (e0) throw e0;
      if (e1) throw e1;
      setSpotterCount(sc ?? 0);
      setIssues(normalizeIssues(rows));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalIssues = issues.length;
  const repairedCount = issues.filter((i) => i.status === "Repaired").length;
  const unloadCount = issues.filter((i) => i.priority === "Unload").length;

  const priValues = PRIORITY_ORDER.map(
    (p) => issues.filter((i) => i.priority === p).length,
  );
  const priColors = [...PRIORITY_ORDER.map((p) => PRIORITY_COLORS[p])];
  const priorityPie = filterPie(
    [...PRIORITY_ORDER],
    priValues,
    priColors,
  );

  const stValues = STATUS_ORDER.map(
    (s) => issues.filter((i) => i.status === s).length,
  );
  const stColors = [...STATUS_ORDER.map((s) => STATUS_COLORS[s])];
  const statusPie = filterPie([...STATUS_ORDER], stValues, stColors);

  const compMap = new Map<string, number>();
  for (const row of issues) {
    const c = row.component?.trim() || "Unknown";
    compMap.set(c, (compMap.get(c) ?? 0) + 1);
  }
  const compEntries = [...compMap.entries()].sort((a, b) => b[1] - a[1]);
  const compLabels = compEntries.map(([k]) => k);
  const compValues = compEntries.map(([, v]) => v);
  const compColors = compLabels.map(
    (_, i) => COMPONENT_PALETTE[i % COMPONENT_PALETTE.length],
  );
  const componentPie = filterPie(compLabels, compValues, compColors);

  const months = last12Months();
  const createdMap = Object.fromEntries(months.map((x) => [x.key, 0]));
  const repairedMap = Object.fromEntries(months.map((x) => [x.key, 0]));
  for (const row of issues) {
    const ck = monthKeyFromIso(row.created_at);
    if (ck in createdMap) createdMap[ck] += 1;
    if (row.repaired_at) {
      const rk = monthKeyFromIso(row.repaired_at);
      if (rk in repairedMap) repairedMap[rk] += 1;
    }
  }
  const lineLabels = months.map((m) => m.label);
  const lineCreated = months.map((m) => createdMap[m.key]);
  const lineRepaired = months.map((m) => repairedMap[m.key]);

  const lineData = {
    labels: lineLabels,
    datasets: [
      {
        label: "Created",
        data: lineCreated,
        borderColor: "#e53935",
        backgroundColor: "rgba(229, 57, 53, 0.12)",
        fill: true,
        tension: 0.25,
        pointRadius: 3,
        pointBackgroundColor: "#e53935",
      },
      {
        label: "Repaired",
        data: lineRepaired,
        borderColor: "#43a047",
        backgroundColor: "rgba(67, 160, 71, 0.12)",
        fill: true,
        tension: 0.25,
        pointRadius: 3,
        pointBackgroundColor: "#43a047",
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: {
        position: "top" as const,
        labels: { color: "#d4d4d8", font: { size: 12 } },
      },
      tooltip: chartPlugins.tooltip,
      title: {
        display: true,
        text: "Issues Created vs Repaired — Last 12 Months",
        color: "#fafafa",
        font: { size: 15, weight: "bold" as const },
        padding: { bottom: 16 },
      },
    },
    scales: {
      x: {
        grid: { color: "#333741" },
        ticks: { color: "#a1a1aa", maxRotation: 45, minRotation: 0 },
        border: { color: "#333741" },
      },
      y: {
        beginAtZero: true,
        grid: { color: "#333741" },
        ticks: {
          color: "#a1a1aa",
          precision: 0,
        },
        border: { color: "#333741" },
      },
    },
  };

  const statCard = (label: string, value: number) => (
    <div
      key={label}
      className="rounded-xl border border-zinc-700/80 bg-[#22252a] px-5 py-4 shadow-sm"
    >
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-3xl font-semibold tabular-nums text-[#f57c20]">
        {loading ? "—" : formatNumberEnUS(value)}
      </div>
    </div>
  );

  const pieWrap = (title: string, chart: ReactNode) => (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-zinc-700/80 bg-[#22252a] p-4 shadow-sm">
      <h2 className="mb-3 text-center text-sm font-semibold text-zinc-200">
        {title}
      </h2>
      <div className="relative h-64 w-full min-h-[16rem]">{chart}</div>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 p-4 sm:p-6">
      <header>
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-zinc-500">
          Overview of spotters and issues (joined with spotters).
        </p>
      </header>

      {error ? (
        <p className="text-red-400">{error}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCard("Total Spotters", spotterCount)}
            {statCard("Total Issues", totalIssues)}
            {statCard("Repaired", repairedCount)}
            {statCard("Unload / Unsafe", unloadCount)}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {pieWrap(
              "By Priority",
              <Pie
                data={{
                  labels: priorityPie.labels,
                  datasets: [
                    {
                      data: priorityPie.data,
                      backgroundColor: priorityPie.backgroundColor,
                      borderColor: "#1a1c1e",
                      borderWidth: 2,
                    },
                  ],
                }}
                options={pieOptions}
              />,
            )}
            {pieWrap(
              "By Component",
              <Pie
                data={{
                  labels: componentPie.labels,
                  datasets: [
                    {
                      data: componentPie.data,
                      backgroundColor: componentPie.backgroundColor,
                      borderColor: "#1a1c1e",
                      borderWidth: 2,
                    },
                  ],
                }}
                options={pieOptions}
              />,
            )}
            {pieWrap(
              "By Status",
              <Pie
                data={{
                  labels: statusPie.labels,
                  datasets: [
                    {
                      data: statusPie.data,
                      backgroundColor: statusPie.backgroundColor,
                      borderColor: "#1a1c1e",
                      borderWidth: 2,
                    },
                  ],
                }}
                options={pieOptions}
              />,
            )}
          </div>

          <div className="min-h-[380px] flex-1 rounded-xl border border-zinc-700/80 bg-[#22252a] p-4 pb-6 shadow-sm">
            <div className="relative h-[320px] w-full md:h-[360px]">
              <Line data={lineData} options={lineOptions} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
