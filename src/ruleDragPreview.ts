export function getRuleDragShift(
  index: number,
  draggedIndex: number | null,
  dragOverIndex: number | null,
): "rule-shift-up" | "rule-shift-down" | "" {
  if (draggedIndex === null || dragOverIndex === null || draggedIndex === dragOverIndex) return "";
  if (draggedIndex < dragOverIndex && index > draggedIndex && index <= dragOverIndex) return "rule-shift-up";
  if (draggedIndex > dragOverIndex && index >= dragOverIndex && index < draggedIndex) return "rule-shift-down";
  return "";
}

export function findRuleDragTarget(rowCenters: number[], pointerY: number): number | null {
  if (!rowCenters.length) return null;
  let targetIndex = 0;
  let nearestDistance = Math.abs(pointerY - rowCenters[0]);
  for (let index = 1; index < rowCenters.length; index += 1) {
    const distance = Math.abs(pointerY - rowCenters[index]);
    if (distance < nearestDistance) {
      targetIndex = index;
      nearestDistance = distance;
    }
  }
  return targetIndex;
}

export function getRuleDragOverlayTop(pointerY: number, grabOffsetY: number): number {
  return pointerY - grabOffsetY;
}

export function getRuleDragOverlayLeft(pointerX: number, grabOffsetX: number): number {
  return pointerX - grabOffsetX;
}

export function getRuleDragOriginStyle(isDragging: boolean): { opacity: number } | undefined {
  return isDragging ? { opacity: 0 } : undefined;
}

interface RuleDragOverEvent {
  preventDefault: () => void;
  dataTransfer: { dropEffect: string } | null;
}

export function acceptRuleDragOver(event: RuleDragOverEvent): void {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
}
