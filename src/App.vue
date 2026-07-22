<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { ElButton, ElConfigProvider } from "element-plus";
import zhCn from "element-plus/es/locale/lang/zh-cn";
import "element-plus/es/components/button/style/css";
import { invoke } from "@tauri-apps/api/core";
import { emitTo, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { confirm, message, save } from "@tauri-apps/plugin-dialog";
import { BookOpen, ChevronLeft, ChevronRight, FileSpreadsheet, FolderOpen, GripVertical, Info, Plus, Rocket, Save, ScanSearch, Search, Trash2 } from "@lucide/vue";
import type { CurrentFileEvent, FilterMode, LogEvent, OcrRuntimeStatus, OcrTabKey, ProgressEvent, Rule, Scheme, SheetChoice, SheetConflict, SheetMode, SummaryRequest, SummaryResult, SummaryTabKey, WorkspaceKey } from "./types";
import { getBrandSubtitle } from "./brandContent";
import { getFileDisplayName } from "./fileDisplay";
import { getRuleRowKey } from "./ruleKeys";
import { findRuleDragTarget, getRuleDragOriginStyle, getRuleDragOverlayLeft, getRuleDragOverlayTop, getRuleDragShift } from "./ruleDragPreview";
import { reorderRules } from "./ruleOrdering";
import { getSchemePage } from "./schemePaging";
import { getSummaryCompletionPrompt } from "./summaryPrompt";
import { estimateRemainingSeconds, estimateSummarySeconds, formatSummaryDuration } from "./summaryEstimate";
import { browserPreviewMessage, isTauriRuntime } from "./browserPreview";
import SupportWindowContent from "./SupportWindowContent.vue";
import AboutPage from "./AboutPage.vue";
import OcrPage from "./OcrPage.vue";
import OcrSettingsPage from "./OcrSettingsPage.vue";
import RuleImageImporter from "./RuleImageImporter.vue";
import SourcePickerModal from "./SourcePickerModal.vue";
import TextCleanerPage from "./TextCleanerPage.vue";
import { ocrTabs, summaryTabs, workspacePages } from "./navigation";
import { isWorkspaceKey, getSupportViewFromSearch, getSupportWindowConfig, type SupportView } from "./supportWindows";
import { useAppNavigationStore } from "./stores/appNavigation";

const emptyRule: Rule = { output_column: "", sheet_mode: "exact", sheet_value: "", cell: "" };
const sampleRules: Rule[] = [
  { output_column: "货币资金", sheet_mode: "exact", sheet_value: "资产负债表", cell: "B7" },
  { output_column: "营业收入", sheet_mode: "contains", sheet_value: "利润", cell: "C12" },
  { output_column: "第一个 Sheet 样例", sheet_mode: "index", sheet_value: "1", cell: "A1" },
];
const brandSubtitle = getBrandSubtitle();
const supportView = getSupportViewFromSearch(window.location.search);
const browserPreview = !isTauriRuntime();
let ocrStartupPromise: Promise<OcrRuntimeStatus> | null = null;
let unlisteners: UnlistenFn[] = [];
let ruleRowCenters: number[] = [];
let activeRulePointerId: number | null = null;

interface RuleDragOverlayState {
  left: number;
  top: number;
  width: number;
  height: number;
  grabOffsetX: number;
  grabOffsetY: number;
  columns: string;
}

const navigationStore = useAppNavigationStore();
const { activeWorkspace, activeSummaryTab, activeOcrTab } = storeToRefs(navigationStore);
const schemes = ref<Scheme[]>([]);
const selectedScheme = ref("");
const loadedSchemeName = ref("");
const schemeName = ref("");
const schemeNameInput = ref<HTMLInputElement | null>(null);
const targetPath = ref("");
const targetPaths = ref<string[]>([]);
const sourcePickerPaths = ref<string[]>([]);
const outputFile = ref("");
const keyword = ref("");
const filterMode = ref<FilterMode>("include");
const rules = ref<Rule[]>(sampleRules.map((rule) => ({ ...rule })));
const selectedRuleIndex = ref<number | null>(null);
const draggedRuleIndex = ref<number | null>(null);
const dragOverRuleIndex = ref<number | null>(null);
const ruleDragOverlay = ref<RuleDragOverlayState | null>(null);
const logs = ref<string[]>([]);
const currentFile = ref("-");
const processed = ref(0);
const total = ref(0);
const running = ref(false);
const taskStartedAt = ref<number | null>(null);
const taskEstimatedSeconds = ref<number | null>(null);
const taskRemainingSeconds = ref<number | null>(null);
const taskActualSeconds = ref<number | null>(null);
const sheetConflicts = ref<SheetConflict[]>([]);
const selectedSheets = ref<Record<string, string>>({});
const pendingRequest = ref<SummaryRequest | null>(null);
const showRuleImageImporter = ref(false);
const schemeQuery = ref("");
const schemePage = ref(1);
const showSourcePicker = ref(false);

const activeTitle = computed(() => activeWorkspace.value === "summary"
  ? summaryTabs.find((tab) => tab.key === activeSummaryTab.value)?.label ?? ""
  : activeWorkspace.value === "ocr"
    ? ocrTabs.find((tab) => tab.key === activeOcrTab.value)?.label ?? ""
    : workspacePages.find((page) => page.key === activeWorkspace.value)?.label ?? "");
const activeKicker = computed(() => activeWorkspace.value === "summary" ? "汇总功能" : activeWorkspace.value === "ocr" ? "OCR 工具" : activeWorkspace.value === "text-cleaner" ? "剪贴板工具" : "应用信息");
const contentKey = computed(() => `${activeWorkspace.value}-${activeWorkspace.value === "summary" ? activeSummaryTab.value : activeWorkspace.value === "ocr" ? activeOcrTab.value : activeWorkspace.value}`);
const percent = computed(() => total.value > 0 ? Math.round((processed.value / total.value) * 100) : 0);
const selectedSchemeData = computed(() => schemes.value.find((scheme) => scheme.name === selectedScheme.value));
const loadedSchemeData = computed(() => schemes.value.find((scheme) => scheme.name === loadedSchemeName.value));
const draggedRuleData = computed(() => draggedRuleIndex.value === null ? null : rules.value[draggedRuleIndex.value] ?? null);
const schemePageData = computed(() => getSchemePage(schemes.value, schemeQuery.value, schemePage.value));
const sourceSelectionText = computed(() => {
  if (targetPaths.value.length === 1) return targetPaths.value[0];
  if (targetPaths.value.length > 1) return `已选择 ${targetPaths.value.length} 个文件/文件夹：${targetPaths.value.map((path) => getFileDisplayName(path)).join("、")}`;
  return targetPath.value || "尚未选择目标文件或文件夹";
});
const sourceSelectionTitle = computed(() => targetPaths.value.length ? targetPaths.value.join("\n") : targetPath.value);
const taskEstimateText = computed(() => {
  if (!running.value) return taskActualSeconds.value === null
    ? "本次预计：启动后计算"
    : `本次用时：${formatSummaryDuration(taskActualSeconds.value)}`;
  if (total.value <= 0 || taskEstimatedSeconds.value === null) return "本次预计：正在计算";
  const totalEstimate = formatSummaryDuration(taskEstimatedSeconds.value);
  const remaining = taskRemainingSeconds.value === null ? "计算中" : formatSummaryDuration(taskRemainingSeconds.value);
  return `本次预计：${totalEstimate} · 剩余约 ${remaining}`;
});

watch(() => schemePageData.value.currentPage, (page) => { schemePage.value = page; });

function getSheetConflictKey(conflict: SheetConflict) { return `${conflict.file_path}::${conflict.rule_index}`; }
function buildSheetChoices(conflicts: SheetConflict[], selections: Record<string, string>): SheetChoice[] {
  return conflicts.map((conflict) => ({ file_path: conflict.file_path, rule_index: conflict.rule_index, sheet_name: selections[getSheetConflictKey(conflict)] ?? conflict.matched_sheets[0] }));
}
function initializeOcrAtStartup() {
  if (browserPreview) return Promise.resolve<OcrRuntimeStatus>({ version: "浏览器预览", bundled: false, prepared: false, message: "浏览器预览不加载本地 Umi-OCR 组件。" });
  ocrStartupPromise ??= invoke<OcrRuntimeStatus>("prepare_ocr_runtime");
  return ocrStartupPromise;
}
function appendLog(level: LogEvent["level"], text: string) {
  const time = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  logs.value.push(`[${time}] [${level}] ${text}`);
}
async function refreshSchemes() {
  if (browserPreview) return;
  try { schemes.value = await invoke<Scheme[]>("load_schemes"); }
  catch (error) { appendLog("WARN", String(error)); }
}
function collectScheme(): Scheme {
  return { name: schemeName.value, updated_at: loadedSchemeData.value?.updated_at ?? "", target_folder: targetPath.value, target_paths: [...targetPaths.value], output_file: outputFile.value, keyword: keyword.value, filter_mode: filterMode.value, rules: rules.value };
}
function formatSchemeSavedAt(value: string) {
  if (!value) return "未记录保存时间";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未记录保存时间";
  return date.toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
}
async function confirmAction(text: string, title: string) {
  return browserPreview ? window.confirm(text) : confirm(text, { title, kind: "warning" });
}
function createNewScheme() {
  selectedScheme.value = ""; loadedSchemeName.value = ""; schemeName.value = ""; targetPath.value = ""; targetPaths.value = []; outputFile.value = "";
  keyword.value = ""; filterMode.value = "include"; rules.value = [{ ...emptyRule }]; selectedRuleIndex.value = 0;
  appendLog("INFO", "已新建空白方案，请输入名称并完成配置。");
  void nextTick(() => schemeNameInput.value?.focus());
}
async function saveCurrentScheme() {
  const scheme = collectScheme();
  scheme.name = scheme.name.trim();
  if (!scheme.name) {
    if (browserPreview) window.alert("请先输入当前方案名称。");
    else await message("请先输入当前方案名称。", { title: "方案名称为空", kind: "warning" });
    return;
  }
  const previousName = loadedSchemeName.value.trim();
  const renamed = Boolean(previousName && previousName !== scheme.name);
  if (renamed && !await confirmAction(`方案名称已从“${previousName}”更改为“${scheme.name}”，确认修改并保存？`, "确认修改方案名称")) return;
  const overwritesAnother = schemes.value.some((item) => item.name === scheme.name) && previousName !== scheme.name;
  if (overwritesAnother && !await confirmAction(`已存在方案“${scheme.name}”，确认覆盖？`, "确认覆盖方案")) return;
  if (browserPreview) {
    const savedScheme = { ...scheme, updated_at: new Date().toISOString() };
    schemes.value = [...schemes.value.filter((item) => item.name !== scheme.name && item.name !== previousName), savedScheme];
    selectedScheme.value = scheme.name; loadedSchemeName.value = scheme.name; schemeQuery.value = ""; schemePage.value = 1;
    appendLog("INFO", `浏览器预览已暂存方案：${scheme.name}`); return;
  }
  try {
    await invoke("save_scheme", { scheme, previousName: previousName || null }); appendLog("DONE", renamed ? `方案已重命名并保存：${previousName} → ${scheme.name}` : `方案已保存：${scheme.name}`);
    await refreshSchemes(); selectedScheme.value = scheme.name; loadedSchemeName.value = scheme.name; schemeQuery.value = ""; schemePage.value = 1;
  } catch (error) { await message(String(error), { title: "保存方案失败", kind: "error" }); }
}
function applyScheme(scheme: Scheme) {
  selectedScheme.value = scheme.name; loadedSchemeName.value = scheme.name; schemeName.value = scheme.name; targetPath.value = scheme.target_folder; targetPaths.value = [...(scheme.target_paths ?? [])];
  outputFile.value = scheme.output_file; keyword.value = scheme.keyword; filterMode.value = scheme.filter_mode;
  rules.value = (scheme.rules.length ? scheme.rules : [emptyRule]).map((rule) => ({ ...rule }));
  appendLog("INFO", `已载入方案：${scheme.name}`);
}
function loadSelectedScheme() { if (selectedSchemeData.value) applyScheme(selectedSchemeData.value); }
async function deleteSelectedScheme() {
  if (!selectedScheme.value) return;
  const name = selectedScheme.value;
  if (browserPreview) { schemes.value = schemes.value.filter((scheme) => scheme.name !== name); selectedScheme.value = ""; if (loadedSchemeName.value === name) loadedSchemeName.value = ""; appendLog("INFO", `浏览器预览已移除方案：${name}`); return; }
  if (!await confirm(`确认删除方案“${name}”？`, { title: "删除方案", kind: "warning" })) return;
  await invoke("delete_scheme", { name }); appendLog("DONE", `方案已删除：${name}`); selectedScheme.value = ""; if (loadedSchemeName.value === name) loadedSchemeName.value = ""; await refreshSchemes();
}
function openSourcePicker() {
  sourcePickerPaths.value = targetPaths.value.length ? [...targetPaths.value] : targetPath.value ? [targetPath.value] : [];
  showSourcePicker.value = true;
}
function confirmSourcePicker(paths: string[]) {
  targetPaths.value = [...paths];
  targetPath.value = "";
  showSourcePicker.value = false;
}
async function browseOutputFile() {
  if (browserPreview) { window.alert(browserPreviewMessage); return; }
  const selected = await save({ title: "选择汇总结果输出路径", defaultPath: "汇总结果.xlsx", filters: [{ name: "Excel 工作簿", extensions: ["xlsx"] }] });
  if (typeof selected === "string") outputFile.value = selected;
}
function updateRule(index: number, patch: Partial<Rule>) { rules.value[index] = { ...rules.value[index], ...patch }; }
function addRule() { rules.value.push({ ...emptyRule }); selectedRuleIndex.value = rules.value.length - 1; }
function deleteSelectedRule() { if (selectedRuleIndex.value === null) return; rules.value.splice(selectedRuleIndex.value, 1); selectedRuleIndex.value = null; }
function appendImportedRules(importedRules: Rule[]) { const start = rules.value.length; rules.value.push(...importedRules); selectedRuleIndex.value = start; appendLog("DONE", `已从 Excel 截图追加 ${importedRules.length} 条规则。`); }
function getSheetModeDisplay(mode: SheetMode) {
  return mode === "exact" ? "exact - 精确匹配" : mode === "contains" ? "contains - 包含关键词" : "index - 按序号";
}
function startRuleDrag(event: PointerEvent, index: number) {
  if (event.button !== 0) return;
  event.preventDefault();
  activeRulePointerId = event.pointerId;
  draggedRuleIndex.value = index; dragOverRuleIndex.value = index; selectedRuleIndex.value = index;
  const row = (event.currentTarget as HTMLElement | null)?.closest("tr");
  const table = row?.closest("table");
  ruleRowCenters = Array.from(table?.tBodies[0]?.rows ?? []).map((row) => {
    const rect = row.getBoundingClientRect();
    return rect.top + rect.height / 2;
  });
  if (row) {
    const rect = row.getBoundingClientRect();
    const pointerX = event.clientX;
    const pointerY = event.clientY;
    ruleDragOverlay.value = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      grabOffsetX: pointerX - rect.left,
      grabOffsetY: pointerY - rect.top,
      columns: Array.from(row.cells).map((cell) => `${cell.getBoundingClientRect().width}px`).join(" "),
    };
  }
  document.body.classList.add("rule-pointer-dragging");
  window.addEventListener("pointermove", updateRuleDragFromPointer);
  window.addEventListener("pointerup", finishRuleDragFromPointer);
  window.addEventListener("pointercancel", cancelRuleDragFromPointer);
}
function previewRuleDrop(toIndex: number) {
  dragOverRuleIndex.value = toIndex;
}
function updateRuleDragFromPointer(event: PointerEvent) {
  if (event.pointerId !== activeRulePointerId) return;
  event.preventDefault();
  updateRuleDragOverlayFromPointer(event);
  const targetIndex = findRuleDragTarget(ruleRowCenters, event.clientY);
  if (targetIndex !== null) previewRuleDrop(targetIndex);
}
function updateRuleDragOverlayFromPointer(event: PointerEvent) {
  const overlay = ruleDragOverlay.value;
  if (!overlay) return;
  ruleDragOverlay.value = {
    ...overlay,
    left: getRuleDragOverlayLeft(event.clientX, overlay.grabOffsetX),
    top: getRuleDragOverlayTop(event.clientY, overlay.grabOffsetY),
  };
}
function finishRuleDragFromPointer(event: PointerEvent) {
  if (event.pointerId !== activeRulePointerId) return;
  event.preventDefault();
  const fromIndex = draggedRuleIndex.value;
  const toIndex = dragOverRuleIndex.value;
  if (fromIndex !== null && toIndex !== null && fromIndex !== toIndex) {
    const result = reorderRules(rules.value, fromIndex, toIndex, selectedRuleIndex.value);
    rules.value = result.rules; selectedRuleIndex.value = result.selectedIndex;
  }
  endRuleDrag();
}
function cancelRuleDragFromPointer(event: PointerEvent) {
  if (event.pointerId === activeRulePointerId) endRuleDrag();
}
function endRuleDrag() {
  activeRulePointerId = null;
  draggedRuleIndex.value = null; dragOverRuleIndex.value = null; ruleDragOverlay.value = null; ruleRowCenters = [];
  document.body.classList.remove("rule-pointer-dragging");
  window.removeEventListener("pointermove", updateRuleDragFromPointer);
  window.removeEventListener("pointerup", finishRuleDragFromPointer);
  window.removeEventListener("pointercancel", cancelRuleDragFromPointer);
}
async function runSummary() {
  if (browserPreview) { window.alert(browserPreviewMessage); return; }
  if (running.value) return;
  const request: SummaryRequest = { target_folder: targetPath.value, target_paths: [...targetPaths.value], output_file: outputFile.value, keyword: keyword.value, filter_mode: filterMode.value, rules: rules.value, sheet_choices: [] };
  if ((!targetPath.value && !targetPaths.value.length) || !outputFile.value) { await message("请先选择目标文件或文件夹，以及输出文件。", { title: "配置不完整", kind: "warning" }); return; }
  if (!rules.value.length) { await message("请至少配置一条规则。", { title: "规则为空", kind: "warning" }); return; }
  if (await invoke<boolean>("path_exists", { path: outputFile.value }) && !await confirm("输出文件已存在，是否覆盖？", { title: "确认覆盖", kind: "warning" })) return;
  beginTaskTiming("开始预检文件与 Sheet，正在估算本次任务用时。");
  try {
    const conflicts = await invoke<SheetConflict[]>("collect_sheet_conflicts", { request });
    if (conflicts.length) {
      selectedSheets.value = Object.fromEntries(conflicts.map((conflict) => [getSheetConflictKey(conflict), conflict.matched_sheets[0]]));
      sheetConflicts.value = conflicts; pendingRequest.value = request; finishTaskTiming(); appendLog("WARN", `发现 ${conflicts.length} 处 Sheet 关键词命中多个 Sheet，请选择后继续。`); return;
    }
  } catch (error) { finishTaskTiming(); await message(String(error), { title: "Sheet 冲突检查失败", kind: "error" }); return; }
  await executeSummary(request);
}
function beginTaskTiming(logMessage: string) {
  running.value = true; processed.value = 0; total.value = 0; currentFile.value = "-";
  taskStartedAt.value = Date.now(); taskEstimatedSeconds.value = null; taskRemainingSeconds.value = null; taskActualSeconds.value = null;
  appendLog("INFO", logMessage);
}
async function executeSummary(request: SummaryRequest) {
  beginTaskTiming("开始执行汇总，正在估算本次任务用时。");
  try {
    const result = await invoke<SummaryResult>("run_summary", { request });
    finishTaskTiming();
    appendLog("DONE", `处理完成：${result.processed_files}/${result.total_files}，输出 ${getFileDisplayName(result.output_path)}`);
    if (await confirm(getSummaryCompletionPrompt(), { title: "执行完成", kind: "info" })) await invoke("open_output_file", { path: result.output_path });
  } catch (error) { finishTaskTiming(); appendLog("ERROR", String(error)); await message(String(error), { title: "汇总失败", kind: "error" }); }
  finally { if (running.value) finishTaskTiming(); }
}
function finishTaskTiming() {
  if (taskStartedAt.value !== null) taskActualSeconds.value = (Date.now() - taskStartedAt.value) / 1000;
  taskRemainingSeconds.value = 0; running.value = false;
}
function cancelSheetChoice() { sheetConflicts.value = []; selectedSheets.value = {}; pendingRequest.value = null; appendLog("INFO", "已取消 Sheet 选择。"); }
async function continueWithSheetChoices() {
  if (!pendingRequest.value) return;
  const request = { ...pendingRequest.value, sheet_choices: buildSheetChoices(sheetConflicts.value, selectedSheets.value) };
  sheetConflicts.value = []; selectedSheets.value = {}; pendingRequest.value = null; await executeSummary(request);
}
async function openSupportWindow(view: Exclude<SupportView, "main">, returnWorkspace: WorkspaceKey = activeWorkspace.value) {
  const config = getSupportWindowConfig(view, returnWorkspace);
  if (browserPreview) { window.open(config.url, "_blank", "noopener,noreferrer"); return; }
  const existing = await WebviewWindow.getByLabel(config.label);
  if (existing) { await emitTo(config.label, "support-return-workspace", returnWorkspace); await existing.show(); await existing.unminimize(); await existing.setFocus(); return; }
  const { label, ...windowOptions } = config; const supportWindow = new WebviewWindow(label, windowOptions);
  await supportWindow.once("tauri://error", (event) => appendLog("ERROR", `打开${config.title}窗口失败：${String(event.payload)}`));
}

onMounted(async () => {
  if (supportView !== "main") return;
  if (browserPreview) { appendLog("INFO", browserPreviewMessage); return; }
  await refreshSchemes(); void initializeOcrAtStartup().catch((error) => appendLog("WARN", `Umi-OCR 自动加载失败：${String(error)}`));
  unlisteners = await Promise.all([
    listen<WorkspaceKey>("navigate-workspace", ({ payload }) => { if (isWorkspaceKey(payload)) activeWorkspace.value = payload; }),
    listen<LogEvent>("summary-log", ({ payload }) => appendLog(payload.level, payload.message)),
    listen<ProgressEvent>("summary-progress", ({ payload }) => {
      processed.value = payload.processed; total.value = payload.total;
      if (payload.total > 0 && taskEstimatedSeconds.value === null) {
        taskEstimatedSeconds.value = estimateSummarySeconds(payload.total, rules.value.length);
        taskRemainingSeconds.value = taskEstimatedSeconds.value;
      }
      if (taskStartedAt.value !== null && payload.processed > 0) {
        taskRemainingSeconds.value = estimateRemainingSeconds(taskStartedAt.value, payload.processed, payload.total);
      }
    }),
    listen<CurrentFileEvent>("summary-current-file", ({ payload }) => { currentFile.value = payload.path; }),
  ]);
});
onBeforeUnmount(() => {
  unlisteners.forEach((unlisten) => unlisten());
  endRuleDrag();
});
</script>

<template>
  <ElConfigProvider :locale="zhCn">
    <SupportWindowContent v-if="supportView !== 'main'" :view="supportView" />
    <div v-else class="app-shell">
    <aside class="side-nav">
      <div class="brand"><div class="brand-mark"><FileSpreadsheet :size="26" /></div><div><h1>Financial Tool</h1><p v-if="brandSubtitle">{{ brandSubtitle }}</p></div></div>
      <nav class="nav-list">
        <button v-for="page in workspacePages" :key="page.key" :class="activeWorkspace === page.key ? 'nav-item active' : 'nav-item'" @click="activeWorkspace = page.key">
          <component :is="page.icon" :size="22" /><span>{{ page.label }}</span>
        </button>
      </nav>
    </aside>
    <main class="workspace">
      <header class="window-bar" data-tauri-drag-region><div><h2>Financial Tool 财务工具箱</h2><p>Excel 定向汇总、截图识字与剪贴板清洗</p></div><div class="window-actions"><ElButton class="soft-button" @click="openSupportWindow('help', activeWorkspace)"><Info :size="19" />帮助说明</ElButton></div></header>
      <section class="content-panel">
        <div class="panel-heading"><div><p class="eyebrow">{{ activeKicker }}</p><h3>{{ activeTitle }}</h3></div>
          <div v-if="activeWorkspace === 'summary' && activeSummaryTab === 'rules'" class="toolbar">
            <button class="soft-button" @click="showRuleImageImporter = true"><ScanSearch :size="18" />图片生成规则</button>
            <button class="soft-button" @click="addRule"><Plus :size="18" />新增规则</button>
            <button class="danger-button" @click="deleteSelectedRule"><Trash2 :size="18" />删除选中</button>
            <button class="soft-button" @click="rules = sampleRules.map((rule) => ({ ...rule }))"><BookOpen :size="18" />填充示例规则</button>
          </div>
        </div>
        <nav v-if="activeWorkspace === 'summary'" class="workspace-tabs" role="tablist" aria-label="汇总功能标签">
          <button v-for="tab in summaryTabs" :key="tab.key" type="button" role="tab" :aria-selected="activeSummaryTab === tab.key" :class="activeSummaryTab === tab.key ? 'workspace-tab active' : 'workspace-tab'" @click="activeSummaryTab = tab.key"><component :is="tab.icon" :size="18" /><span>{{ tab.label }}</span></button>
        </nav>
        <nav v-if="activeWorkspace === 'ocr'" class="workspace-tabs" role="tablist" aria-label="截图识字标签">
          <button v-for="tab in ocrTabs" :key="tab.key" type="button" role="tab" :aria-selected="activeOcrTab === tab.key" :class="activeOcrTab === tab.key ? 'workspace-tab active' : 'workspace-tab'" @click="activeOcrTab = tab.key"><component :is="tab.icon" :size="18" /><span>{{ tab.label }}</span></button>
        </nav>
        <div class="feature-content" :key="contentKey">
          <div v-if="activeWorkspace === 'summary' && activeSummaryTab === 'scheme'" class="scheme-page">
            <div class="scheme-editor"><div class="scheme-current"><label><span>当前方案</span><input ref="schemeNameInput" v-model="schemeName" placeholder="输入新方案名称，或从下方载入已有方案" /></label><small>{{ loadedSchemeData ? `最近保存：${formatSchemeSavedAt(loadedSchemeData.updated_at)}` : '新方案尚未保存' }}</small></div><div class="button-row scheme-actions">
              <button class="soft-button" @click="createNewScheme"><Plus :size="18" />新建方案</button>
              <button class="soft-button" :disabled="!selectedSchemeData" @click="loadSelectedScheme"><FolderOpen :size="18" />载入方案</button>
              <button class="primary-button" @click="saveCurrentScheme"><Save :size="18" />保存方案</button>
              <button class="danger-button" :disabled="!selectedSchemeData" @click="deleteSelectedScheme"><Trash2 :size="18" />删除方案</button>
            </div></div>
            <section class="scheme-library" aria-labelledby="saved-schemes-title">
              <div class="scheme-library-heading"><div><h4 id="saved-schemes-title">已保存方案</h4><span>共 {{ schemePageData.totalItems }} 个方案</span></div><label class="scheme-search"><Search :size="18" /><input v-model="schemeQuery" placeholder="搜索方案名称" aria-label="搜索已保存方案" @input="schemePage = 1" /></label></div>
              <div class="scheme-list" role="listbox" aria-label="已保存方案">
                <button v-for="scheme in schemePageData.items" :key="scheme.name" type="button" role="option" :aria-selected="selectedScheme === scheme.name" :class="selectedScheme === scheme.name ? 'scheme-list-item selected' : 'scheme-list-item'" @click="selectedScheme = scheme.name" @dblclick="applyScheme(scheme)"><FileSpreadsheet :size="20" /><span class="scheme-list-primary"><strong class="scheme-list-name">{{ scheme.name }}</strong><small>{{ scheme.keyword ? `关键词：${scheme.keyword}` : '全部 Excel 文件' }}</small></span><span class="scheme-list-meta">{{ scheme.rules.length }} 条规则</span><time class="scheme-list-saved" :datetime="scheme.updated_at">{{ formatSchemeSavedAt(scheme.updated_at) }}</time></button>
                <div v-if="!schemePageData.items.length" class="scheme-empty">没有匹配的已保存方案</div>
              </div>
              <div class="scheme-pagination"><span>第 {{ schemePageData.currentPage }} / {{ schemePageData.totalPages }} 页</span><div><button type="button" class="icon-button" :disabled="schemePageData.currentPage <= 1" title="上一页" @click="schemePage = Math.max(1, schemePage - 1)"><ChevronLeft :size="19" /></button><button type="button" class="icon-button" :disabled="schemePageData.currentPage >= schemePageData.totalPages" title="下一页" @click="schemePage = Math.min(schemePageData.totalPages, schemePage + 1)"><ChevronRight :size="19" /></button></div></div>
            </section>
          </div>
          <div v-if="activeWorkspace === 'summary' && activeSummaryTab === 'source'" class="form-grid">
            <label class="wide-field"><span>目标文件/文件夹</span><div class="input-action source-action"><div class="source-selection-field" :class="{ 'is-placeholder': !targetPath && !targetPaths.length }" :title="sourceSelectionTitle">{{ sourceSelectionText }}</div><button class="soft-button source-picker-trigger" type="button" @click="openSourcePicker"><FolderOpen :size="17" />选择文件/文件夹</button></div><small class="field-hint">支持同时添加多个文件和文件夹；文件夹会递归扫描全部子文件夹</small></label>
            <label class="wide-field"><span>输出文件</span><div class="input-action"><div class="output-file-field"><span v-if="outputFile" class="output-file-name" :title="outputFile">{{ getFileDisplayName(outputFile) }}</span><span v-else class="output-file-placeholder">尚未选择输出文件</span></div><button class="soft-button" @click="browseOutputFile">浏览</button></div></label>
            <label><span>关键词</span><input v-model="keyword" placeholder="为空时处理全部符合条件的 Excel 文件" /></label>
            <label><span>筛选模式</span><select v-model="filterMode"><option value="include">包含关键词</option><option value="exclude">排除关键词</option></select></label>
          </div>
          <div v-if="activeWorkspace === 'summary' && activeSummaryTab === 'rules'" class="table-wrap"><table><thead><tr><th class="drag-column" aria-label="拖动排序" title="拖动左侧手柄调整规则顺序"><GripVertical :size="18" /></th><th>输出列名</th><th>Sheet 模式</th><th>Sheet 值</th><th>单元格</th></tr></thead><tbody>
            <tr v-for="(rule, index) in rules" :key="getRuleRowKey(rule)" :class="['rule-drag-row', selectedRuleIndex === index ? 'selected-row' : '', draggedRuleIndex === index ? 'dragging-rule-origin' : '', dragOverRuleIndex === index && draggedRuleIndex !== index ? 'drag-over-row' : '', getRuleDragShift(index, draggedRuleIndex, dragOverRuleIndex)]" :style="getRuleDragOriginStyle(draggedRuleIndex === index)" @click="selectedRuleIndex = index">
              <td class="drag-cell"><button type="button" class="drag-handle" :aria-label="`拖动第 ${index + 1} 条规则调整顺序`" title="拖动调整顺序" @click.stop @pointerdown="startRuleDrag($event, index)"><GripVertical :size="20" /></button></td>
              <td><input :value="rule.output_column" @input="updateRule(index, { output_column: ($event.target as HTMLInputElement).value })" /></td>
              <td><select :value="rule.sheet_mode" @change="updateRule(index, { sheet_mode: ($event.target as HTMLSelectElement).value as SheetMode })"><option value="exact">exact - 精确匹配</option><option value="contains">contains - 包含关键词</option><option value="index">index - 按序号</option></select></td>
              <td><input :value="rule.sheet_value" @input="updateRule(index, { sheet_value: ($event.target as HTMLInputElement).value })" /></td>
              <td><input :value="rule.cell" @input="updateRule(index, { cell: ($event.target as HTMLInputElement).value })" /></td>
            </tr>
          </tbody></table></div>
          <Teleport to="body">
            <div v-if="ruleDragOverlay && draggedRuleData" class="rule-drag-overlay" :style="{ left: `${ruleDragOverlay.left}px`, top: `${ruleDragOverlay.top}px`, width: `${ruleDragOverlay.width}px`, height: `${ruleDragOverlay.height}px`, gridTemplateColumns: ruleDragOverlay.columns }" aria-hidden="true">
              <div class="rule-drag-overlay-cell rule-drag-overlay-handle"><GripVertical :size="20" /></div>
              <div class="rule-drag-overlay-cell"><span>{{ draggedRuleData.output_column }}</span></div>
              <div class="rule-drag-overlay-cell"><span>{{ getSheetModeDisplay(draggedRuleData.sheet_mode) }}</span></div>
              <div class="rule-drag-overlay-cell"><span>{{ draggedRuleData.sheet_value }}</span></div>
              <div class="rule-drag-overlay-cell"><span>{{ draggedRuleData.cell }}</span></div>
            </div>
          </Teleport>
          <div v-if="activeWorkspace === 'summary' && activeSummaryTab === 'run'" class="run-layout"><div class="run-actions"><button class="primary-button" :disabled="running" @click="runSummary"><Rocket :size="20" />{{ running ? '正在汇总' : '开始汇总' }}</button><button class="soft-button" @click="logs = []">清空日志</button><div class="run-meta">当前处理文件：{{ currentFile }}</div><div class="run-estimate" aria-live="polite">{{ taskEstimateText }}</div><div class="run-count">已处理 {{ processed }} / {{ total }}</div></div><div class="progress-bar"><div :style="{ width: `${percent}%` }" /><span>{{ percent }}%</span></div><pre class="log-console">{{ logs.join('\n') }}</pre></div>
          <OcrPage v-if="activeWorkspace === 'ocr' && activeOcrTab === 'capture'" :on-log="appendLog" />
          <OcrSettingsPage v-if="activeWorkspace === 'ocr' && activeOcrTab === 'settings'" :on-log="appendLog" />
          <TextCleanerPage v-if="activeWorkspace === 'text-cleaner'" :on-log="appendLog" :on-open-regex-tutorial="() => openSupportWindow('regex', 'text-cleaner')" />
          <AboutPage v-if="activeWorkspace === 'about'" />
        </div>
      </section>
    </main>
    <div v-if="sheetConflicts.length > 0 && pendingRequest" class="modal-backdrop" role="presentation"><div class="sheet-modal" role="dialog" aria-modal="true"><div class="sheet-modal-heading"><div><p class="eyebrow">Sheet 匹配冲突</p><h3>请选择实际要读取的 Sheet</h3></div><span>{{ sheetConflicts.length }} 项</span></div><div class="sheet-conflict-list">
      <label v-for="conflict in sheetConflicts" :key="getSheetConflictKey(conflict)" class="sheet-conflict-item"><span>{{ conflict.file_name }} / {{ conflict.output_column }} / 关键词：{{ conflict.sheet_value }}</span><select v-model="selectedSheets[getSheetConflictKey(conflict)]"><option v-for="sheetName in conflict.matched_sheets" :key="sheetName" :value="sheetName">{{ sheetName }}</option></select></label>
    </div><div class="modal-actions"><button class="soft-button" @click="cancelSheetChoice">取消</button><button class="primary-button" @click="continueWithSheetChoices">使用选择继续汇总</button></div></div></div>
    <SourcePickerModal v-if="showSourcePicker" :initial-paths="sourcePickerPaths" :on-close="() => { showSourcePicker = false; }" :on-confirm="confirmSourcePicker" />
    <RuleImageImporter v-if="showRuleImageImporter" :on-close="() => { showRuleImageImporter = false; }" :on-append="appendImportedRules" />
    </div>
  </ElConfigProvider>
</template>
