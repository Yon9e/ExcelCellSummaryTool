export function getFileDisplayName(path: string, fallback = "汇总结果.xlsx"): string {
  const normalized = path.trim().replace(/[\\/]+$/, "");
  if (!normalized) {
    return fallback;
  }
  return normalized.split(/[\\/]/).pop() || fallback;
}
