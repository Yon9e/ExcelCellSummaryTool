import type { OcrTextItem } from "./types";

export interface PixelBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface CellBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedAxis {
  center: number;
  start: number;
  end: number;
}

export interface DetectedColumn extends DetectedAxis {
  label: string;
  index: number;
}

export interface DetectedRow extends DetectedAxis {
  number: number;
  index: number;
}

export interface DetectedSpreadsheetCell {
  id: string;
  address: string;
  rowIndex: number;
  columnIndex: number;
  rowNumber: number;
  columnLabel: string;
  text: string;
  confidence: number;
  bounds: CellBounds;
}

export type OcrDiagnosticAssignment = "assigned" | "ignored" | "unassigned";

export type OcrDiagnosticReason =
  | "column-header"
  | "row-header"
  | "missing-axes"
  | "no-nearest-row"
  | "no-nearest-column"
  | "outside-cell-bounds";

export interface OcrDiagnosticItem {
  text: string;
  confidence: number;
  bounds: CellBounds;
  centerX: number;
  centerY: number;
  assignment: OcrDiagnosticAssignment;
  reason?: OcrDiagnosticReason;
  cellAddress?: string;
}

export interface DetectedSpreadsheet {
  columns: DetectedColumn[];
  rows: DetectedRow[];
  cells: DetectedSpreadsheetCell[][];
  warnings: string[];
  ocrDiagnostics: OcrDiagnosticItem[];
}

interface PositionedItem {
  item: OcrTextItem;
  centerX: number;
  centerY: number;
  x: number;
  y: number;
  right: number;
  bottom: number;
}

export function reconstructSpreadsheet(
  buffer: PixelBuffer,
  ocrItems: OcrTextItem[],
): DetectedSpreadsheet {
  const items = deduplicateItems(ocrItems).map(positionItem);
  const columnHeaderLimit = Math.max(24, buffer.height * 0.045);

  const columnHeaders = items
    .filter(({ item, centerY }) => /^[A-Z]{1,3}$/i.test(item.text.trim()) && centerY <= columnHeaderLimit)
    .map((positioned) => ({
      positioned,
      label: positioned.item.text.trim().toUpperCase(),
      value: columnLabelToNumber(positioned.item.text.trim()),
    }))
    .filter(({ value }) => value >= 1 && value <= 16_384)
    .sort((left, right) => left.positioned.centerX - right.positioned.centerX);

  const firstColumnCenter = columnHeaders[0]?.positioned.centerX ?? buffer.width * 0.15;
  const rowHeaderLimit = Math.max(
    32,
    Math.min(buffer.width * 0.07, firstColumnCenter * 0.22),
  );

  const rowHeaders = items
    .filter(({ item, centerX, centerY }) => {
      const text = item.text.trim();
      return /^\d{1,7}$/.test(text) && centerX <= rowHeaderLimit && centerY > columnHeaderLimit * 0.7;
    })
    .map((positioned) => ({ positioned, value: Number(positioned.item.text.trim()) }))
    .filter(({ value }) => value >= 1 && value <= 1_048_576)
    .sort((left, right) => left.positioned.centerY - right.positioned.centerY);

  const warnings: string[] = [];
  if (!columnHeaders.length) warnings.push("未识别到 Excel 列字母，请让截图包含顶部列标题");
  if (!rowHeaders.length) warnings.push("未识别到 Excel 行号，请让截图包含左侧行标题");
  if (!columnHeaders.length || !rowHeaders.length) {
    return {
      columns: [],
      rows: [],
      cells: [],
      warnings,
      ocrDiagnostics: items.map((positioned) => createOcrDiagnostic(positioned, "unassigned", "missing-axes")),
    };
  }

  const expandedColumns = expandHeaders(
    uniqueMonotonicHeaders(columnHeaders.map(({ positioned, value }) => ({
      value,
      center: positioned.centerX,
    }))),
    10,
  );
  const expandedRows = expandHeaders(
    uniqueMonotonicHeaders(rowHeaders.map(({ positioned, value }) => ({
      value,
      center: positioned.centerY,
    }))),
    20,
  );

  const columnAxes = addAxisBounds(expandedColumns, 0, buffer.width);
  if (columnAxes.length) {
    const rowHeaderRight = Math.max(
      ...rowHeaders.map(({ positioned }) => Math.max(...positioned.item.box_points.map(([x]) => x))),
    );
    // rowHeaderLimit 仅用于筛选行号；A 列起点应从实际行号框右侧开始，避免短文本落入死区。
    columnAxes[0].start = Math.min(columnAxes[0].start, rowHeaderRight + 4);
  }
  const rowAxes = addAxisBounds(expandedRows, 0, buffer.height);
  const columns: DetectedColumn[] = columnAxes.map((axis, index) => ({
    ...axis,
    index,
    label: numberToColumnLabel(expandedColumns[index].value),
  }));
  const rows: DetectedRow[] = rowAxes.map((axis, index) => ({
    ...axis,
    index,
    number: expandedRows[index].value,
  }));

  const columnHeaderItems = new Set(columnHeaders.map(({ positioned }) => positioned.item));
  const rowHeaderItems = new Set(rowHeaders.map(({ positioned }) => positioned.item));
  const assigned = new Map<string, PositionedItem[]>();
  const ocrDiagnostics: OcrDiagnosticItem[] = [];
  for (const positioned of items) {
    if (columnHeaderItems.has(positioned.item)) {
      ocrDiagnostics.push(createOcrDiagnostic(positioned, "ignored", "column-header"));
      continue;
    }
    if (rowHeaderItems.has(positioned.item)) {
      ocrDiagnostics.push(createOcrDiagnostic(positioned, "ignored", "row-header"));
      continue;
    }
    const row = nearestAxis(rows, positioned.centerY);
    const column = nearestAxis(columns, positioned.centerX);
    if (!row) {
      ocrDiagnostics.push(createOcrDiagnostic(positioned, "unassigned", "no-nearest-row"));
      continue;
    }
    if (!column) {
      ocrDiagnostics.push(createOcrDiagnostic(positioned, "unassigned", "no-nearest-column"));
      continue;
    }
    const address = `${column.label}${row.number}`;
    if (
      !axisOverlapsBounds(column, positioned.x, positioned.right)
      || !axisOverlapsBounds(row, positioned.y, positioned.bottom)
    ) {
      ocrDiagnostics.push(createOcrDiagnostic(positioned, "unassigned", "outside-cell-bounds", address));
      continue;
    }
    const key = `${row.index}:${column.index}`;
    assigned.set(key, [...(assigned.get(key) ?? []), positioned]);
    ocrDiagnostics.push(createOcrDiagnostic(positioned, "assigned", undefined, address));
  }

  const cells = rows.map((row) => columns.map((column) => {
    const content = (assigned.get(`${row.index}:${column.index}`) ?? [])
      .sort((left, right) => left.y - right.y || left.x - right.x);
    const text = joinOcrText(content.map(({ item }) => item.text.trim()).filter(Boolean));
    const confidence = content.length
      ? content.reduce((sum, { item }) => sum + item.score, 0) / content.length
      : 1;
    const address = `${column.label}${row.number}`;
    return {
      id: address,
      address,
      rowIndex: row.index,
      columnIndex: column.index,
      rowNumber: row.number,
      columnLabel: column.label,
      text,
      confidence,
      bounds: {
        x: column.start,
        y: row.start,
        width: column.end - column.start,
        height: row.end - row.start,
      },
    };
  }));

  return { columns, rows, cells, warnings, ocrDiagnostics };
}

function positionItem(item: OcrTextItem): PositionedItem {
  const xs = item.box_points.map(([x]) => x);
  const ys = item.box_points.map(([, y]) => y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const right = Math.max(...xs);
  const bottom = Math.max(...ys);
  return { item, x, y, right, bottom, centerX: (x + right) / 2, centerY: (y + bottom) / 2 };
}

function createOcrDiagnostic(
  positioned: PositionedItem,
  assignment: OcrDiagnosticAssignment,
  reason?: OcrDiagnosticReason,
  cellAddress?: string,
): OcrDiagnosticItem {
  return {
    text: positioned.item.text.trim(),
    confidence: positioned.item.score,
    bounds: {
      x: positioned.x,
      y: positioned.y,
      width: positioned.right - positioned.x,
      height: positioned.bottom - positioned.y,
    },
    centerX: positioned.centerX,
    centerY: positioned.centerY,
    assignment,
    reason,
    cellAddress,
  };
}

function deduplicateItems(items: OcrTextItem[]): OcrTextItem[] {
  const result: OcrTextItem[] = [];
  for (const item of items) {
    const current = positionItem(item);
    const duplicate = result.some((existing) => {
      const previous = positionItem(existing);
      return existing.text.trim() === item.text.trim()
        && Math.abs(previous.centerX - current.centerX) <= 8
        && Math.abs(previous.centerY - current.centerY) <= 8;
    });
    if (!duplicate) result.push(item);
  }
  return result;
}

function uniqueMonotonicHeaders(headers: Array<{ value: number; center: number }>) {
  const result: Array<{ value: number; center: number }> = [];
  for (const header of headers) {
    const previous = result[result.length - 1];
    if (!previous || (header.value > previous.value && header.center > previous.center)) {
      result.push(header);
    }
  }
  return result;
}

function expandHeaders(headers: Array<{ value: number; center: number }>, maxGap: number) {
  if (headers.length < 2) return headers;
  const result: Array<{ value: number; center: number }> = [];
  for (let index = 0; index < headers.length - 1; index += 1) {
    const current = headers[index];
    const next = headers[index + 1];
    result.push(current);
    const valueGap = next.value - current.value;
    if (valueGap > 1 && valueGap <= maxGap) {
      for (let offset = 1; offset < valueGap; offset += 1) {
        result.push({
          value: current.value + offset,
          center: current.center + ((next.center - current.center) * offset) / valueGap,
        });
      }
    }
  }
  result.push(headers[headers.length - 1]);
  return result;
}

function addAxisBounds(
  headers: Array<{ value: number; center: number }>,
  minimum: number,
  maximum: number,
): DetectedAxis[] {
  return headers.map((header, index) => {
    const previous = headers[index - 1];
    const next = headers[index + 1];
    const fallbackStep = next
      ? next.center - header.center
      : previous
        ? header.center - previous.center
        : Math.max(24, maximum * 0.1);
    const start = previous ? (previous.center + header.center) / 2 : header.center - fallbackStep / 2;
    const end = next ? (header.center + next.center) / 2 : header.center + fallbackStep / 2;
    return {
      center: header.center,
      start: Math.max(minimum, start),
      end: Math.min(maximum, end),
    };
  });
}

function nearestAxis<T extends DetectedAxis>(axes: T[], value: number): T | null {
  return [...axes].sort(
    (left, right) => Math.abs(left.center - value) - Math.abs(right.center - value),
  )[0] ?? null;
}

function axisOverlapsBounds(axis: DetectedAxis, start: number, end: number): boolean {
  return end > axis.start && start < axis.end;
}

function joinOcrText(parts: string[]): string {
  return parts.reduce((result, part) => {
    if (!result) return part;
    const needsSpace = /^[\x00-\x7F]/.test(part) && /[\x00-\x7F]$/.test(result);
    return `${result}${needsSpace ? " " : ""}${part}`;
  }, "");
}

export function columnLabelToNumber(label: string): number {
  return label.trim().toUpperCase().split("").reduce(
    (value, character) => value * 26 + character.charCodeAt(0) - 64,
    0,
  );
}

export function numberToColumnLabel(value: number): string {
  let current = value;
  let result = "";
  while (current > 0) {
    current -= 1;
    result = String.fromCharCode(65 + (current % 26)) + result;
    current = Math.floor(current / 26);
  }
  return result;
}
