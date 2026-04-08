import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import type { IssueWithRelations } from "@/components/issues/IssueDetailPanel";

const A4_W_PX = 794;
const A4_H_PX = 1123;
const PRIMARY = "#f57c20";

function priorityBadgeStyle(priority: string): { bg: string; color: string } {
  switch (priority) {
    case "Low":
      return { bg: "#fdd835", color: "#212121" };
    case "Moderate":
      return { bg: "#f57c20", color: "#ffffff" };
    case "High":
      return { bg: "#e53935", color: "#ffffff" };
    case "Unload":
      return { bg: "#7f1d1d", color: "#ffffff" };
    default:
      return { bg: "#78909c", color: "#ffffff" };
  }
}

function waitImages(root: HTMLElement): Promise<void> {
  const imgs = root.querySelectorAll("img");
  return Promise.all(
    [...imgs].map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) resolve();
          else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        }),
    ),
  ).then(() => undefined);
}

async function capturePageToDataUrl(node: HTMLElement): Promise<string> {
  await waitImages(node);
  await new Promise((r) =>
    requestAnimationFrame(() => requestAnimationFrame(r)),
  );
  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    width: A4_W_PX,
    windowWidth: A4_W_PX,
  });
  return canvas.toDataURL("image/jpeg", 0.92);
}

function buildCoverPage(options: {
  floorPlanLine: string;
  generatedAt: string;
  totalIssues: number;
}): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.cssText = [
    `width:${A4_W_PX}px`,
    `min-height:${A4_H_PX}px`,
    "box-sizing:border-box",
    "padding:56px 48px",
    "background:#ffffff",
    "font-family:Arial, Helvetica, sans-serif",
    "color:#1a1a1a",
    "display:flex",
    "flex-direction:column",
    "align-items:center",
    "justify-content:center",
    "text-align:center",
  ].join(";");

  const title = document.createElement("h1");
  title.style.cssText =
    "margin:0 0 16px 0;font-size:28px;font-weight:700;line-height:1.2;color:#1a1a1a";
  title.textContent = "Rack Damage Assessment Report";

  const sub = document.createElement("p");
  sub.style.cssText = "margin:0 0 8px 0;font-size:16px;color:#424242";
  sub.textContent = options.floorPlanLine;

  const dateEl = document.createElement("p");
  dateEl.style.cssText = "margin:0 0 40px 0;font-size:14px;color:#616161";
  dateEl.textContent = `Generated: ${options.generatedAt}`;

  const countBox = document.createElement("div");
  countBox.style.cssText =
    "margin-top:24px;padding:20px 36px;border:2px solid #e0e0e0;border-radius:8px;background:#fafafa";

  const countLabel = document.createElement("div");
  countLabel.style.cssText =
    "font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#757575;margin-bottom:8px";
  countLabel.textContent = "Total issues in this report";

  const countNum = document.createElement("div");
  countNum.style.cssText = `font-size:36px;font-weight:700;color:${PRIMARY}`;
  countNum.textContent = String(options.totalIssues);

  countBox.append(countLabel, countNum);
  wrap.append(title, sub, dateEl, countBox);
  return wrap;
}

function buildIssuePage(
  issue: IssueWithRelations,
  options: { floorPlanName: string; pageLabel: string },
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.cssText = [
    `width:${A4_W_PX}px`,
    `min-height:${A4_H_PX}px`,
    "box-sizing:border-box",
    "background:#ffffff",
    "font-family:Arial, Helvetica, sans-serif",
    "color:#212121",
    "display:flex",
    "flex-direction:column",
  ].join(";");

  const header = document.createElement("div");
  header.style.cssText = [
    `background:${PRIMARY}`,
    "color:#ffffff",
    "padding:14px 24px",
    "font-size:13px",
    "font-weight:700",
    "letter-spacing:0.02em",
    "text-transform:uppercase",
  ].join(";");
  header.textContent = "APPENDIX D1. Issues Report";

  const subhead = document.createElement("div");
  subhead.style.cssText = [
    "padding:10px 24px",
    "font-size:13px",
    "color:#424242",
    "background:#f5f5f5",
    "border-bottom:1px solid #e0e0e0",
  ].join(";");
  subhead.textContent = options.floorPlanName;

  const body = document.createElement("div");
  body.style.cssText =
    "flex:1;padding:28px 24px 24px;box-sizing:border-box";

  const field = (label: string, value: string) => {
    const r = document.createElement("div");
    r.style.marginBottom = "14px";
    const l = document.createElement("div");
    l.style.cssText =
      "font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:#757575;margin-bottom:4px";
    l.textContent = label;
    const v = document.createElement("div");
    v.style.cssText =
      "font-size:14px;color:#212121;line-height:1.45;white-space:pre-wrap";
    v.textContent = value;
    r.append(l, v);
    return r;
  };

  const locRow = document.createElement("div");
  locRow.style.marginBottom = "14px";
  const locLab = document.createElement("div");
  locLab.style.cssText =
    "font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:#757575;margin-bottom:4px";
  locLab.textContent = "Location:";
  const locVal = document.createElement("div");
  locVal.style.cssText =
    "font-size:14px;color:#212121;font-weight:600";
  locVal.textContent = issue.spotter?.location_id ?? "—";
  locRow.append(locLab, locVal);

  body.append(
    locRow,
    field("Location Name", issue.spotter?.location_name ?? "—"),
    field(
      "Component | Issue Type",
      `${issue.component}  |  ${issue.issue_type}`,
    ),
    field("Level | Depth", `${issue.level}  |  ${issue.depth}`),
  );

  const pri = priorityBadgeStyle(issue.priority);
  const priWrap = document.createElement("div");
  priWrap.style.marginBottom = "14px";
  const priLab = document.createElement("div");
  priLab.style.cssText =
    "font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:#757575;margin-bottom:6px";
  priLab.textContent = "Priority";
  const badge = document.createElement("span");
  badge.style.cssText = [
    "display:inline-block",
    "padding:4px 12px",
    "border-radius:4px",
    "font-size:12px",
    "font-weight:700",
    `background:${pri.bg}`,
    `color:${pri.color}`,
  ].join(";");
  badge.textContent = issue.priority;
  priWrap.append(priLab, badge);

  body.append(
    priWrap,
    field("Action to Take", issue.action_to_take || "—"),
    field("Current Status", issue.status || "—"),
    field("Details", issue.details?.trim() ? issue.details : "—"),
  );

  const photos = issue.photos.slice(0, 3);
  if (photos.length > 0) {
    const phLab = document.createElement("div");
    phLab.style.cssText =
      "font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:#757575;margin-top:20px;margin-bottom:10px";
    phLab.textContent = "Photos";
    const rowImgs = document.createElement("div");
    rowImgs.style.cssText =
      "display:flex;flex-direction:row;gap:12px;flex-wrap:wrap;align-items:flex-start";
    for (const p of photos) {
      const cell = document.createElement("div");
      cell.style.cssText =
        "flex:1;min-width:200px;max-width:240px;text-align:center";
      const img = document.createElement("img");
      img.src = p.photo_url;
      img.alt = "";
      img.style.cssText =
        "max-height:200px;width:auto;max-width:100%;height:auto;object-fit:contain;border:1px solid #e0e0e0;border-radius:4px;display:block;margin:0 auto";
      cell.append(img);
      rowImgs.append(cell);
    }
    body.append(phLab, rowImgs);
  }

  const footer = document.createElement("div");
  footer.style.cssText = [
    "margin-top:auto",
    "padding:16px 24px",
    "border-top:1px solid #eeeeee",
    "display:flex",
    "flex-direction:row",
    "justify-content:space-between",
    "align-items:center",
    "font-size:9px",
    "color:#9e9e9e",
  ].join(";");

  const idEl = document.createElement("div");
  idEl.style.cssText = "max-width:65%;word-break:break-all";
  idEl.textContent = `Issue ID: ${issue.id}`;

  const pg = document.createElement("div");
  pg.style.cssText = "font-weight:600;color:#616161";
  pg.textContent = options.pageLabel;

  footer.append(idEl, pg);
  wrap.append(header, subhead, body, footer);
  return wrap;
}

function floorPlanSubtitle(issues: IssueWithRelations[]): string {
  const names = [
    ...new Set(
      issues
        .map((i) => i.spotter?.floor_plan_name?.trim())
        .filter((n): n is string => Boolean(n)),
    ),
  ];
  if (names.length === 1) return names[0];
  if (names.length > 1) return names.sort().join(" · ");
  return "Floor plan —";
}

function perIssueFloorPlanName(
  issue: IssueWithRelations,
  fallback: string,
): string {
  return issue.spotter?.floor_plan_name?.trim() || fallback;
}

function addRasterPage(pdf: jsPDF, dataUrl: string): Promise<void> {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const img = new window.Image();
  img.src = dataUrl;
  return new Promise((resolve, reject) => {
    img.onload = () => {
      const iw = img.width;
      const ih = img.height;
      const ratio = iw / ih;
      let w = pageW;
      let h = pageW / ratio;
      if (h > pageH) {
        h = pageH;
        w = pageH * ratio;
      }
      const x = (pageW - w) / 2;
      const y = (pageH - h) / 2;
      pdf.addImage(dataUrl, "JPEG", x, y, w, h);
      resolve();
    };
    img.onerror = () => reject(new Error("Failed to load page image"));
  });
}

/**
 * Cover + one A4 page per issue (created_at ascending), rasterized via html2canvas.
 */
export async function exportIssuesPdf(
  issues: IssueWithRelations[],
): Promise<void> {
  if (issues.length === 0) return;

  const sorted = [...issues].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const floorLine = floorPlanSubtitle(sorted);
  const generatedAt = new Date().toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const defaultFloor = floorLine;

  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-12000px;top:0;opacity:0.02;pointer-events:none;z-index:-1";
  document.body.appendChild(host);

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  try {
    const cover = buildCoverPage({
      floorPlanLine: floorLine,
      generatedAt,
      totalIssues: sorted.length,
    });
    host.appendChild(cover);
    const coverUrl = await capturePageToDataUrl(cover);
    host.removeChild(cover);
    await addRasterPage(pdf, coverUrl);

    let dNum = 1;
    for (const issue of sorted) {
      pdf.addPage();
      const fpName = perIssueFloorPlanName(issue, defaultFloor);
      const page = buildIssuePage(issue, {
        floorPlanName: fpName,
        pageLabel: `D-${dNum}`,
      });
      host.appendChild(page);
      const url = await capturePageToDataUrl(page);
      host.removeChild(page);
      await addRasterPage(pdf, url);
      dNum += 1;
    }

    const safeDate = new Date().toISOString().slice(0, 10);
    pdf.save(`rack-damage-assessment-${safeDate}.pdf`);
  } finally {
    document.body.removeChild(host);
  }
}
