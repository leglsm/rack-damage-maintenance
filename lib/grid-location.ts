/** Normalized coords: x,y in [0,1] relative to image (left/top). */
export function locationIdFromGridCell(
  normX: number,
  normY: number,
  gridX: number,
  gridY: number,
): string {
  const gridCol = Math.min(
    gridX - 1,
    Math.max(0, Math.floor(normX * gridX)),
  );
  const gridRow = Math.min(
    gridY - 1,
    Math.max(0, Math.floor(normY * gridY)),
  );
  const xc = String(gridCol).padStart(3, "0");
  const yr = String(gridRow).padStart(3, "0");
  return `X${xc}Y${yr}`;
}
