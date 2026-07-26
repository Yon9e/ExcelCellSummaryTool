import { numberToColumnLabel, reconstructSpreadsheet, type DetectedSpreadsheet } from "./spreadsheetScreenshot";
import type { ImagePayload, OcrImageResult, OcrTextItem } from "./types";
import type { ScreenshotWorkspaceItem } from "./ruleImageWorkspace";

// 截图分析与 OCR 坐标换算保持为纯函数，供 Vue 界面和单元测试共同复用。

export interface AnalysisResult {
  spreadsheet: DetectedSpreadsheet;
  previewUrl: string;
  ocrItemCount: number;
}
export interface OcrRegion {
  dataUrl: string;
  sourceX: number;
  sourceY: number;
  scaleX: number;
  scaleY: number;
}
export type RecognizeImage = (imageBase64: string) => Promise<OcrImageResult>;

export function resolveDetectedColumnLabel(
  columns: ReadonlyArray<Pick<DetectedSpreadsheet["columns"][number], "index" | "label">>,
  columnIndex: number,
): string {
  return columns.find((column) => column.index === columnIndex)?.label ?? numberToColumnLabel(columnIndex + 1);
}

export function createBrowserDemoScreenshots(): ScreenshotWorkspaceItem<AnalysisResult>[] {
  const definitions = [
    { id: "demo-profit", name: "利润表截图", startRow: 1150, rows: [
      ["主营业务收入", "29,797,107.90", "31,832,207.15", "10,356,322.22", "11,116,521.97", "19,440,785.68", "20,715,685.18", "65.2%", "34.8%", "18,983,450.00", "10,813,657.90", "5,420,000.00", "4,936,322.22", "2,184,500.00", "1,623,240.00", "856,760.00"],
      ["其他业务收入", "240,000.00", "", "120,000.00", "", "120,000.00", "", "50.0%", "50.0%", "96,000.00", "72,000.00", "36,000.00", "24,000.00", "8,000.00", "3,000.00", "1,000.00"],
      ["营业成本", "31,832,207.15", "11,116,521.97", "9,856,210.33", "8,742,115.42", "21,975,996.82", "2,374,406.55", "69.0%", "31.0%", "16,824,330.00", "15,007,877.15", "6,923,400.00", "4,193,121.97", "2,810,040.00", "1,209,500.00", "721,630.00"],
      ["合计", "30,037,107.90", "42,948,729.12", "20,332,532.55", "19,858,637.39", "41,536,782.50", "23,090,091.73", "67.1%", "32.9%", "35,903,780.00", "25,893,535.05", "12,379,400.00", "9,153,444.19", "5,002,540.00", "2,835,740.00", "1,579,390.00"],
    ]},
    { id: "demo-balance", name: "资产负债表截图", startRow: 330, rows: [
      ["原材料", "918,944.37", "2,035,979.98", "0.00", "918,944.37", "2,035,979.98", "0.00", "1,117,035.61", "54.9%", "45.1%", "620,311.20", "298,633.17", "1,256,420.00", "779,559.98", "0.00", "0.00"],
      ["在产品", "", "0.00", "", "", "0.00", "0.00", "0.00", "0.0%", "0.0%", "", "", "0.00", "0.00", "0.00", "0.00"],
      ["库存商品", "1,116,084.44", "4,635,524.98", "0.00", "1,116,084.44", "4,635,524.98", "0.00", "3,519,440.54", "59.6%", "40.4%", "736,615.73", "379,468.71", "2,928,335.12", "1,707,189.86", "0.00", "0.00"],
      ["周转材料", "2,212.39", "0.00", "0.00", "2,212.39", "0.00", "0.00", "-2,212.39", "100.0%", "0.0%", "1,400.00", "812.39", "0.00", "0.00", "0.00", "0.00"],
    ]},
  ];
  return definitions.map((definition) => {
    const spreadsheet = createDemoSpreadsheet(definition.startRow, definition.rows);
    const payload: ImagePayload = { path: definition.name, data_url: "", size_bytes: 0 };
    return {
      id: definition.id, name: definition.name, payload,
      analysis: { spreadsheet, previewUrl: "", ocrItemCount: spreadsheet.cells.flat().length },
      outputSelection: new Set([`A${definition.startRow}`, `A${definition.startRow + 1}`]),
      dataSelection: new Set([`B${definition.startRow}`, `C${definition.startRow}`, `B${definition.startRow + 1}`, `C${definition.startRow + 1}`]),
      demo: true,
    };
  });
}

function createDemoSpreadsheet(startRow: number, values: string[][]): DetectedSpreadsheet {
  const columnCount = Math.max(1, ...values.map((row) => row.length));
  const labels = Array.from({ length: columnCount }, (_, index) => numberToColumnLabel(index + 1));
  const columns = labels.map((label, index) => ({ label, index, center: 90 + index * 180, start: index * 180, end: (index + 1) * 180 }));
  const rows = values.map((_, index) => ({ number: startRow + index, index, center: 21 + index * 42, start: index * 42, end: (index + 1) * 42 }));
  const cells = rows.map((row) => columns.map((column) => {
    const address = `${column.label}${row.number}`;
    return { id: address, address, rowIndex: row.index, columnIndex: column.index, rowNumber: row.number, columnLabel: column.label, text: values[row.index][column.index] ?? "", confidence: 0.99, bounds: { x: column.start, y: row.start, width: column.end - column.start, height: row.end - row.start } };
  }));
  return { columns, rows, cells, warnings: [], ocrDiagnostics: [] };
}

export async function analyzeSpreadsheetImage(dataUrl: string, recognizeImage: RecognizeImage): Promise<AnalysisResult> {
  const image = await loadImage(dataUrl);
  const pixelCount = image.naturalWidth * image.naturalHeight;
  if (!image.naturalWidth || !image.naturalHeight || pixelCount > 16_000_000) throw new Error("图片尺寸异常或超过 1600 万像素，请裁剪后重试。 ");
  const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("当前窗口无法读取图片像素。 ");
  context.drawImage(image, 0, 0);
  const ocrItems: OcrTextItem[] = [];
  for (const region of createSpreadsheetOcrRegions(canvas)) {
    const result = await recognizeImage(region.dataUrl);
    ocrItems.push(...mapOcrItemsToSource(result.items, region));
  }
  const spreadsheet = reconstructSpreadsheet(context.getImageData(0, 0, canvas.width, canvas.height), ocrItems);
  return { spreadsheet, previewUrl: canvas.toDataURL("image/png"), ocrItemCount: ocrItems.length };
}

export function createSpreadsheetOcrRegions(source: HTMLCanvasElement): OcrRegion[] {
  const regions: OcrRegion[] = []; const tileWidth = 820; const tileHeight = 620; const overlap = 48;
  for (let y = 0; y < source.height; y += tileHeight - overlap) {
    const height = Math.min(tileHeight, source.height - y);
    for (let x = 0; x < source.width; x += tileWidth - overlap) { const width = Math.min(tileWidth, source.width - x); regions.push(createScaledCrop(source, x, y, width, height, 1.35)); if (x + width >= source.width) break; }
    if (y + height >= source.height) break;
  }
  const topHeight = Math.min(source.height, Math.max(42, Math.round(source.height * 0.075)));
  regions.push(createScaledCrop(source, 0, 0, source.width, topHeight, 3));
  const leftWidth = Math.min(source.width, Math.max(54, Math.round(source.width * 0.055)));
  for (let y = 0; y < source.height; y += 520) { const height = Math.min(560, source.height - y); regions.push(createScaledCrop(source, 0, y, leftWidth, height, 2.2)); if (y + height >= source.height) break; }
  return regions;
}

function createScaledCrop(source: HTMLCanvasElement, x: number, y: number, width: number, height: number, requestedScale: number): OcrRegion {
  const scale = Math.max(1, Math.min(requestedScale, Math.sqrt(15_000_000 / Math.max(1, width * height))));
  const targetWidth = Math.max(1, Math.round(width * scale)); const targetHeight = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas"); canvas.width = targetWidth; canvas.height = targetHeight;
  const context = canvas.getContext("2d"); if (!context) throw new Error("当前窗口无法创建 OCR 识别区域。 ");
  context.imageSmoothingEnabled = false; context.drawImage(source, x, y, width, height, 0, 0, targetWidth, targetHeight);
  return { dataUrl: canvas.toDataURL("image/png"), sourceX: x, sourceY: y, scaleX: targetWidth / width, scaleY: targetHeight / height };
}

export function mapOcrItemsToSource(items: OcrTextItem[], region: OcrRegion): OcrTextItem[] {
  return items.map((item) => ({ ...item, box_points: item.box_points.map(([x, y]) => [x / region.scaleX + region.sourceX, y / region.scaleY + region.sourceY]) }));
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error("图片加载失败，请换用 PNG 或 JPG 文件。 ")); image.src = dataUrl; });
}
