<script setup lang="ts">
import { computed, ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { AlertTriangle, ClipboardPaste, FileImage, Images, MapPin, Plus, ScanSearch, Trash2, Type, X } from "@lucide/vue";
import { browserPreviewMessage, isTauriRuntime } from "./browserPreview";
import { buildRowSelectionPairs, createCandidateRuleRow, fillCandidatePairValues, fillCandidateValues, getSelectedCells, selectCellRange, selectSingleColumnRange, toggleCellSelection, toggleSingleCellPerRow, type CandidateRuleRow } from "./ruleImageSelection";
import { appendScreenshotItems, removeScreenshotItem, updateScreenshotItem, type ScreenshotWorkspaceItem } from "./ruleImageWorkspace";
import { analyzeSpreadsheetImage, createBrowserDemoScreenshots, resolveDetectedColumnLabel, type AnalysisResult } from "./spreadsheetImageAnalysis";
import type { DetectedSpreadsheetCell } from "./spreadsheetScreenshot";
import type { ImagePayload, OcrImageResult, Rule, SheetMode } from "./types";

const props = defineProps<{ onClose: () => void; onAppend: (rules: Rule[]) => void }>();
type SelectionTarget = "output" | "data";
const browserPreview = !isTauriRuntime();
let screenshotSequence = 0;
const initialScreenshots = browserPreview ? createBrowserDemoScreenshots() : [];
const screenshots = ref<ScreenshotWorkspaceItem<AnalysisResult>[]>(initialScreenshots);
const activeScreenshotId = ref<string | null>(initialScreenshots[0]?.id ?? null);
const candidates = ref<CandidateRuleRow[]>([createCandidateRuleRow(), createCandidateRuleRow(), createCandidateRuleRow()]);
const activeCandidateId = ref(candidates.value[0].id);
const selectionTarget = ref<SelectionTarget>("output");
const dataColumnSuffixes = ref<Record<string, Record<number, string>>>({});
const overwrite = ref(false);
const sheetMode = ref<SheetMode>("contains");
const sheetValue = ref("");
const busy = ref(false);
const status = ref(browserPreview ? "已载入两张示例截图；点击缩略图可切换预览表格。" : "可一次添加多张图片或继续读取剪贴板；选择截图后点击“识别图片”。");
const error = ref("");
const isClosing = ref(false);
const isDragging = ref(false);
let dragState: { startId: string; target: SelectionTarget; moved: boolean } | null = null;

const activeScreenshot = computed(() => screenshots.value.find(({ id }) => id === activeScreenshotId.value) ?? null);
const analysis = computed(() => activeScreenshot.value?.analysis ?? null);
const outputSelection = computed(() => activeScreenshot.value?.outputSelection ?? new Set<string>());
const dataSelection = computed(() => activeScreenshot.value?.dataSelection ?? new Set<string>());
const cells = computed(() => analysis.value?.spreadsheet.cells.flat() ?? []);
const selectedOutputCells = computed(() => getSelectedCells(cells.value, outputSelection.value));
const selectedDataCells = computed(() => getSelectedCells(cells.value, dataSelection.value));
const activeColumnSuffixes = computed(() => activeScreenshotId.value ? dataColumnSuffixes.value[activeScreenshotId.value] ?? {} : {});
const rowSelectionPairs = computed(() => buildRowSelectionPairs(selectedOutputCells.value, selectedDataCells.value, activeColumnSuffixes.value));
const suffixColumns = computed(() => rowSelectionPairs.value.suffixColumnIndexes.map((columnIndex) => ({ columnIndex, label: resolveDetectedColumnLabel(analysis.value?.spreadsheet.columns ?? [], columnIndex) })));

function loadPayloads(payloads: ImagePayload[], source: string) {
  if (!payloads.length) return;
  const result = appendScreenshotItems(screenshots.value, payloads, () => `screenshot-${Date.now()}-${screenshotSequence += 1}`);
  screenshots.value = result.items; activeScreenshotId.value = result.activeId; error.value = "";
  status.value = `已追加 ${payloads.length} 张${source}，共 ${result.items.length} 张；请选择截图后点击“识别图片”。`;
}
async function selectImage() {
  if (browserPreview) { error.value = browserPreviewMessage; return; }
  error.value = "";
  try {
    const selected = await open({ multiple: true, title: "选择一张或多张包含 Excel 行号和列字母的截图", filters: [{ name: "图片", extensions: ["png", "jpg", "jpeg", "bmp", "webp", "tif", "tiff"] }] });
    const paths = typeof selected === "string" ? [selected] : selected ?? [];
    if (!paths.length) return;
    busy.value = true; loadPayloads(await Promise.all(paths.map((path) => invoke<ImagePayload>("read_image_file", { path }))), "所选图片");
  } catch (reason) { error.value = String(reason); } finally { busy.value = false; }
}
async function readClipboard() {
  if (browserPreview) { error.value = browserPreviewMessage; return; }
  error.value = ""; busy.value = true;
  try { const payload = await invoke<ImagePayload | null>("read_clipboard_image"); if (!payload) { error.value = "剪贴板中没有图片，请先复制 Excel 截图。"; return; } loadPayloads([payload], "剪贴板图片"); }
  catch (reason) { error.value = String(reason); } finally { busy.value = false; }
}
async function recognizeLoadedImage() {
  const active = activeScreenshot.value;
  if (!active) { error.value = "请先选择图片文件或读取剪贴板图片。 "; return; }
  if (browserPreview || active.demo) { error.value = browserPreviewMessage; return; }
  const id = active.id; busy.value = true; error.value = "";
  screenshots.value = updateScreenshotItem(screenshots.value, id, (item) => ({ ...item, analysis: null, outputSelection: new Set(), dataSelection: new Set() }));
  dataColumnSuffixes.value = { ...dataColumnSuffixes.value, [id]: {} }; status.value = "正在分区识别图片并重建 Excel 单元格...";
  try {
    const result = await analyzeSpreadsheetImage(active.payload.data_url, (imageBase64) => invoke<OcrImageResult>("ocr_image_base64", { imageBase64 }));
    screenshots.value = updateScreenshotItem(screenshots.value, id, (item) => ({ ...item, analysis: result }));
    const spreadsheet = result.spreadsheet;
    if (!spreadsheet.cells.length) error.value = spreadsheet.warnings.join("；") || "未能重建表格，请确认截图包含 Excel 行号和列字母。";
    status.value = spreadsheet.cells.length ? `已识别 ${spreadsheet.rows.length} 行、${spreadsheet.columns.length} 列，共 ${spreadsheet.cells.flat().length} 个可选单元格。` : `OCR 返回 ${result.ocrItemCount} 个文本块，但没有形成可定位的 Excel 表格。`;
  } catch (reason) { error.value = String(reason); status.value = "图片识别失败，可调整截图后重新点击“识别图片”。"; }
  finally { busy.value = false; }
}
function switchScreenshot(id: string) {
  const screenshot = screenshots.value.find((item) => item.id === id); if (!screenshot) return;
  activeScreenshotId.value = id; error.value = ""; status.value = screenshot.analysis ? `已切换到“${screenshot.name}”，该截图已有可选表格。` : `已切换到“${screenshot.name}”，请点击“识别图片”。`;
}
function deleteScreenshot(id: string) {
  const result = removeScreenshotItem(screenshots.value, id, activeScreenshotId.value); screenshots.value = result.items; activeScreenshotId.value = result.activeId;
  const next = { ...dataColumnSuffixes.value }; delete next[id]; dataColumnSuffixes.value = next; error.value = "";
  status.value = result.items.length ? `已移除截图，剩余 ${result.items.length} 张。` : "请添加截图或读取剪贴板图片。";
}
function setActiveSelection(target: SelectionTarget, update: Set<string> | ((selected: Set<string>) => Set<string>)) {
  const id = activeScreenshotId.value; if (!id) return;
  screenshots.value = updateScreenshotItem(screenshots.value, id, (item) => {
    const current = target === "output" ? item.outputSelection : item.dataSelection;
    const next = typeof update === "function" ? update(current) : update;
    return target === "output" ? { ...item, outputSelection: next } : { ...item, dataSelection: next };
  });
}
function updateCandidate(id: string, patch: Partial<CandidateRuleRow>) { candidates.value = candidates.value.map((row) => row.id === id ? { ...row, ...patch } : row); }
function updateDataColumnSuffix(columnIndex: number, value: string) { const id = activeScreenshotId.value; if (!id) return; dataColumnSuffixes.value = { ...dataColumnSuffixes.value, [id]: { ...(dataColumnSuffixes.value[id] ?? {}), [columnIndex]: value } }; }
function addCandidate() { const row = createCandidateRuleRow(); candidates.value = [...candidates.value, row]; activeCandidateId.value = row.id; }
function deleteActiveCandidate() { const remaining = candidates.value.filter(({ id }) => id !== activeCandidateId.value); candidates.value = remaining.length ? remaining : [createCandidateRuleRow()]; activeCandidateId.value = candidates.value[0].id; }
function applyOutputSelection() {
  const values = selectedOutputCells.value.map(({ text }) => text).filter(Boolean); if (!values.length) { error.value = "请先切换到“输出列名”，选择至少一个包含文字的单元格。 "; return; }
  const result = fillCandidateValues(candidates.value, activeCandidateId.value, values, "outputColumn", overwrite.value); candidates.value = result.rows; error.value = ""; status.value = `已从活动规则行开始填入 ${result.filled} 个输出列名。`;
}
function applyDataSelection() {
  if (!selectedDataCells.value.length) { error.value = "请先切换到“目标数据”，选择至少一个单元格。 "; return; }
  const result = fillCandidateValues(candidates.value, activeCandidateId.value, selectedDataCells.value.map(({ address }) => address), "cell", overwrite.value); candidates.value = result.rows; error.value = ""; status.value = `已从活动规则行开始填入 ${result.filled} 个目标坐标。`;
}
function applyPairedSelection() {
  const outputs = selectedOutputCells.value.filter(({ text }) => text.trim()); const data = selectedDataCells.value;
  if (!outputs.length || !data.length) { error.value = "请分别选择输出列名单元格和目标数据单元格。 "; return; }
  const result = buildRowSelectionPairs(outputs, data, activeColumnSuffixes.value);
  if (result.missingOutputRowIndexes.length) { const rows = result.missingOutputRowIndexes.map((rowIndex) => analysis.value?.spreadsheet.rows.find((row) => row.index === rowIndex)?.number ?? rowIndex + 1); error.value = `第 ${rows.join("、")} 行已选择目标数据，但没有选择输出列名。`; return; }
  const dataRows = new Set(data.map(({ rowIndex }) => rowIndex)); const outputOnlyRows = outputs.filter(({ rowIndex }) => !dataRows.has(rowIndex)).map(({ rowIndex }) => analysis.value?.spreadsheet.rows.find((row) => row.index === rowIndex)?.number ?? rowIndex + 1);
  if (outputOnlyRows.length) { error.value = `第 ${outputOnlyRows.join("、")} 行已选择输出列名，但没有选择目标数据。`; return; }
  if (result.missingSuffixColumnIndexes.length) { error.value = `同一行包含多个目标数据，请先填写 ${result.missingSuffixColumnIndexes.map((index) => resolveDetectedColumnLabel(analysis.value?.spreadsheet.columns ?? [], index)).join("、")} 列的区别后缀。`; return; }
  if (result.duplicateSuffixes.length) { error.value = `数据列后缀不能重复：${result.duplicateSuffixes.join("、")}。请为不同列填写不同后缀。`; return; }
  const filled = fillCandidatePairValues(candidates.value, activeCandidateId.value, result.pairs, overwrite.value); candidates.value = filled.rows; error.value = ""; status.value = `已按行配对填入 ${filled.filled} 条候选规则。`;
}
function handleCellPointerDown(event: PointerEvent, cell: DetectedSpreadsheetCell) { event.preventDefault(); dragState = { startId: cell.id, target: selectionTarget.value, moved: false }; isDragging.value = true; }
function handleCellPointerEnter(event: PointerEvent, cell: DetectedSpreadsheetCell) { const drag = dragState; if (!drag || event.buttons !== 1) return; if (drag.startId !== cell.id) drag.moved = true; setActiveSelection(drag.target, drag.target === "output" ? selectSingleColumnRange(cells.value, drag.startId, cell.id) : selectCellRange(cells.value, drag.startId, cell.id)); }
function handleCellPointerUp(cell: DetectedSpreadsheetCell) { const drag = dragState; if (!drag) return; if (!drag.moved) setActiveSelection(drag.target, (selected) => drag.target === "output" ? toggleSingleCellPerRow(selected, cell.id, cells.value) : toggleCellSelection(selected, cell.id)); stopDragging(); }
function stopDragging() { dragState = null; isDragging.value = false; }
function requestClose() { if (isClosing.value) return; if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { props.onClose(); return; } isClosing.value = true; }
function finishCloseAnimation(event: AnimationEvent) { if (isClosing.value && event.target === event.currentTarget) props.onClose(); }
function confirmImport() {
  error.value = ""; const trimmed = sheetValue.value.trim();
  if (!trimmed) { error.value = "请填写 Sheet 值；图片识别只负责定位表头和单元格坐标。 "; return; }
  if (sheetMode.value === "index" && (!/^\d+$/.test(trimmed) || Number(trimmed) < 1)) { error.value = "按序号定位时，Sheet 值必须是大于 0 的整数。 "; return; }
  const used = candidates.value.filter(({ outputColumn, cell }) => outputColumn.trim() || cell.trim()); if (!used.length) { error.value = "请先填写或识别至少一条候选规则。 "; return; }
  const invalid = used.find(({ outputColumn, cell }) => !outputColumn.trim() || !/^[A-Z]{1,3}[1-9]\d{0,6}$/i.test(cell.trim())); if (invalid) { error.value = `请补全“${invalid.outputColumn || "未命名规则"}”的输出列名和有效单元格坐标。`; return; }
  props.onAppend(used.map(({ outputColumn, cell }) => ({ output_column: outputColumn.trim(), sheet_mode: sheetMode.value, sheet_value: trimmed, cell: cell.trim().toUpperCase() }))); requestClose();
}
</script>

<template>
  <div :class="`modal-backdrop rule-import-backdrop${isClosing ? ' is-closing' : ''}`" role="presentation" @animationend="finishCloseAnimation">
    <div class="rule-import-modal" role="dialog" aria-modal="true" aria-labelledby="rule-import-title">
      <header class="rule-import-heading"><div><p class="eyebrow">图片定位规则</p><h3 id="rule-import-title">从 Excel 截图选择单元格</h3><p>识别全部可见单元格，再点击或拖动选择输出列名和目标数据。</p></div><button class="icon-button" title="关闭" @click="requestClose"><X :size="20" /></button></header>
      <div class="rule-import-command-bar">
        <div class="rule-import-source-actions"><button class="soft-button" :disabled="busy" @click="selectImage"><Images :size="19" />添加图片</button><button class="soft-button" :disabled="busy" @click="readClipboard"><ClipboardPaste :size="19" />读取剪贴板</button><button class="primary-button" :disabled="busy || !activeScreenshot || Boolean(activeScreenshot.demo)" @click="recognizeLoadedImage"><ScanSearch :size="19" />{{ busy ? "识别中" : "识别图片" }}</button></div>
        <label class="rule-import-mode-control"><span>Sheet 模式</span><select v-model="sheetMode"><option value="exact">exact - 精确匹配</option><option value="contains">contains - 包含关键词</option><option value="index">index - 按序号</option></select></label>
        <label class="rule-import-sheet-value"><span>Sheet 值</span><input v-model="sheetValue" placeholder="人工填写 Sheet 名、关键词或序号" /></label>
      </div>
      <div class="rule-import-status" role="status"><ScanSearch :size="18" /><span>{{ status }}</span></div>
      <div v-if="error" class="inline-error"><AlertTriangle :size="18" />{{ error }}</div>
      <div class="rule-import-workspace spreadsheet-import-workspace">
        <section class="spreadsheet-detection-panel">
          <div class="screenshot-switcher"><div class="screenshot-switcher-heading"><span><Images :size="16" />截图</span><small>{{ screenshots.length }} 张</small></div><div class="screenshot-tabs" aria-label="已添加截图">
            <div v-for="(screenshot, index) in screenshots" :key="screenshot.id" :class="`screenshot-tab${screenshot.id === activeScreenshotId ? ' active' : ''}`"><button class="screenshot-tab-main" :disabled="busy" :title="`切换到 ${screenshot.name}`" @click="switchScreenshot(screenshot.id)"><span v-if="screenshot.demo || !screenshot.payload.data_url" class="screenshot-thumb demo"><FileImage :size="17" /></span><img v-else class="screenshot-thumb" :src="screenshot.payload.data_url" alt="" /><span class="screenshot-tab-copy"><strong>{{ index + 1 }}. {{ screenshot.name }}</strong><small>{{ screenshot.analysis ? "已生成表格" : "等待识别" }}</small></span></button><button class="screenshot-tab-remove" :disabled="busy" :title="`移除 ${screenshot.name}`" :aria-label="`移除 ${screenshot.name}`" @click="deleteScreenshot(screenshot.id)"><X :size="14" /></button></div>
            <span v-if="!screenshots.length" class="screenshot-tabs-empty">尚未添加截图</span>
          </div></div>
          <div class="rule-import-preview compact-preview">
            <div v-if="activeScreenshot?.demo && analysis" class="demo-screenshot-preview" :aria-label="`${activeScreenshot.name}示例预览`"><div class="demo-sheet-title">{{ activeScreenshot.name }}</div><table><thead><tr><th /><th v-for="column in analysis.spreadsheet.columns" :key="column.label">{{ column.label }}</th></tr></thead><tbody><tr v-for="row in analysis.spreadsheet.rows" :key="row.number"><th>{{ row.number }}</th><td v-for="cell in analysis.spreadsheet.cells[row.index]" :key="cell.id">{{ cell.text }}</td></tr></tbody></table></div>
            <img v-else-if="activeScreenshot" :src="analysis?.previewUrl || activeScreenshot.payload.data_url" :alt="`${activeScreenshot.name}预览`" /><div v-else class="ocr-empty-state"><FileImage :size="36" /><strong>Excel 截图预览</strong></div>
          </div>
          <div class="cell-selection-toolbar"><div class="selection-targets" aria-label="单元格选择用途"><button :class="selectionTarget === 'output' ? 'active' : ''" title="每个 Excel 行只能选择一个输出列名单元格" @click="selectionTarget = 'output'"><Type :size="16" />输出列名 <span>{{ outputSelection.size }}</span></button><button :class="selectionTarget === 'data' ? 'active' : ''" title="每个 Excel 行可以选择多个目标数据单元格" @click="selectionTarget = 'data'"><MapPin :size="16" />目标数据 <span>{{ dataSelection.size }}</span></button></div><button class="text-button" @click="setActiveSelection(selectionTarget, new Set())">清除当前选择</button></div>
          <div class="detected-sheet-wrap">
            <table v-if="analysis?.spreadsheet.cells.length" :class="`detected-sheet${isDragging ? ' is-dragging' : ''}`" @pointerleave="stopDragging" @pointercancel="stopDragging"><thead><tr><th class="sheet-corner" /><th v-for="column in analysis.spreadsheet.columns" :key="column.label">{{ column.label }}</th></tr></thead><tbody><tr v-for="row in analysis.spreadsheet.rows" :key="row.number"><th>{{ row.number }}</th><td v-for="cell in analysis.spreadsheet.cells[row.index]" :key="cell.id" :class="[outputSelection.has(cell.id) && 'output-selected', dataSelection.has(cell.id) && 'data-selected'].filter(Boolean).join(' ')" :title="`${cell.address}${cell.text ? ` · ${cell.text}` : ''}`" @pointerdown="handleCellPointerDown($event, cell)" @pointerenter="handleCellPointerEnter($event, cell)" @pointerup="handleCellPointerUp(cell)"><span>{{ cell.text || " " }}</span><small>{{ cell.address }}</small></td></tr></tbody></table>
            <div v-else class="candidate-empty">加载图片后点击“识别图片”，这里会生成可点击、可拖选的单元格表格。</div>
          </div>
        </section>
        <section class="candidate-list rule-candidate-editor">
          <div class="candidate-list-heading"><div><span>候选规则</span><small>点击规则行设置填充起点</small></div><small>{{ candidates.length }} 条</small></div>
          <div class="candidate-editor-actions"><button class="soft-button" @click="addCandidate"><Plus :size="16" />添加规则</button><button class="danger-button" @click="deleteActiveCandidate"><Trash2 :size="16" />删除当前</button><label class="overwrite-toggle"><input v-model="overwrite" type="checkbox" />覆盖已有内容</label></div>
          <div v-if="suffixColumns.length" class="data-suffix-prompt" role="group" aria-label="多目标数据列后缀"><div class="data-suffix-copy"><AlertTriangle :size="17" /><span><strong>同一行选择了多个目标数据</strong>请为不同数据列填写互不相同的后缀；配对时会追加到输出列名后。</span></div><div class="data-suffix-fields"><label v-for="item in suffixColumns" :key="item.columnIndex"><span>{{ item.label }} 列后缀</span><input :value="activeColumnSuffixes[item.columnIndex] ?? ''" placeholder="如：期末" @input="updateDataColumnSuffix(item.columnIndex, ($event.target as HTMLInputElement).value)" /></label></div></div>
          <div class="candidate-fill-actions"><button class="soft-button" @click="applyOutputSelection">仅填列名</button><button class="soft-button" @click="applyDataSelection">仅填坐标</button><button class="primary-button" @click="applyPairedSelection">配对填充</button></div>
          <div class="candidate-editor-body"><div v-for="(candidate, index) in candidates" :key="candidate.id" :class="`candidate-row editable${candidate.id === activeCandidateId ? ' active' : ''}`" @click="activeCandidateId = candidate.id"><span class="candidate-index">{{ index + 1 }}</span><label><span>输出列名</span><input :value="candidate.outputColumn" @input="updateCandidate(candidate.id, { outputColumn: ($event.target as HTMLInputElement).value })" /></label><label class="candidate-cell"><span>目标单元格</span><input :value="candidate.cell" placeholder="如 B1150" @input="updateCandidate(candidate.id, { cell: ($event.target as HTMLInputElement).value.toUpperCase() })" /></label></div></div>
        </section>
      </div>
      <footer class="modal-actions"><button class="soft-button" @click="requestClose">取消</button><button class="primary-button" :disabled="busy" @click="confirmImport">追加到规则配置</button></footer>
    </div>
  </div>
</template>
