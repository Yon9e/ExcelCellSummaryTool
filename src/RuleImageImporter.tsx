import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import {
  AlertTriangle,
  ClipboardPaste,
  FileImage,
  Images,
  MapPin,
  Plus,
  ScanSearch,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { browserPreviewMessage, isTauriRuntime } from "./browserPreview";
import {
  buildRowSelectionPairs,
  createCandidateRuleRow,
  fillCandidatePairValues,
  fillCandidateValues,
  getSelectedCells,
  selectCellRange,
  selectSingleColumnRange,
  toggleCellSelection,
  toggleSingleCellPerRow,
  type CandidateRuleRow,
} from "./ruleImageSelection";
import {
  appendScreenshotItems,
  removeScreenshotItem,
  updateScreenshotItem,
  type ScreenshotWorkspaceItem,
} from "./ruleImageWorkspace";
import {
  numberToColumnLabel,
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
let screenshotSequence = 0;

export function RuleImageImporter({ onClose, onAppend }: RuleImageImporterProps) {
  const initialScreenshots = useMemo(
    () => browserPreview ? createBrowserDemoScreenshots() : [],
    [],
  );
  const [screenshots, setScreenshots] = useState<ScreenshotWorkspaceItem<AnalysisResult>[]>(initialScreenshots);
  const [activeScreenshotId, setActiveScreenshotId] = useState<string | null>(initialScreenshots[0]?.id ?? null);
  const [candidates, setCandidates] = useState<CandidateRuleRow[]>(() => [
    createCandidateRuleRow(),
    createCandidateRuleRow(),
    createCandidateRuleRow(),
  ]);
  const [activeCandidateId, setActiveCandidateId] = useState(() => candidates[0].id);
  const [selectionTarget, setSelectionTarget] = useState<SelectionTarget>("output");
  const [dataColumnSuffixes, setDataColumnSuffixes] = useState<Record<string, Record<number, string>>>({});
  const [overwrite, setOverwrite] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>("contains");
  const [sheetValue, setSheetValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(
    browserPreview
      ? "已载入两张示例截图；点击缩略图可切换预览表格。"
      : "可一次添加多张图片或继续读取剪贴板；选择截图后点击“识别图片”。",
  );
  const [error, setError] = useState("");
  const dragRef = useRef<{ startId: string; target: SelectionTarget; moved: boolean } | null>(null);

  const activeScreenshot = useMemo(
    () => screenshots.find(({ id }) => id === activeScreenshotId) ?? null,
    [screenshots, activeScreenshotId],
  );
  const analysis = activeScreenshot?.analysis ?? null;
  const outputSelection = activeScreenshot?.outputSelection ?? new Set<string>();
  const dataSelection = activeScreenshot?.dataSelection ?? new Set<string>();
  const cells = useMemo(() => analysis?.spreadsheet.cells.flat() ?? [], [analysis]);
  const selectedOutputCells = useMemo(
    () => getSelectedCells(cells, outputSelection),
    [cells, outputSelection],
  );
  const selectedDataCells = useMemo(
    () => getSelectedCells(cells, dataSelection),
    [cells, dataSelection],
  );
  const activeColumnSuffixes = activeScreenshotId ? dataColumnSuffixes[activeScreenshotId] ?? {} : {};
  const rowSelectionPairs = buildRowSelectionPairs(
    selectedOutputCells,
    selectedDataCells,
    activeColumnSuffixes,
  );
  const suffixColumns = rowSelectionPairs.suffixColumnIndexes.map((columnIndex) => ({
    columnIndex,
    label: resolveDetectedColumnLabel(analysis?.spreadsheet.columns ?? [], columnIndex),
  }));

  function loadPayloads(payloads: ImagePayload[], source: string) {
    if (!payloads.length) return;
    const result = appendScreenshotItems(
      screenshots,
      payloads,
      () => `screenshot-${Date.now()}-${screenshotSequence += 1}`,
    );
    setScreenshots(result.items);
    setActiveScreenshotId(result.activeId);
    setError("");
    setStatus(`已追加 ${payloads.length} 张${source}，共 ${result.items.length} 张；请选择截图后点击“识别图片”。`);
  }

  async function selectImage() {
    if (browserPreview) {
      setError(browserPreviewMessage);
      return;
    }
    setError("");
    try {
      const selected = await open({
        multiple: true,
        title: "选择一张或多张包含 Excel 行号和列字母的截图",
        filters: [{ name: "图片", extensions: ["png", "jpg", "jpeg", "bmp", "webp", "tif", "tiff"] }],
      });
      const paths = typeof selected === "string" ? [selected] : selected ?? [];
      if (!paths.length) return;
      setBusy(true);
      const payloads = await Promise.all(
        paths.map((path) => invoke<ImagePayload>("read_image_file", { path })),
      );
      loadPayloads(payloads, "所选图片");
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
      loadPayloads([payload], "剪贴板图片");
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
    }
  }

  async function recognizeLoadedImage() {
    if (!activeScreenshot) {
      setError("请先选择图片文件或读取剪贴板图片。 ");
      return;
    }
    if (browserPreview || activeScreenshot.demo) {
      setError(browserPreviewMessage);
      return;
    }
    const screenshotId = activeScreenshot.id;
    setBusy(true);
    setError("");
    setScreenshots((items) => updateScreenshotItem(items, screenshotId, (item) => ({
      ...item,
      analysis: null,
      outputSelection: new Set(),
      dataSelection: new Set(),
    })));
    setDataColumnSuffixes((current) => ({ ...current, [screenshotId]: {} }));
    setStatus("正在分区识别图片并重建 Excel 单元格...");
    try {
      const result = await analyzeSpreadsheetImage(activeScreenshot.payload.data_url, (imageBase64) =>
        invoke<OcrImageResult>("ocr_image_base64", { imageBase64 }),
      );
      setScreenshots((items) => updateScreenshotItem(items, screenshotId, (item) => ({
        ...item,
        analysis: result,
      })));
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

  function switchScreenshot(id: string) {
    const screenshot = screenshots.find((item) => item.id === id);
    if (!screenshot) return;
    setActiveScreenshotId(id);
    setError("");
    setStatus(
      screenshot.analysis
        ? `已切换到“${screenshot.name}”，该截图已有可选表格。`
        : `已切换到“${screenshot.name}”，请点击“识别图片”。`,
    );
  }

  function deleteScreenshot(id: string) {
    const result = removeScreenshotItem(screenshots, id, activeScreenshotId);
    setScreenshots(result.items);
    setActiveScreenshotId(result.activeId);
    setDataColumnSuffixes((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setError("");
    setStatus(result.items.length ? `已移除截图，剩余 ${result.items.length} 张。` : "请添加截图或读取剪贴板图片。");
  }

  function setActiveSelection(
    target: SelectionTarget,
    update: Set<string> | ((selected: Set<string>) => Set<string>),
  ) {
    if (!activeScreenshotId) return;
    setScreenshots((items) => updateScreenshotItem(items, activeScreenshotId, (item) => {
      const current = target === "output" ? item.outputSelection : item.dataSelection;
      const next = typeof update === "function" ? update(current) : update;
      return target === "output"
        ? { ...item, outputSelection: next }
        : { ...item, dataSelection: next };
    }));
  }

  function updateCandidate(id: string, patch: Partial<CandidateRuleRow>) {
    setCandidates((rows) => rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function updateDataColumnSuffix(columnIndex: number, value: string) {
    if (!activeScreenshotId) return;
    setDataColumnSuffixes((current) => ({
      ...current,
      [activeScreenshotId]: {
        ...(current[activeScreenshotId] ?? {}),
        [columnIndex]: value,
      },
    }));
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
    const result = buildRowSelectionPairs(outputs, selectedDataCells, activeColumnSuffixes);
    if (result.missingOutputRowIndexes.length) {
      const rows = result.missingOutputRowIndexes.map((rowIndex) => (
        analysis?.spreadsheet.rows.find((row) => row.index === rowIndex)?.number ?? rowIndex + 1
      ));
      setError(`第 ${rows.join("、")} 行已选择目标数据，但没有选择输出列名。`);
      return;
    }
    const dataRows = new Set(selectedDataCells.map(({ rowIndex }) => rowIndex));
    const outputOnlyRows = outputs
      .filter(({ rowIndex }) => !dataRows.has(rowIndex))
      .map(({ rowIndex }) => analysis?.spreadsheet.rows.find((row) => row.index === rowIndex)?.number ?? rowIndex + 1);
    if (outputOnlyRows.length) {
      setError(`第 ${outputOnlyRows.join("、")} 行已选择输出列名，但没有选择目标数据。`);
      return;
    }
    if (result.missingSuffixColumnIndexes.length) {
      const columns = result.missingSuffixColumnIndexes.map((index) => (
        resolveDetectedColumnLabel(analysis?.spreadsheet.columns ?? [], index)
      ));
      setError(`同一行包含多个目标数据，请先填写 ${columns.join("、")} 列的区别后缀。`);
      return;
    }
    if (result.duplicateSuffixes.length) {
      setError(`数据列后缀不能重复：${result.duplicateSuffixes.join("、")}。请为不同列填写不同后缀。`);
      return;
    }
    const filled = fillCandidatePairValues(candidates, activeCandidateId, result.pairs, overwrite);
    setCandidates(filled.rows);
    setError("");
    setStatus(`已按行配对填入 ${filled.filled} 条候选规则。`);
  }

  function handleCellPointerDown(event: ReactPointerEvent, cell: DetectedSpreadsheetCell) {
    event.preventDefault();
    dragRef.current = { startId: cell.id, target: selectionTarget, moved: false };
  }

  function handleCellPointerEnter(event: ReactPointerEvent, cell: DetectedSpreadsheetCell) {
    const drag = dragRef.current;
    if (!drag || event.buttons !== 1) return;
    if (drag.startId !== cell.id) drag.moved = true;
    const range = drag.target === "output"
      ? selectSingleColumnRange(cells, drag.startId, cell.id)
      : selectCellRange(cells, drag.startId, cell.id);
    setActiveSelection(drag.target, range);
  }

  function handleCellPointerUp(cell: DetectedSpreadsheetCell) {
    const drag = dragRef.current;
    if (!drag) return;
    if (!drag.moved) {
      setActiveSelection(drag.target, (selected) => drag.target === "output"
        ? toggleSingleCellPerRow(selected, cell.id, cells)
        : toggleCellSelection(selected, cell.id));
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
              <Images size={19} />添加图片
            </button>
            <button className="soft-button" disabled={busy} onClick={() => void readClipboard()}>
              <ClipboardPaste size={19} />读取剪贴板
            </button>
            <button
              className="primary-button"
              disabled={busy || !activeScreenshot || Boolean(activeScreenshot.demo)}
              onClick={() => void recognizeLoadedImage()}
            >
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
            <div className="screenshot-switcher">
              <div className="screenshot-switcher-heading">
                <span><Images size={16} />截图</span>
                <small>{screenshots.length} 张</small>
              </div>
              <div className="screenshot-tabs" aria-label="已添加截图">
                {screenshots.map((screenshot, index) => (
                  <div
                    className={`screenshot-tab${screenshot.id === activeScreenshotId ? " active" : ""}`}
                    key={screenshot.id}
                  >
                    <button
                      className="screenshot-tab-main"
                      disabled={busy}
                      onClick={() => switchScreenshot(screenshot.id)}
                      title={`切换到 ${screenshot.name}`}
                    >
                      {screenshot.demo || !screenshot.payload.data_url ? (
                        <span className="screenshot-thumb demo"><FileImage size={17} /></span>
                      ) : (
                        <img className="screenshot-thumb" src={screenshot.payload.data_url} alt="" />
                      )}
                      <span className="screenshot-tab-copy">
                        <strong>{index + 1}. {screenshot.name}</strong>
                        <small>{screenshot.analysis ? "已生成表格" : "等待识别"}</small>
                      </span>
                    </button>
                    <button
                      className="screenshot-tab-remove"
                      disabled={busy}
                      onClick={() => deleteScreenshot(screenshot.id)}
                      title={`移除 ${screenshot.name}`}
                      aria-label={`移除 ${screenshot.name}`}
                    ><X size={14} /></button>
                  </div>
                ))}
                {!screenshots.length && <span className="screenshot-tabs-empty">尚未添加截图</span>}
              </div>
            </div>
            <div className="rule-import-preview compact-preview">
              {activeScreenshot?.demo && analysis ? (
                <DemoScreenshotPreview spreadsheet={analysis.spreadsheet} name={activeScreenshot.name} />
              ) : activeScreenshot ? (
                <img src={analysis?.previewUrl || activeScreenshot.payload.data_url} alt={`${activeScreenshot.name}预览`} />
              ) : (
                <div className="ocr-empty-state"><FileImage size={36} /><strong>Excel 截图预览</strong></div>
              )}
            </div>
            <div className="cell-selection-toolbar">
              <div className="selection-targets" aria-label="单元格选择用途">
                <button
                  className={selectionTarget === "output" ? "active" : ""}
                  onClick={() => setSelectionTarget("output")}
                  title="每个 Excel 行只能选择一个输出列名单元格"
                ><Type size={16} />输出列名 <span>{outputSelection.size}</span></button>
                <button
                  className={selectionTarget === "data" ? "active" : ""}
                  onClick={() => setSelectionTarget("data")}
                  title="每个 Excel 行可以选择多个目标数据单元格"
                ><MapPin size={16} />目标数据 <span>{dataSelection.size}</span></button>
              </div>
              <button className="text-button" onClick={() => {
                setActiveSelection(selectionTarget, new Set());
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
            {suffixColumns.length > 0 && (
              <div className="data-suffix-prompt" role="group" aria-label="多目标数据列后缀">
                <div className="data-suffix-copy">
                  <AlertTriangle size={17} />
                  <span><strong>同一行选择了多个目标数据</strong>请为不同数据列填写互不相同的后缀；配对时会追加到输出列名后。</span>
                </div>
                <div className="data-suffix-fields">
                  {suffixColumns.map(({ columnIndex, label }) => (
                    <label key={columnIndex}>
                      <span>{label} 列后缀</span>
                      <input
                        value={activeColumnSuffixes[columnIndex] ?? ""}
                        onChange={(event) => updateDataColumnSuffix(columnIndex, event.target.value)}
                        placeholder="如：期末"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
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

export function resolveDetectedColumnLabel(
  columns: ReadonlyArray<Pick<DetectedSpreadsheet["columns"][number], "index" | "label">>,
  columnIndex: number,
): string {
  return columns.find((column) => column.index === columnIndex)?.label
    ?? numberToColumnLabel(columnIndex + 1);
}

function DemoScreenshotPreview({ spreadsheet, name }: { spreadsheet: DetectedSpreadsheet; name: string }) {
  return (
    <div className="demo-screenshot-preview" aria-label={`${name}示例预览`}>
      <div className="demo-sheet-title">{name}</div>
      <table>
        <thead>
          <tr><th />{spreadsheet.columns.map(({ label }) => <th key={label}>{label}</th>)}</tr>
        </thead>
        <tbody>
          {spreadsheet.rows.map((row) => (
            <tr key={row.number}>
              <th>{row.number}</th>
              {spreadsheet.cells[row.index].map((cell) => <td key={cell.id}>{cell.text}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function createBrowserDemoScreenshots(): ScreenshotWorkspaceItem<AnalysisResult>[] {
  const definitions = [
    {
      id: "demo-profit",
      name: "利润表截图",
      startRow: 1150,
      rows: [
        ["主营业务收入", "29,797,107.90", "31,832,207.15", "10,356,322.22", "11,116,521.97", "19,440,785.68", "20,715,685.18", "65.2%", "34.8%", "18,983,450.00", "10,813,657.90", "5,420,000.00", "4,936,322.22", "2,184,500.00", "1,623,240.00", "856,760.00"],
        ["其他业务收入", "240,000.00", "", "120,000.00", "", "120,000.00", "", "50.0%", "50.0%", "96,000.00", "72,000.00", "36,000.00", "24,000.00", "8,000.00", "3,000.00", "1,000.00"],
        ["营业成本", "31,832,207.15", "11,116,521.97", "9,856,210.33", "8,742,115.42", "21,975,996.82", "2,374,406.55", "69.0%", "31.0%", "16,824,330.00", "15,007,877.15", "6,923,400.00", "4,193,121.97", "2,810,040.00", "1,209,500.00", "721,630.00"],
        ["合计", "30,037,107.90", "42,948,729.12", "20,332,532.55", "19,858,637.39", "41,536,782.50", "23,090,091.73", "67.1%", "32.9%", "35,903,780.00", "25,893,535.05", "12,379,400.00", "9,153,444.19", "5,002,540.00", "2,835,740.00", "1,579,390.00"],
      ],
    },
    {
      id: "demo-balance",
      name: "资产负债表截图",
      startRow: 330,
      rows: [
        ["原材料", "918,944.37", "2,035,979.98", "0.00", "918,944.37", "2,035,979.98", "0.00", "1,117,035.61", "54.9%", "45.1%", "620,311.20", "298,633.17", "1,256,420.00", "779,559.98", "0.00", "0.00"],
        ["在产品", "", "0.00", "", "", "0.00", "0.00", "0.00", "0.0%", "0.0%", "", "", "0.00", "0.00", "0.00", "0.00"],
        ["库存商品", "1,116,084.44", "4,635,524.98", "0.00", "1,116,084.44", "4,635,524.98", "0.00", "3,519,440.54", "59.6%", "40.4%", "736,615.73", "379,468.71", "2,928,335.12", "1,707,189.86", "0.00", "0.00"],
        ["周转材料", "2,212.39", "0.00", "0.00", "2,212.39", "0.00", "0.00", "-2,212.39", "100.0%", "0.0%", "1,400.00", "812.39", "0.00", "0.00", "0.00", "0.00"],
      ],
    },
  ];

  return definitions.map((definition) => {
    const spreadsheet = createDemoSpreadsheet(definition.startRow, definition.rows);
    return {
      id: definition.id,
      name: definition.name,
      payload: { path: definition.name, data_url: "", size_bytes: 0 },
      analysis: {
        spreadsheet,
        previewUrl: "",
        ocrItemCount: spreadsheet.cells.flat().length,
      },
      outputSelection: new Set([`A${definition.startRow}`, `A${definition.startRow + 1}`]),
      dataSelection: new Set([
        `B${definition.startRow}`,
        `C${definition.startRow}`,
        `B${definition.startRow + 1}`,
        `C${definition.startRow + 1}`,
      ]),
      demo: true,
    };
  });
}

function createDemoSpreadsheet(startRow: number, values: string[][]): DetectedSpreadsheet {
  const columnCount = Math.max(1, ...values.map((row) => row.length));
  const labels = Array.from({ length: columnCount }, (_, index) => numberToColumnLabel(index + 1));
  const columns = labels.map((label, index) => ({
    label,
    index,
    center: 90 + index * 180,
    start: index * 180,
    end: (index + 1) * 180,
  }));
  const rows = values.map((_, index) => ({
    number: startRow + index,
    index,
    center: 21 + index * 42,
    start: index * 42,
    end: (index + 1) * 42,
  }));
  const cells = rows.map((row) => columns.map((column) => {
    const address = `${column.label}${row.number}`;
    return {
      id: address,
      address,
      rowIndex: row.index,
      columnIndex: column.index,
      rowNumber: row.number,
      columnLabel: column.label,
      text: values[row.index][column.index] ?? "",
      confidence: 0.99,
      bounds: {
        x: column.start,
        y: row.start,
        width: column.end - column.start,
        height: row.end - row.start,
      },
    };
  }));
  return { columns, rows, cells, warnings: [] };
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
