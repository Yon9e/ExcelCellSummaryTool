import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import {
  AlertTriangle,
  ClipboardPaste,
  FileImage,
  MapPin,
  Plus,
  ScanSearch,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { browserPreviewMessage, isTauriRuntime } from "./browserPreview";
import {
  createCandidateRuleRow,
  fillCandidatePairs,
  fillCandidateValues,
  getSelectedCells,
  selectCellRange,
  toggleCellSelection,
  type CandidateRuleRow,
} from "./ruleImageSelection";
import {
  reconstructSpreadsheet,
  type DetectedSpreadsheet,
  type DetectedSpreadsheetCell,
} from "./spreadsheetScreenshot";
import type { ImagePayload, OcrImageResult, OcrTextItem, Rule, SheetMode } from "./types";

interface RuleImageImporterProps {
  onClose: () => void;
  onAppend: (rules: Rule[]) => void;
}

interface AnalysisResult {
  spreadsheet: DetectedSpreadsheet;
  previewUrl: string;
  ocrItemCount: number;
}

type SelectionTarget = "output" | "data";
type RecognizeImage = (imageBase64: string) => Promise<OcrImageResult>;

const browserPreview = !isTauriRuntime();

export function RuleImageImporter({ onClose, onAppend }: RuleImageImporterProps) {
  const [image, setImage] = useState<ImagePayload | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [candidates, setCandidates] = useState<CandidateRuleRow[]>(() => [
    createCandidateRuleRow(),
    createCandidateRuleRow(),
    createCandidateRuleRow(),
  ]);
  const [activeCandidateId, setActiveCandidateId] = useState(() => candidates[0].id);
  const [outputSelection, setOutputSelection] = useState<Set<string>>(() => new Set());
  const [dataSelection, setDataSelection] = useState<Set<string>>(() => new Set());
  const [selectionTarget, setSelectionTarget] = useState<SelectionTarget>("output");
  const [overwrite, setOverwrite] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>("contains");
  const [sheetValue, setSheetValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("请选择图片文件或读取剪贴板；加载后点击“识别图片”。");
  const [error, setError] = useState("");
  const dragRef = useRef<{ startId: string; target: SelectionTarget; moved: boolean } | null>(null);

  const cells = useMemo(() => analysis?.spreadsheet.cells.flat() ?? [], [analysis]);
  const selectedOutputCells = useMemo(
    () => getSelectedCells(cells, outputSelection),
    [cells, outputSelection],
  );
  const selectedDataCells = useMemo(
    () => getSelectedCells(cells, dataSelection),
    [cells, dataSelection],
  );

  function loadPayload(payload: ImagePayload, source: string) {
    setImage(payload);
    setAnalysis(null);
    setOutputSelection(new Set());
    setDataSelection(new Set());
    setError("");
    setStatus(`已加载${source}，请点击“识别图片”重建可选单元格。`);
  }

  async function selectImage() {
    if (browserPreview) {
      setError(browserPreviewMessage);
      return;
    }
    setError("");
    try {
      const selected = await open({
        multiple: false,
        title: "选择包含 Excel 行号和列字母的截图",
        filters: [{ name: "图片", extensions: ["png", "jpg", "jpeg", "bmp", "webp", "tif", "tiff"] }],
      });
      if (typeof selected !== "string") return;
      setBusy(true);
      const payload = await invoke<ImagePayload>("read_image_file", { path: selected });
      loadPayload(payload, "所选图片");
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
    }
  }

  async function readClipboard() {
    if (browserPreview) {
      setError(browserPreviewMessage);
      return;
    }
    setError("");
    setBusy(true);
    try {
      const payload = await invoke<ImagePayload | null>("read_clipboard_image");
      if (!payload) {
        setError("剪贴板中没有图片，请先复制 Excel 截图。");
        return;
      }
      loadPayload(payload, "剪贴板图片");
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
    }
  }

  async function recognizeLoadedImage() {
    if (!image) {
      setError("请先选择图片文件或读取剪贴板图片。 ");
      return;
    }
    if (browserPreview) {
      setError(browserPreviewMessage);
      return;
    }
    setBusy(true);
    setError("");
    setAnalysis(null);
    setOutputSelection(new Set());
    setDataSelection(new Set());
    setStatus("正在分区识别图片并重建 Excel 单元格...");
    try {
      const result = await analyzeSpreadsheetImage(image.data_url, (imageBase64) =>
        invoke<OcrImageResult>("ocr_image_base64", { imageBase64 }),
      );
      setAnalysis(result);
      const { spreadsheet } = result;
      if (!spreadsheet.cells.length) {
        setError(spreadsheet.warnings.join("；") || "未能重建表格，请确认截图包含 Excel 行号和列字母。");
      }
      setStatus(
        spreadsheet.cells.length
          ? `已识别 ${spreadsheet.rows.length} 行、${spreadsheet.columns.length} 列，共 ${spreadsheet.cells.flat().length} 个可选单元格。`
          : `OCR 返回 ${result.ocrItemCount} 个文本块，但没有形成可定位的 Excel 表格。`,
      );
    } catch (reason) {
      setError(String(reason));
      setStatus("图片识别失败，可调整截图后重新点击“识别图片”。");
    } finally {
      setBusy(false);
    }
  }

  function updateCandidate(id: string, patch: Partial<CandidateRuleRow>) {
    setCandidates((rows) => rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function addCandidate() {
    const row = createCandidateRuleRow();
    setCandidates((rows) => [...rows, row]);
    setActiveCandidateId(row.id);
  }

  function deleteActiveCandidate() {
    setCandidates((rows) => {
      const remaining = rows.filter(({ id }) => id !== activeCandidateId);
      const next = remaining.length ? remaining : [createCandidateRuleRow()];
      setActiveCandidateId(next[0].id);
      return next;
    });
  }

  function applyOutputSelection() {
    const values = selectedOutputCells.map(({ text }) => text).filter(Boolean);
    if (!values.length) {
      setError("请先切换到“输出列名”，选择至少一个包含文字的单元格。 ");
      return;
    }
    const result = fillCandidateValues(candidates, activeCandidateId, values, "outputColumn", overwrite);
    setCandidates(result.rows);
    setError("");
    setStatus(`已从活动规则行开始填入 ${result.filled} 个输出列名。`);
  }

  function applyDataSelection() {
    if (!selectedDataCells.length) {
      setError("请先切换到“目标数据”，选择至少一个单元格。 ");
      return;
    }
    const result = fillCandidateValues(
      candidates,
      activeCandidateId,
      selectedDataCells.map(({ address }) => address),
      "cell",
      overwrite,
    );
    setCandidates(result.rows);
    setError("");
    setStatus(`已从活动规则行开始填入 ${result.filled} 个目标坐标。`);
  }

  function applyPairedSelection() {
    const outputs = selectedOutputCells.filter(({ text }) => text.trim());
    if (!outputs.length || !selectedDataCells.length) {
      setError("请分别选择输出列名单元格和目标数据单元格。 ");
      return;
    }
    if (outputs.length !== selectedDataCells.length) {
      setError(`两组选择数量不一致：输出列名 ${outputs.length} 个，目标数据 ${selectedDataCells.length} 个。`);
      return;
    }
    const result = fillCandidatePairs(candidates, activeCandidateId, outputs, selectedDataCells, overwrite);
    setCandidates(result.rows);
    setError("");
    setStatus(`已按顺序配对填入 ${result.filled} 条候选规则。`);
  }

  function handleCellPointerDown(event: ReactPointerEvent, cell: DetectedSpreadsheetCell) {
    event.preventDefault();
    dragRef.current = { startId: cell.id, target: selectionTarget, moved: false };
  }

  function handleCellPointerEnter(event: ReactPointerEvent, cell: DetectedSpreadsheetCell) {
    const drag = dragRef.current;
    if (!drag || event.buttons !== 1) return;
    if (drag.startId !== cell.id) drag.moved = true;
    const range = selectCellRange(cells, drag.startId, cell.id);
    if (drag.target === "output") setOutputSelection(range);
    else setDataSelection(range);
  }

  function handleCellPointerUp(cell: DetectedSpreadsheetCell) {
    const drag = dragRef.current;
    if (!drag) return;
    if (!drag.moved) {
      if (drag.target === "output") {
        setOutputSelection((selected) => toggleCellSelection(selected, cell.id));
      } else {
        setDataSelection((selected) => toggleCellSelection(selected, cell.id));
      }
    }
    dragRef.current = null;
  }

  function confirmImport() {
    setError("");
    if (!sheetValue.trim()) {
      setError("请填写 Sheet 值；图片识别只负责定位表头和单元格坐标。 ");
      return;
    }
    if (sheetMode === "index" && (!/^\d+$/.test(sheetValue.trim()) || Number(sheetValue.trim()) < 1)) {
      setError("按序号定位时，Sheet 值必须是大于 0 的整数。 ");
      return;
    }
    const used = candidates.filter(({ outputColumn, cell }) => outputColumn.trim() || cell.trim());
    if (!used.length) {
      setError("请先填写或识别至少一条候选规则。 ");
      return;
    }
    const invalid = used.find(({ outputColumn, cell }) => (
      !outputColumn.trim() || !/^[A-Z]{1,3}[1-9]\d{0,6}$/i.test(cell.trim())
    ));
    if (invalid) {
      setError(`请补全“${invalid.outputColumn || "未命名规则"}”的输出列名和有效单元格坐标。`);
      return;
    }
    onAppend(used.map(({ outputColumn, cell }) => ({
      output_column: outputColumn.trim(),
      sheet_mode: sheetMode,
      sheet_value: sheetValue.trim(),
      cell: cell.trim().toUpperCase(),
    })));
  }

  return (
    <div className="modal-backdrop rule-import-backdrop" role="presentation">
      <div className="rule-import-modal" role="dialog" aria-modal="true" aria-labelledby="rule-import-title">
        <header className="rule-import-heading">
          <div>
            <p className="eyebrow">图片定位规则</p>
            <h3 id="rule-import-title">从 Excel 截图选择单元格</h3>
            <p>识别全部可见单元格，再点击或拖动选择输出列名和目标数据；Sheet 信息仍由人工确认。</p>
          </div>
          <button className="icon-button" onClick={onClose} title="关闭"><X size={20} /></button>
        </header>

        <div className="rule-import-controls">
          <div className="rule-import-source-actions">
            <button className="soft-button" disabled={busy} onClick={() => void selectImage()}>
              <FileImage size={19} />选择图片
            </button>
            <button className="soft-button" disabled={busy} onClick={() => void readClipboard()}>
              <ClipboardPaste size={19} />读取剪贴板
            </button>
            <button className="primary-button" disabled={busy || !image} onClick={() => void recognizeLoadedImage()}>
              <ScanSearch size={19} />{busy ? "识别中" : "识别图片"}
            </button>
          </div>
          <label>
            <span>Sheet 模式</span>
            <select value={sheetMode} onChange={(event) => setSheetMode(event.target.value as SheetMode)}>
              <option value="exact">exact - 精确匹配</option>
              <option value="contains">contains - 包含关键词</option>
              <option value="index">index - 按序号</option>
            </select>
          </label>
          <label className="rule-import-sheet-value">
            <span>Sheet 值</span>
            <input value={sheetValue} onChange={(event) => setSheetValue(event.target.value)} placeholder="人工填写 Sheet 名、关键词或序号" />
          </label>
        </div>

        <div className="rule-import-status" role="status">
          <ScanSearch size={18} /><span>{status}</span>
        </div>
        {error && <div className="inline-error"><AlertTriangle size={18} />{error}</div>}

        <div className="rule-import-workspace spreadsheet-import-workspace">
          <section className="spreadsheet-detection-panel">
            <div className="rule-import-preview compact-preview">
              {image ? <img src={analysis?.previewUrl || image.data_url} alt="Excel 截图预览" /> : (
                <div className="ocr-empty-state"><FileImage size={36} /><strong>Excel 截图预览</strong></div>
              )}
            </div>
            <div className="cell-selection-toolbar">
              <div className="selection-targets" aria-label="单元格选择用途">
                <button
                  className={selectionTarget === "output" ? "active" : ""}
                  onClick={() => setSelectionTarget("output")}
                ><Type size={16} />输出列名 <span>{outputSelection.size}</span></button>
                <button
                  className={selectionTarget === "data" ? "active" : ""}
                  onClick={() => setSelectionTarget("data")}
                ><MapPin size={16} />目标数据 <span>{dataSelection.size}</span></button>
              </div>
              <button className="text-button" onClick={() => {
                if (selectionTarget === "output") setOutputSelection(new Set());
                else setDataSelection(new Set());
              }}>清除当前选择</button>
            </div>
            <div className="detected-sheet-wrap">
              {analysis?.spreadsheet.cells.length ? (
                <table className="detected-sheet" onPointerLeave={() => { dragRef.current = null; }}>
                  <thead><tr><th className="sheet-corner" />{analysis.spreadsheet.columns.map((column) => <th key={column.label}>{column.label}</th>)}</tr></thead>
                  <tbody>{analysis.spreadsheet.rows.map((row) => (
                    <tr key={row.number}>
                      <th>{row.number}</th>
                      {analysis.spreadsheet.cells[row.index].map((cell) => {
                        const outputSelected = outputSelection.has(cell.id);
                        const dataSelected = dataSelection.has(cell.id);
                        const className = [outputSelected && "output-selected", dataSelected && "data-selected"].filter(Boolean).join(" ");
                        return (
                          <td
                            className={className}
                            key={cell.id}
                            title={`${cell.address}${cell.text ? ` · ${cell.text}` : ""}`}
                            onPointerDown={(event) => handleCellPointerDown(event, cell)}
                            onPointerEnter={(event) => handleCellPointerEnter(event, cell)}
                            onPointerUp={() => handleCellPointerUp(cell)}
                          >
                            <span>{cell.text || " "}</span><small>{cell.address}</small>
                          </td>
                        );
                      })}
                    </tr>
                  ))}</tbody>
                </table>
              ) : (
                <div className="candidate-empty">加载图片后点击“识别图片”，这里会生成可点击、可拖选的单元格表格。</div>
              )}
            </div>
          </section>

          <section className="candidate-list rule-candidate-editor">
            <div className="candidate-list-heading">
              <span>候选规则</span><small>点击规则行设置填充起点</small>
            </div>
            <div className="candidate-editor-actions">
              <button className="soft-button" onClick={addCandidate}><Plus size={16} />添加规则</button>
              <button className="danger-button" onClick={deleteActiveCandidate}><Trash2 size={16} />删除当前</button>
              <label className="overwrite-toggle"><input type="checkbox" checked={overwrite} onChange={(event) => setOverwrite(event.target.checked)} />覆盖已有内容</label>
            </div>
            <div className="candidate-fill-actions">
              <button className="soft-button" onClick={applyOutputSelection}>仅填列名</button>
              <button className="soft-button" onClick={applyDataSelection}>仅填坐标</button>
              <button className="primary-button" onClick={applyPairedSelection}>配对填充</button>
            </div>
            <div className="candidate-editor-body">
              {candidates.map((candidate, index) => (
                <div
                  className={`candidate-row editable${candidate.id === activeCandidateId ? " active" : ""}`}
                  key={candidate.id}
                  onClick={() => setActiveCandidateId(candidate.id)}
                >
                  <span className="candidate-index">{index + 1}</span>
                  <label><span>输出列名</span><input value={candidate.outputColumn} onChange={(event) => updateCandidate(candidate.id, { outputColumn: event.target.value })} /></label>
                  <label className="candidate-cell"><span>目标单元格</span><input value={candidate.cell} placeholder="如 B1150" onChange={(event) => updateCandidate(candidate.id, { cell: event.target.value.toUpperCase() })} /></label>
                </div>
              ))}
            </div>
          </section>
        </div>

        <footer className="modal-actions">
          <button className="soft-button" onClick={onClose}>取消</button>
          <button className="primary-button" disabled={busy} onClick={confirmImport}>追加到规则配置</button>
        </footer>
      </div>
    </div>
  );
}

export interface OcrRegion {
  dataUrl: string;
  sourceX: number;
  sourceY: number;
  scaleX: number;
  scaleY: number;
}

async function analyzeSpreadsheetImage(
  dataUrl: string,
  recognizeImage: RecognizeImage,
): Promise<AnalysisResult> {
  const image = await loadImage(dataUrl);
  const pixelCount = image.naturalWidth * image.naturalHeight;
  if (!image.naturalWidth || !image.naturalHeight || pixelCount > 16_000_000) {
    throw new Error("图片尺寸异常或超过 1600 万像素，请裁剪后重试。 ");
  }
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("当前窗口无法读取图片像素。 ");
  context.drawImage(image, 0, 0);

  const ocrItems: OcrTextItem[] = [];
  for (const region of createSpreadsheetOcrRegions(canvas)) {
    const result = await recognizeImage(region.dataUrl);
    ocrItems.push(...mapOcrItemsToSource(result.items, region));
  }
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const spreadsheet = reconstructSpreadsheet(imageData, ocrItems);
  return { spreadsheet, previewUrl: canvas.toDataURL("image/png"), ocrItemCount: ocrItems.length };
}

export function createSpreadsheetOcrRegions(source: HTMLCanvasElement): OcrRegion[] {
  const regions: OcrRegion[] = [];
  const tileWidth = 820;
  const tileHeight = 620;
  const overlap = 48;
  for (let y = 0; y < source.height; y += tileHeight - overlap) {
    const height = Math.min(tileHeight, source.height - y);
    for (let x = 0; x < source.width; x += tileWidth - overlap) {
      const width = Math.min(tileWidth, source.width - x);
      regions.push(createScaledCrop(source, x, y, width, height, 1.35));
      if (x + width >= source.width) break;
    }
    if (y + height >= source.height) break;
  }
  const topHeight = Math.min(source.height, Math.max(42, Math.round(source.height * 0.075)));
  regions.push(createScaledCrop(source, 0, 0, source.width, topHeight, 3));
  const leftWidth = Math.min(source.width, Math.max(54, Math.round(source.width * 0.055)));
  for (let y = 0; y < source.height; y += 520) {
    const height = Math.min(560, source.height - y);
    regions.push(createScaledCrop(source, 0, y, leftWidth, height, 2.2));
    if (y + height >= source.height) break;
  }
  return regions;
}

function createScaledCrop(
  source: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
  requestedScale: number,
): OcrRegion {
  const maxPixels = 15_000_000;
  const scale = Math.max(1, Math.min(requestedScale, Math.sqrt(maxPixels / Math.max(1, width * height))));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前窗口无法创建 OCR 识别区域。 ");
  context.imageSmoothingEnabled = false;
  context.drawImage(source, x, y, width, height, 0, 0, targetWidth, targetHeight);
  return {
    dataUrl: canvas.toDataURL("image/png"),
    sourceX: x,
    sourceY: y,
    scaleX: targetWidth / width,
    scaleY: targetHeight / height,
  };
}

export function mapOcrItemsToSource(items: OcrTextItem[], region: OcrRegion): OcrTextItem[] {
  return items.map((item) => ({
    ...item,
    box_points: item.box_points.map(([x, y]) => [
      x / region.scaleX + region.sourceX,
      y / region.scaleY + region.sourceY,
    ]),
  }));
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片加载失败，请换用 PNG 或 JPG 文件。 "));
    image.src = dataUrl;
  });
}
