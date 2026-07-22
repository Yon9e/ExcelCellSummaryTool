/**
 * Windows 文件系统不区分路径大小写；选择器中的路径比较统一走这个键，
 * 以免用户从地址栏输入不同大小写或末尾分隔符时重复选中同一数据源。
 */
export function sourcePathKey(path: string): string {
  const withWindowsSeparators = path.trim().replace(/\//gu, "\\");
  if (!withWindowsSeparators) return "";

  const withoutTrailingSeparators = withWindowsSeparators.replace(/\\+$/u, "");
  const normalizedPath = /^[a-z]:$/iu.test(withoutTrailingSeparators)
    ? `${withoutTrailingSeparators}\\`
    : withoutTrailingSeparators || "\\";
  return normalizedPath.toLocaleLowerCase("en-US");
}

export function sourcePathsEqual(left: string, right: string): boolean {
  const leftKey = sourcePathKey(left);
  return Boolean(leftKey) && leftKey === sourcePathKey(right);
}

export function mergeUniqueSourcePaths(currentPaths: string[], addedPaths: string[]): string[] {
  const mergedPaths: string[] = [];
  const knownPathKeys = new Set<string>();
  for (const path of [...currentPaths, ...addedPaths]) {
    const normalizedPath = path.trim();
    const pathKey = sourcePathKey(normalizedPath);
    if (!pathKey || knownPathKeys.has(pathKey)) continue;
    knownPathKeys.add(pathKey);
    mergedPaths.push(normalizedPath);
  }
  return mergedPaths;
}

export function selectAllVisibleSourcePaths(currentPaths: string[], visiblePaths: string[]): string[] {
  return mergeUniqueSourcePaths(currentPaths, visiblePaths);
}

export function invertVisibleSourcePaths(currentPaths: string[], visiblePaths: string[]): string[] {
  const visiblePathSet = new Set(visiblePaths.map(sourcePathKey).filter(Boolean));
  const currentPathSet = new Set(currentPaths.map(sourcePathKey).filter(Boolean));
  const retainedPaths = currentPaths.filter((path) => !visiblePathSet.has(sourcePathKey(path)));
  const newlySelectedPaths = visiblePaths.filter((path) => {
    const normalizedPath = path.trim();
    const pathKey = sourcePathKey(normalizedPath);
    return pathKey && !currentPathSet.has(pathKey);
  });
  return mergeUniqueSourcePaths(retainedPaths, newlySelectedPaths);
}

export function applyVisibleSourcePathRangeSelection(
  initialPaths: string[],
  visiblePaths: string[],
  startPath: string,
  endPath: string,
  shouldSelect: boolean,
): string[] {
  const startPathKey = sourcePathKey(startPath);
  const endPathKey = sourcePathKey(endPath);
  const startIndex = visiblePaths.findIndex((path) => sourcePathKey(path) === startPathKey);
  const endIndex = visiblePaths.findIndex((path) => sourcePathKey(path) === endPathKey);
  if (!startPathKey || !endPathKey || startIndex < 0 || endIndex < 0) return initialPaths;

  const [rangeStart, rangeEnd] = startIndex <= endIndex
    ? [startIndex, endIndex]
    : [endIndex, startIndex];
  const rangePaths = visiblePaths.slice(rangeStart, rangeEnd + 1);
  if (shouldSelect) return mergeUniqueSourcePaths(initialPaths, rangePaths);

  const rangePathKeys = new Set(rangePaths.map(sourcePathKey).filter(Boolean));
  return initialPaths.filter((path) => !rangePathKeys.has(sourcePathKey(path)));
}
