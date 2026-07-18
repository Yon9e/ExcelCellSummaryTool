import type { OcrTextItem } from "./types";

export interface PixelBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnnotationRectangles {
  red: PixelRect[];
  blue: PixelRect[];
}

export interface RuleCandidate {
  id: string;
  selected: boolean;
  outputColumn: string;
  cell: string;
  confidence: number;
  warning: string;
}

interface ItemBounds extends PixelRect {
  centerX: number;
  centerY: number;
}

type ColorPredicate = (red: number, green: number, blue: number) => boolean;

const isRed: ColorPredicate = (red, green, blue) =>
  red >= 175 && red - green >= 45 && red - blue >= 45 && green <= 190;

const isBlue: ColorPredicate = (red, green, blue) =>
  blue >= 145 && blue - red >= 60 && blue - green >= 18 && green >= 75;

export function detectAnnotationRectangles(buffer: PixelBuffer): AnnotationRectangles {
  return {
    red: detectRectanglesByColor(buffer, isRed),
    blue: detectRectanglesByColor(buffer, isBlue),
  };
}

export function locateRuleCandidates(
  items: OcrTextItem[],
  annotations: AnnotationRectangles,
  imageWidth: number,
  imageHeight: number,
): RuleCandidate[] {
  const boundedItems = items
    .filter((item) => item.box_points.length >= 4)
    .map((item) => ({ item, bounds: getItemBounds(item) }));
  const numericItems = boundedItems.filter(({ item }) => /^\s*\d{1,7}\s*$/.test(item.text));
  const columnItems = boundedItems.filter(({ item, bounds }) => {
    const text = item.text.trim().toUpperCase();
    return /^[A-Z]{1,3}$/.test(text) && bounds.centerY <= imageHeight * 0.2;
  });
  const rawCandidates: Array<{
    label: string;
    row: number | null;
    centerY: number;
    score: number;
  }> = [];

  annotations.red.forEach((redRect) => {
    const inside = boundedItems.filter(({ bounds }) => pointInside(bounds.centerX, bounds.centerY, redRect, 5));

    inside.forEach(({ item, bounds }) => {
      const parsed = parseMergedRowLabel(item.text);
      if (parsed) {
        rawCandidates.push({
          label: parsed.label,
          row: parsed.row,
          centerY: bounds.centerY,
          score: item.score,
        });
      }
    });

    const plainLabels = inside.filter(({ item }) => {
      const text = item.text.trim();
      return text.length > 0 && !/^\d{1,7}$/.test(text) && !parseMergedRowLabel(text);
    });
    plainLabels.forEach(({ item, bounds }) => {
      const nearestRow = findNearestRowNumber(bounds, numericItems, redRect);
      rawCandidates.push({
        label: item.text.trim(),
        row: nearestRow,
        centerY: bounds.centerY,
        score: item.score,
      });
    });
  });

  const unique = new Map<string, (typeof rawCandidates)[number]>();
  rawCandidates.forEach((candidate) => {
    const key = `${candidate.row ?? "?"}|${candidate.label}`;
    if (!unique.has(key)) {
      unique.set(key, candidate);
    }
  });

  return [...unique.values()]
    .sort((left, right) => left.centerY - right.centerY)
    .map((candidate, index) => {
      const warnings: string[] = [];
      const blueRect = findTargetRectangle(candidate.centerY, annotations.blue);
      if (!blueRect) {
        warnings.push("未找到同一行的蓝色数据框");
      }
      const columnItem = blueRect ? findColumnHeader(blueRect, columnItems, imageWidth) : null;
      if (!columnItem) {
        warnings.push("未识别到数据列字母");
      }
      if (candidate.row === null) {
        warnings.push("未识别到 Excel 行号");
      }
      const column = columnItem?.item.text.trim().toUpperCase() ?? "";
      const cell = column && candidate.row ? `${column}${candidate.row}` : "";
      const confidence = Math.max(
        0,
        Math.min(1, columnItem ? Math.min(candidate.score, columnItem.item.score) : candidate.score * 0.75),
      );

      return {
        id: `${candidate.row ?? "row"}-${index}-${candidate.label}`,
        selected: Boolean(cell),
        outputColumn: candidate.label,
        cell,
        confidence,
        warning: warnings.join("；"),
      };
    });
}

function detectRectanglesByColor(buffer: PixelBuffer, predicate: ColorPredicate): PixelRect[] {
  const { data, width, height } = buffer;
  const total = width * height;
  const mask = new Uint8Array(total);
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);

  for (let index = 0; index < total; index += 1) {
    const offset = index * 4;
    if (data[offset + 3] > 40 && predicate(data[offset], data[offset + 1], data[offset + 2])) {
      mask[index] = 1;
    }
  }

  const rectangles: PixelRect[] = [];
  for (let start = 0; start < total; start += 1) {
    if (!mask[start] || visited[start]) {
      continue;
    }
    let head = 0;
    let tail = 0;
    let count = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    queue[tail] = start;
    tail += 1;
    visited[start] = 1;

    while (head < tail) {
      const index = queue[head];
      head += 1;
      const x = index % width;
      const y = Math.floor(index / width);
      count += 1;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      for (let offsetY = -2; offsetY <= 2; offsetY += 1) {
        for (let offsetX = -2; offsetX <= 2; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) {
            continue;
          }
          const neighborX = x + offsetX;
          const neighborY = y + offsetY;
          if (
            neighborX >= 0
            && neighborX < width
            && neighborY >= 0
            && neighborY < height
          ) {
            enqueue(neighborY * width + neighborX);
          }
        }
      }
    }

    const rect = { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
    const outlined = findOutlinedRectangle(rect, count, mask, width, height);
    if (outlined) {
      rectangles.push(outlined);
    }

    function enqueue(index: number) {
      if (mask[index] && !visited[index]) {
        visited[index] = 1;
        queue[tail] = index;
        tail += 1;
      }
    }
  }

  return rectangles.sort((left, right) => left.y - right.y || left.x - right.x);
}

function findOutlinedRectangle(
  rect: PixelRect,
  count: number,
  mask: Uint8Array,
  imageWidth: number,
  imageHeight: number,
): PixelRect | null {
  const density = count / (rect.width * rect.height);
  if (density > 0.48) {
    return null;
  }
  if (looksLikeOutlinedRectangle(rect, count, mask, imageWidth, imageHeight)) {
    return rect;
  }

  const horizontalBands = findHorizontalLineBands(rect, mask, imageWidth);
  if (horizontalBands.length < 2 || horizontalBands.length > 32) {
    return null;
  }

  const rowPixelPrefix = createRowPixelPrefix(rect, mask, imageWidth);
  let best: PixelRect | null = null;
  for (let topIndex = 0; topIndex < horizontalBands.length - 1; topIndex += 1) {
    for (let bottomIndex = topIndex + 1; bottomIndex < horizontalBands.length; bottomIndex += 1) {
      const top = horizontalBands[topIndex];
      const bottom = horizontalBands[bottomIndex];
      const candidate: PixelRect = {
        x: rect.x,
        y: top.start,
        width: rect.width,
        height: bottom.end - top.start + 1,
      };
      const candidateCount = rowPixelPrefix[bottom.end - rect.y + 1] - rowPixelPrefix[top.start - rect.y];
      if (!looksLikeOutlinedRectangle(candidate, candidateCount, mask, imageWidth, imageHeight)) {
        continue;
      }
      if (!best || candidate.width * candidate.height > best.width * best.height) {
        best = candidate;
      }
    }
  }
  return best;
}

function findHorizontalLineBands(
  rect: PixelRect,
  mask: Uint8Array,
  imageWidth: number,
): Array<{ start: number; end: number }> {
  const bands: Array<{ start: number; end: number }> = [];
  let start: number | null = null;
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    const isDenseLine = horizontalEdgeCoverage(rect, y, 1, mask, imageWidth) >= 0.45;
    if (isDenseLine && start === null) {
      start = y;
    } else if (!isDenseLine && start !== null) {
      bands.push({ start, end: y - 1 });
      start = null;
    }
  }
  if (start !== null) {
    bands.push({ start, end: rect.y + rect.height - 1 });
  }
  return bands;
}

function createRowPixelPrefix(rect: PixelRect, mask: Uint8Array, imageWidth: number): number[] {
  const prefix = [0];
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    let rowCount = 0;
    const rowStart = y * imageWidth + rect.x;
    for (let x = 0; x < rect.width; x += 1) {
      rowCount += mask[rowStart + x];
    }
    prefix.push(prefix[prefix.length - 1] + rowCount);
  }
  return prefix;
}

function looksLikeOutlinedRectangle(
  rect: PixelRect,
  count: number,
  mask: Uint8Array,
  imageWidth: number,
  imageHeight: number,
): boolean {
  const minWidth = Math.max(48, Math.round(imageWidth * 0.024));
  const minHeight = Math.max(14, Math.round(imageHeight * 0.014));
  if (rect.width < minWidth || rect.height < minHeight) {
    return false;
  }
  const density = count / (rect.width * rect.height);
  if (density < 0.003 || density > 0.48) {
    return false;
  }
  const band = Math.max(2, Math.min(8, Math.round(Math.min(rect.width, rect.height) * 0.12)));
  const top = horizontalEdgeCoverage(rect, rect.y, band, mask, imageWidth);
  const bottom = horizontalEdgeCoverage(rect, rect.y + rect.height - band, band, mask, imageWidth);
  const left = verticalEdgeCoverage(rect, rect.x, band, mask, imageWidth);
  const right = verticalEdgeCoverage(rect, rect.x + rect.width - band, band, mask, imageWidth);
  return Math.min(top, bottom, left, right) >= 0.32;
}

function horizontalEdgeCoverage(
  rect: PixelRect,
  startY: number,
  band: number,
  mask: Uint8Array,
  imageWidth: number,
): number {
  let covered = 0;
  for (let x = rect.x; x < rect.x + rect.width; x += 1) {
    let found = false;
    for (let y = startY; y < startY + band; y += 1) {
      if (mask[y * imageWidth + x]) {
        found = true;
        break;
      }
    }
    if (found) covered += 1;
  }
  return covered / rect.width;
}

function verticalEdgeCoverage(
  rect: PixelRect,
  startX: number,
  band: number,
  mask: Uint8Array,
  imageWidth: number,
): number {
  let covered = 0;
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    let found = false;
    for (let x = startX; x < startX + band; x += 1) {
      if (mask[y * imageWidth + x]) {
        found = true;
        break;
      }
    }
    if (found) covered += 1;
  }
  return covered / rect.height;
}

function getItemBounds(item: OcrTextItem): ItemBounds {
  const xs = item.box_points.map((point) => point[0]);
  const ys = item.box_points.map((point) => point[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const width = Math.max(...xs) - x;
  const height = Math.max(...ys) - y;
  return { x, y, width, height, centerX: x + width / 2, centerY: y + height / 2 };
}

function parseMergedRowLabel(text: string): { row: number; label: string } | null {
  const match = text.trim().match(/^(\d{1,7})\s*[:：、.\-]?\s*(\D.+)$/u);
  if (!match) {
    return null;
  }
  const row = Number(match[1]);
  const label = match[2].trim();
  if (row < 1 || row > 1_048_576 || !label) {
    return null;
  }
  return { row, label };
}

function findNearestRowNumber(
  labelBounds: ItemBounds,
  numericItems: Array<{ item: OcrTextItem; bounds: ItemBounds }>,
  redRect: PixelRect,
): number | null {
  const candidates = numericItems
    .map(({ item, bounds }) => ({
      row: Number(item.text.trim()),
      verticalDistance: Math.abs(bounds.centerY - labelBounds.centerY),
      horizontalDistance: Math.abs(bounds.centerX - redRect.x),
    }))
    .filter(
      ({ row, verticalDistance }) =>
        row >= 1 && row <= 1_048_576 && verticalDistance <= Math.max(18, labelBounds.height * 1.4),
    )
    .sort(
      (left, right) =>
        left.verticalDistance - right.verticalDistance || left.horizontalDistance - right.horizontalDistance,
    );
  return candidates[0]?.row ?? null;
}

function findTargetRectangle(centerY: number, rectangles: PixelRect[]): PixelRect | null {
  const containing = rectangles.filter(
    (rect) => centerY >= rect.y - 4 && centerY <= rect.y + rect.height + 4,
  );
  return (
    [...containing].sort((left, right) => {
      const leftDistance = Math.abs(centerY - (left.y + left.height / 2));
      const rightDistance = Math.abs(centerY - (right.y + right.height / 2));
      return leftDistance - rightDistance;
    })[0] ?? null
  );
}

function findColumnHeader(
  target: PixelRect,
  columnItems: Array<{ item: OcrTextItem; bounds: ItemBounds }>,
  imageWidth: number,
): { item: OcrTextItem; bounds: ItemBounds } | null {
  if (!columnItems.length) {
    return null;
  }
  const targetCenter = target.x + target.width / 2;
  const inside = columnItems.filter(
    ({ bounds }) => bounds.centerX >= target.x - 8 && bounds.centerX <= target.x + target.width + 8,
  );
  const pool = inside.length ? inside : columnItems;
  const nearest = [...pool].sort(
    (left, right) =>
      Math.abs(left.bounds.centerX - targetCenter) - Math.abs(right.bounds.centerX - targetCenter),
  )[0];
  const distance = Math.abs(nearest.bounds.centerX - targetCenter);
  return distance <= Math.max(target.width, imageWidth * 0.12) ? nearest : null;
}

function pointInside(x: number, y: number, rect: PixelRect, tolerance: number): boolean {
  return (
    x >= rect.x - tolerance &&
    x <= rect.x + rect.width + tolerance &&
    y >= rect.y - tolerance &&
    y <= rect.y + rect.height + tolerance
  );
}
