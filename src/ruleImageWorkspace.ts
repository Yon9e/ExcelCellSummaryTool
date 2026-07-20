import type { ImagePayload } from "./types";

export interface ScreenshotWorkspaceItem<TAnalysis> {
  id: string;
  name: string;
  payload: ImagePayload;
  analysis: TAnalysis | null;
  outputSelection: Set<string>;
  dataSelection: Set<string>;
  demo?: boolean;
}

export interface ScreenshotWorkspaceChange<TAnalysis> {
  items: ScreenshotWorkspaceItem<TAnalysis>[];
  activeId: string | null;
}

export function appendScreenshotItems<TAnalysis>(
  current: ScreenshotWorkspaceItem<TAnalysis>[],
  payloads: ImagePayload[],
  createId: () => string,
): ScreenshotWorkspaceChange<TAnalysis> {
  const additions = payloads.map((payload) => ({
    id: createId(),
    name: imageName(payload.path),
    payload,
    analysis: null,
    outputSelection: new Set<string>(),
    dataSelection: new Set<string>(),
  }));
  return {
    items: [...current, ...additions],
    activeId: additions[additions.length - 1]?.id ?? current[current.length - 1]?.id ?? null,
  };
}

export function removeScreenshotItem<TAnalysis>(
  current: ScreenshotWorkspaceItem<TAnalysis>[],
  removedId: string,
  activeId: string | null = removedId,
): ScreenshotWorkspaceChange<TAnalysis> {
  const removedIndex = current.findIndex(({ id }) => id === removedId);
  if (removedIndex < 0) {
    return { items: current, activeId: current[0]?.id ?? null };
  }
  const items = current.filter(({ id }) => id !== removedId);
  if (activeId !== removedId && items.some(({ id }) => id === activeId)) {
    return { items, activeId };
  }
  return {
    items,
    activeId: items[Math.min(removedIndex, items.length - 1)]?.id ?? null,
  };
}

export function updateScreenshotItem<TAnalysis>(
  current: ScreenshotWorkspaceItem<TAnalysis>[],
  id: string,
  update: (item: ScreenshotWorkspaceItem<TAnalysis>) => ScreenshotWorkspaceItem<TAnalysis>,
): ScreenshotWorkspaceItem<TAnalysis>[] {
  return current.map((item) => item.id === id ? update(item) : item);
}

function imageName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() || "剪贴板截图";
}
