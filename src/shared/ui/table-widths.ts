export const TABLE_MIN_WIDTH = 64;
export const TABLE_MAX_WIDTH = 1200;
export function clampColumnWidth(width: number) {
  return Math.round(Math.min(TABLE_MAX_WIDTH, Math.max(TABLE_MIN_WIDTH, width)));
}
export function parseColumnWidths(raw: string | null): Record<string, number> {
  try {
    const value = JSON.parse(raw ?? "null");
    if (!value || Array.isArray(value) || typeof value !== "object") return {};
    return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1])).map(([key, width]) => [key, clampColumnWidth(width)]));
  } catch { return {}; }
}
