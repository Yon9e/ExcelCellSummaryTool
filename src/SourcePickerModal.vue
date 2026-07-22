<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import {
  ArrowLeft,
  ArrowLeftRight,
  Check,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Folder,
  FolderOpen,
  HardDrive,
  ListChecks,
  RefreshCw,
  Search,
  X,
} from "@lucide/vue";
import type {
  SourcePickerEntry,
  SourcePickerListing,
  SourcePickerNavigation,
  SourcePickerTreeEntry,
} from "./types";
import { isTauriRuntime } from "./browserPreview";
import {
  applyVisibleSourcePathRangeSelection,
  invertVisibleSourcePaths,
  mergeUniqueSourcePaths,
  selectAllVisibleSourcePaths,
  sourcePathKey,
  sourcePathsEqual,
} from "./sourcePaths";

const props = defineProps<{
  initialPaths: string[];
  onClose: () => void;
  onConfirm: (paths: string[]) => void;
}>();

interface SourcePickerTreeNode {
  entry: SourcePickerTreeEntry;
  children: SourcePickerTreeNode[];
  expanded: boolean;
  loaded: boolean;
  loading: boolean;
}

interface SourcePickerTreeGroup {
  key: "quick-access" | "common" | "drives";
  label: string;
  nodes: SourcePickerTreeNode[];
}

interface SourcePickerFlatTreeRow {
  node: SourcePickerTreeNode;
  depth: number;
}

interface DragSelectionState {
  pointerId: number;
  startPath: string;
  shouldSelect: boolean;
  initialPaths: string[];
  moved: boolean;
  lastClientX: number;
  lastClientY: number;
  autoScrollSpeed: number;
  autoScrollFrame: number | null;
}

const browserPreview = !isTauriRuntime();
const previewRoot = "D:\\示例资料\\2026\\TB";
const listing = ref<SourcePickerListing>({ current_path: "", parent_path: null, entries: [] });
const navigation = ref<SourcePickerNavigation>({ quick_access: [], common_locations: [], drives: [] });
const quickAccessNodes = ref<SourcePickerTreeNode[]>([]);
const commonLocationNodes = ref<SourcePickerTreeNode[]>([]);
const driveNodes = ref<SourcePickerTreeNode[]>([]);
const addressInput = ref("");
const query = ref("");
const selectedPaths = ref<string[]>([...props.initialPaths]);
const loading = ref(false);
const navigationLoading = ref(false);
const errorMessage = ref("");
const isDraggingSelection = ref(false);
const tableWrap = ref<HTMLElement | null>(null);
let dragSelection: DragSelectionState | null = null;

const visibleEntries = computed(() => {
  const normalizedQuery = query.value.trim().toLocaleLowerCase("zh-CN");
  if (!normalizedQuery) return listing.value.entries;
  return listing.value.entries.filter((entry) => entry.name.toLocaleLowerCase("zh-CN").includes(normalizedQuery));
});

const visiblePaths = computed(() => visibleEntries.value.map((entry) => entry.path));
const allVisibleSelected = computed(() => visiblePaths.value.length > 0 && visiblePaths.value.every(isSelected));
const someVisibleSelected = computed(() => visiblePaths.value.some(isSelected));
const treeGroups = computed<SourcePickerTreeGroup[]>(() => [
  { key: "quick-access" as const, label: "Windows 快速访问", nodes: quickAccessNodes.value },
  { key: "common" as const, label: "常用位置", nodes: commonLocationNodes.value },
  { key: "drives" as const, label: "此电脑", nodes: driveNodes.value },
].filter((group) => group.nodes.length));

function previewListing(path: string): SourcePickerListing {
  const currentPath = path || previewRoot;
  return {
    current_path: currentPath,
    parent_path: currentPath === previewRoot ? "D:\\示例资料\\2026" : previewRoot,
    entries: [
      { name: "报告披露-单独汇总科目", path: `${currentPath}\\报告披露-单独汇总科目`, is_directory: true, modified_at: 1783695600, size: 0 },
      { name: "备份", path: `${currentPath}\\备份`, is_directory: true, modified_at: 1783959360, size: 0 },
      { name: "日志", path: `${currentPath}\\日志`, is_directory: true, modified_at: 1783933980, size: 0 },
      { name: "输出", path: `${currentPath}\\输出`, is_directory: true, modified_at: 1783927680, size: 0 },
      { name: "00A00_合并财务报表.xlsx", path: `${currentPath}\\00A00_合并财务报表.xlsx`, is_directory: false, modified_at: 1776694800, size: 21788672 },
      { name: "00A01_TB和附注（合并）.xlsm", path: `${currentPath}\\00A01_TB和附注（合并）.xlsm`, is_directory: false, modified_at: 1776702180, size: 3842048 },
      { name: "00A04_香港国际TB和附注.xltx", path: `${currentPath}\\00A04_香港国际TB和附注.xltx`, is_directory: false, modified_at: 1776421320, size: 1843200 },
    ],
  };
}

function previewNavigation(): SourcePickerNavigation {
  return {
    quick_access: [
      { name: "当前 TB 目录", path: previewRoot },
      { name: "格林美", path: "D:\\示例资料\\2026\\格林美" },
      { name: "审计项目", path: "D:\\示例资料\\2026" },
    ],
    common_locations: [
      { name: "桌面", path: "C:\\Users\\Admin\\Desktop" },
      { name: "下载", path: "C:\\Users\\Admin\\Downloads" },
      { name: "文档", path: "C:\\Users\\Admin\\Documents" },
    ],
    drives: [
      { name: "Windows-SSD (C:)", path: "C:\\" },
      { name: "新加卷 (D:)", path: "D:\\" },
    ],
  };
}

function previewDirectories(path: string): SourcePickerTreeEntry[] {
  return [
    { name: "2026", path: `${path}\\2026` },
    { name: "TB", path: `${path}\\TB` },
    { name: "报告相关", path: `${path}\\报告相关` },
  ];
}

function createTreeNodes(entries: SourcePickerTreeEntry[]): SourcePickerTreeNode[] {
  return entries.map((entry) => ({ entry, children: [], expanded: false, loaded: false, loading: false }));
}

function flattenTreeNodes(nodes: SourcePickerTreeNode[], depth = 0): SourcePickerFlatTreeRow[] {
  return nodes.flatMap((node) => [
    { node, depth },
    ...(node.expanded ? flattenTreeNodes(node.children, depth + 1) : []),
  ]);
}

function groupRows(group: SourcePickerTreeGroup): SourcePickerFlatTreeRow[] {
  return flattenTreeNodes(group.nodes);
}

async function loadNavigation(): Promise<void> {
  navigationLoading.value = true;
  try {
    navigation.value = browserPreview
      ? previewNavigation()
      : await invoke<SourcePickerNavigation>("list_source_picker_navigation");
    quickAccessNodes.value = createTreeNodes(navigation.value.quick_access);
    commonLocationNodes.value = createTreeNodes(navigation.value.common_locations);
    driveNodes.value = createTreeNodes(navigation.value.drives);
  } catch (error) {
    errorMessage.value = `读取目录树失败：${String(error)}`;
  } finally {
    navigationLoading.value = false;
  }
}

async function loadEntries(path = "", allowRootFallback = true): Promise<void> {
  loading.value = true;
  errorMessage.value = "";
  try {
    const result = browserPreview
      ? previewListing(path)
      : await invoke<SourcePickerListing>("list_source_picker_entries", { path: path || null });
    listing.value = result;
    addressInput.value = result.current_path;
    query.value = "";
    if (result.current_path) localStorage.setItem("financial-tool-source-picker-path", result.current_path);
  } catch (error) {
    if (path && allowRootFallback) {
      await loadEntries("", false);
      return;
    }
    errorMessage.value = String(error);
  } finally {
    loading.value = false;
  }
}

async function toggleTreeNode(node: SourcePickerTreeNode): Promise<void> {
  if (node.expanded) {
    node.expanded = false;
    return;
  }
  node.expanded = true;
  if (node.loaded || node.loading) return;
  node.loading = true;
  try {
    const entries = browserPreview
      ? previewDirectories(node.entry.path)
      : await invoke<SourcePickerTreeEntry[]>("list_source_picker_directories", { path: node.entry.path });
    node.children = createTreeNodes(entries);
    node.loaded = true;
  } catch (error) {
    node.expanded = false;
    errorMessage.value = `展开目录失败：${String(error)}`;
  } finally {
    node.loading = false;
  }
}

function treeNodeCanExpand(node: SourcePickerTreeNode) {
  return !node.loaded || node.children.length > 0;
}

function navigateFromTree(path: string) {
  void loadEntries(path);
}

function pathsEqual(left: string, right: string) {
  return sourcePathsEqual(left, right);
}

function toggleSelection(entry: SourcePickerEntry) {
  setPathSelected(entry.path, !isSelected(entry.path));
}

function setPathSelected(path: string, shouldSelect: boolean) {
  selectedPaths.value = shouldSelect
    ? mergeUniqueSourcePaths(selectedPaths.value, [path])
    : selectedPaths.value.filter((selectedPath) => !sourcePathsEqual(selectedPath, path));
}

function removeSelectedPath(path: string) {
  selectedPaths.value = selectedPaths.value.filter((item) => !sourcePathsEqual(item, path));
}

function isSelected(path: string) {
  return selectedPaths.value.some((selectedPath) => sourcePathsEqual(selectedPath, path));
}

function selectAllVisible() {
  selectedPaths.value = selectAllVisibleSourcePaths(selectedPaths.value, visiblePaths.value);
}

function invertVisible() {
  selectedPaths.value = invertVisibleSourcePaths(selectedPaths.value, visiblePaths.value);
}

function toggleAllVisible() {
  if (allVisibleSelected.value) {
    selectedPaths.value = invertVisibleSourcePaths(selectedPaths.value, visiblePaths.value);
    return;
  }
  selectAllVisible();
}

function onRowPointerDown(entry: SourcePickerEntry, event: PointerEvent) {
  if (event.button !== 0) return;
  event.preventDefault();
  tableWrap.value?.setPointerCapture(event.pointerId);
  dragSelection = {
    pointerId: event.pointerId,
    startPath: entry.path,
    shouldSelect: !isSelected(entry.path),
    initialPaths: [...selectedPaths.value],
    moved: false,
    lastClientX: event.clientX,
    lastClientY: event.clientY,
    autoScrollSpeed: 0,
    autoScrollFrame: null,
  };
  isDraggingSelection.value = true;
}

function onRowPointerEnter(entry: SourcePickerEntry, event: PointerEvent) {
  if (!dragSelection || dragSelection.pointerId !== event.pointerId || !(event.buttons & 1)) return;
  updateDragSelection(entry.path);
}

function onTablePointerMove(event: PointerEvent) {
  if (!dragSelection || dragSelection.pointerId !== event.pointerId || !(event.buttons & 1)) return;
  dragSelection.lastClientX = event.clientX;
  dragSelection.lastClientY = event.clientY;
  updateDragSelectionAtPoint(event.clientX, event.clientY);
  updateDragAutoScroll();
}

function updateDragSelection(path: string) {
  if (!dragSelection) return;
  if (sourcePathsEqual(path, dragSelection.startPath)) {
    if (dragSelection.moved) selectedPaths.value = [...dragSelection.initialPaths];
    return;
  }
  dragSelection.moved = true;
  selectedPaths.value = applyVisibleSourcePathRangeSelection(
    dragSelection.initialPaths,
    visiblePaths.value,
    dragSelection.startPath,
    path,
    dragSelection.shouldSelect,
  );
}

function updateDragSelectionAtPoint(clientX: number, clientY: number) {
  const sourceRow = document.elementFromPoint(clientX, clientY)?.closest<HTMLTableRowElement>("tr[data-source-path]");
  const rowPath = sourceRow?.dataset.sourcePath;
  if (rowPath) {
    updateDragSelection(rowPath);
    return;
  }

  const wrapper = tableWrap.value;
  if (!wrapper) return;
  const rows = [...wrapper.querySelectorAll<HTMLTableRowElement>("tr[data-source-path]")];
  if (!rows.length) return;
  const bounds = wrapper.getBoundingClientRect();
  const edgeRow = clientY < bounds.top ? rows[0] : clientY > bounds.bottom ? rows[rows.length - 1] : undefined;
  if (edgeRow?.dataset.sourcePath) updateDragSelection(edgeRow.dataset.sourcePath);
}

function updateDragAutoScroll() {
  const wrapper = tableWrap.value;
  if (!dragSelection || !wrapper) return;
  const bounds = wrapper.getBoundingClientRect();
  const edgeSize = 38;
  const maxSpeed = 22;
  const topDistance = dragSelection.lastClientY - bounds.top;
  const bottomDistance = bounds.bottom - dragSelection.lastClientY;
  if (topDistance < edgeSize) {
    dragSelection.autoScrollSpeed = -Math.max(4, Math.ceil((edgeSize - topDistance) / 2));
  } else if (bottomDistance < edgeSize) {
    dragSelection.autoScrollSpeed = Math.max(4, Math.ceil((edgeSize - bottomDistance) / 2));
  } else {
    dragSelection.autoScrollSpeed = 0;
    stopDragAutoScroll();
    return;
  }
  dragSelection.autoScrollSpeed = Math.max(-maxSpeed, Math.min(maxSpeed, dragSelection.autoScrollSpeed));
  if (!dragSelection.autoScrollSpeed || dragSelection.autoScrollFrame !== null) return;
  dragSelection.autoScrollFrame = requestAnimationFrame(continueDragAutoScroll);
}

function continueDragAutoScroll() {
  if (!dragSelection) return;
  dragSelection.autoScrollFrame = null;
  const wrapper = tableWrap.value;
  if (!wrapper || !dragSelection.autoScrollSpeed) return;
  const previousScrollTop = wrapper.scrollTop;
  const maxScrollTop = Math.max(0, wrapper.scrollHeight - wrapper.clientHeight);
  wrapper.scrollTop = Math.max(0, Math.min(maxScrollTop, previousScrollTop + dragSelection.autoScrollSpeed));
  updateDragSelectionAtPoint(dragSelection.lastClientX, dragSelection.lastClientY);
  if (wrapper.scrollTop !== previousScrollTop) {
    dragSelection.autoScrollFrame = requestAnimationFrame(continueDragAutoScroll);
  }
}

function stopDragAutoScroll() {
  if (!dragSelection || dragSelection.autoScrollFrame === null) return;
  cancelAnimationFrame(dragSelection.autoScrollFrame);
  dragSelection.autoScrollFrame = null;
}

function clearDragSelection() {
  if (!dragSelection) return;
  stopDragAutoScroll();
  if (tableWrap.value?.hasPointerCapture(dragSelection.pointerId)) {
    tableWrap.value.releasePointerCapture(dragSelection.pointerId);
  }
  dragSelection = null;
  isDraggingSelection.value = false;
}

function finishRowSelection() {
  if (!dragSelection) return;
  if (!dragSelection.moved) toggleSelection({ path: dragSelection.startPath } as SourcePickerEntry);
  clearDragSelection();
}

function cancelRowSelection() {
  if (!dragSelection) return;
  selectedPaths.value = [...dragSelection.initialPaths];
  clearDragSelection();
}

function openEntry(entry: SourcePickerEntry) {
  if (entry.is_directory) void loadEntries(entry.path);
}

function formatModifiedAt(value: number | null) {
  if (!value) return "-";
  return new Date(value * 1000).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatSize(value: number, isDirectory: boolean) {
  if (isDirectory) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function entryType(entry: SourcePickerEntry) {
  if (entry.is_directory) return "文件夹";
  return `${entry.name.split(".").pop()?.toUpperCase() ?? "Excel"} 文件`;
}

onMounted(() => {
  window.addEventListener("pointerup", finishRowSelection);
  window.addEventListener("pointercancel", cancelRowSelection);
  const previousPath = localStorage.getItem("financial-tool-source-picker-path") ?? "";
  const initialPath = previousPath || props.initialPaths[0] || "";
  void Promise.all([loadNavigation(), loadEntries(initialPath)]);
});

onBeforeUnmount(() => {
  window.removeEventListener("pointerup", finishRowSelection);
  window.removeEventListener("pointercancel", cancelRowSelection);
  cancelRowSelection();
});
</script>

<template>
  <div class="unified-picker-backdrop" role="presentation" @click.self="onClose">
    <section class="unified-picker" role="dialog" aria-modal="true" aria-labelledby="unified-picker-title">
      <header class="unified-picker-heading">
        <div>
          <p>数据源</p>
          <h3 id="unified-picker-title">选择文件和文件夹</h3>
          <span>同一页面混合多选；文件夹将递归扫描全部子文件夹。</span>
        </div>
        <button type="button" aria-label="关闭数据源选择" title="关闭" @click="onClose"><X :size="20" /></button>
      </header>

      <div class="unified-picker-toolbar">
        <button type="button" :disabled="listing.parent_path === null || loading" title="返回上一级" aria-label="返回上一级" @click="loadEntries(listing.parent_path ?? '')"><ArrowLeft :size="19" /></button>
        <button type="button" :disabled="loading" title="此电脑" aria-label="此电脑" @click="loadEntries('')"><HardDrive :size="19" /></button>
        <form class="unified-picker-address" @submit.prevent="loadEntries(addressInput)">
          <Folder :size="17" />
          <input v-model="addressInput" aria-label="当前文件夹路径" spellcheck="false" />
        </form>
        <button type="button" :disabled="loading" title="刷新" aria-label="刷新当前文件夹" @click="loadEntries(listing.current_path)"><RefreshCw :size="18" /></button>
        <label class="unified-picker-search"><Search :size="17" /><input v-model="query" aria-label="筛选当前文件夹" placeholder="筛选当前文件夹" /></label>
      </div>

      <div class="unified-picker-body">
        <aside class="unified-picker-tree" aria-label="目录树">
          <div class="tree-caption"><span>目录</span><span v-if="navigationLoading">读取中…</span></div>
          <section v-for="group in treeGroups" :key="group.key" class="tree-group">
            <p class="tree-group-label"><HardDrive v-if="group.key === 'drives'" :size="14" /><FolderOpen v-else :size="14" />{{ group.label }}</p>
            <div v-for="row in groupRows(group)" :key="row.node.entry.path" class="tree-row" :style="{ '--tree-depth': row.depth }">
              <button v-if="treeNodeCanExpand(row.node)" class="tree-expand" type="button" :disabled="row.node.loading" :aria-label="`${row.node.expanded ? '收起' : '展开'} ${row.node.entry.name}`" @click.stop="toggleTreeNode(row.node)"><ChevronDown v-if="row.node.expanded" :size="15" /><ChevronRight v-else :size="15" /></button>
              <span v-else class="tree-expand-spacer" aria-hidden="true" />
              <button class="tree-node" :class="{ active: pathsEqual(row.node.entry.path, listing.current_path) }" type="button" :title="row.node.entry.path" @click="navigateFromTree(row.node.entry.path)"><FolderOpen v-if="pathsEqual(row.node.entry.path, listing.current_path)" :size="16" /><Folder v-else :size="16" /><span>{{ row.node.entry.name }}</span></button>
            </div>
          </section>
          <p v-if="!navigationLoading && !treeGroups.length" class="tree-empty">未读取到可用目录</p>
        </aside>

        <div class="unified-picker-browser">
          <div ref="tableWrap" class="unified-picker-table-wrap" :class="{ 'is-dragging-selection': isDraggingSelection }" :aria-busy="loading" @pointermove="onTablePointerMove" @pointercancel="cancelRowSelection">
            <table class="unified-picker-table">
              <thead><tr><th class="selection-column"><button class="entry-checkbox table-select-all" :class="{ checked: allVisibleSelected, partial: someVisibleSelected && !allVisibleSelected }" type="button" role="checkbox" :aria-checked="allVisibleSelected ? 'true' : someVisibleSelected ? 'mixed' : 'false'" aria-label="全选当前筛选结果" title="全选当前筛选结果" :disabled="!visibleEntries.length" @click="toggleAllVisible"><Check v-if="allVisibleSelected" :size="14" /><span v-else-if="someVisibleSelected" /></button></th><th>名称</th><th>修改日期</th><th>类型</th><th>大小</th></tr></thead>
              <tbody role="listbox" aria-label="可选择的数据源" aria-multiselectable="true">
                <tr v-for="entry in visibleEntries" :key="entry.path" :data-source-path="entry.path" :class="{ selected: isSelected(entry.path) }" role="option" :aria-selected="isSelected(entry.path)" tabindex="0" @pointerdown="onRowPointerDown(entry, $event)" @pointerenter="onRowPointerEnter(entry, $event)" @pointerup="finishRowSelection" @dblclick.stop="openEntry(entry)" @keydown.enter.prevent="entry.is_directory ? openEntry(entry) : toggleSelection(entry)" @keydown.space.prevent="toggleSelection(entry)">
                  <td class="selection-column"><span class="entry-checkbox" :class="{ checked: isSelected(entry.path) }" aria-hidden="true"><Check v-if="isSelected(entry.path)" :size="14" /></span></td>
                  <td class="entry-name"><Folder v-if="entry.is_directory" :size="20" /><FileSpreadsheet v-else :size="20" /><span :title="entry.path">{{ entry.name }}</span></td>
                  <td>{{ formatModifiedAt(entry.modified_at) }}</td><td>{{ entryType(entry) }}</td><td>{{ formatSize(entry.size, entry.is_directory) }}</td>
                </tr>
                <tr v-if="!loading && !errorMessage && !visibleEntries.length"><td colspan="5" class="empty-row">当前文件夹没有可选择的文件夹或 Excel 文件</td></tr>
                <tr v-if="errorMessage"><td colspan="5" class="error-row">{{ errorMessage }}</td></tr>
              </tbody>
            </table>
            <div v-if="loading" class="picker-loading">正在读取文件夹…</div>
          </div>
          <footer class="unified-picker-status"><span>{{ visibleEntries.length }} 个项目</span><div class="selection-actions"><button type="button" :disabled="!visibleEntries.length" title="全选当前筛选结果" @click="selectAllVisible"><ListChecks :size="15" />全选当前</button><button type="button" :disabled="!visibleEntries.length" title="反选当前筛选结果" @click="invertVisible"><ArrowLeftRight :size="15" />反选当前</button></div><span class="format-hint">支持 .xlsx / .xlsm / .xltx / .xltm</span></footer>
        </div>

        <aside class="unified-picker-selected" aria-label="已选数据源">
          <div><strong>已选数据源</strong><span>{{ selectedPaths.length }} 项</span></div>
          <div v-if="selectedPaths.length" class="selected-source-list">
            <div v-for="path in selectedPaths" :key="path" class="selected-source-item"><span :title="path">{{ path }}</span><button type="button" :aria-label="`移除 ${path}`" title="移除" @click="removeSelectedPath(path)"><X :size="15" /></button></div>
          </div>
          <p v-else>拖动鼠标穿过多行可快速选择；全选和反选仅作用于当前筛选结果。</p>
        </aside>
      </div>

      <footer class="unified-picker-actions">
        <span>已选择 {{ selectedPaths.length }} 个文件/文件夹</span>
        <div><button class="soft-button" type="button" @click="onClose">取消</button><button class="primary-button" type="button" :disabled="!selectedPaths.length" @click="onConfirm(selectedPaths)">确定选择</button></div>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.unified-picker-backdrop { position: fixed; inset: 0; z-index: 40; display: grid; place-items: center; padding: 22px; background: rgba(2, 8, 16, .78); backdrop-filter: blur(7px); }
.unified-picker { display: flex; width: min(1420px, 96vw); height: min(780px, calc(100vh - 44px)); min-height: 560px; flex-direction: column; overflow: hidden; border: 1px solid rgba(96, 137, 190, .5); border-radius: 16px; background: #101f33; box-shadow: 0 28px 80px rgba(0, 0, 0, .48); }
.unified-picker-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; padding: 20px 22px 16px; border-bottom: 1px solid rgba(88, 126, 177, .28); }
.unified-picker-heading p { margin: 0 0 5px; color: #7891b3; font-size: 12px; font-weight: 750; }.unified-picker-heading h3 { margin: 0; color: #fff; font-size: 22px; font-weight: 820; }.unified-picker-heading span { display: block; margin-top: 7px; color: #94a9c5; font-size: 13px; }
.unified-picker-heading > button, .unified-picker-toolbar > button { display: inline-flex; width: 38px; height: 38px; align-items: center; justify-content: center; border: 1px solid rgba(91, 132, 187, .36); border-radius: 9px; color: #a7bad3; background: #172b46; cursor: pointer; }.unified-picker-heading > button:hover, .unified-picker-toolbar > button:hover:not(:disabled) { color: #fff; border-color: rgba(85, 166, 255, .7); background: #213e65; }
.unified-picker-toolbar { display: grid; grid-template-columns: 38px 38px minmax(240px, 1fr) 38px minmax(180px, 250px); gap: 8px; padding: 12px 16px; border-bottom: 1px solid rgba(88, 126, 177, .24); background: #0d1a2b; }
.unified-picker-address, .unified-picker-search { display: flex; min-width: 0; align-items: center; gap: 8px; padding: 0 10px; border: 1px solid rgba(91, 132, 187, .4); border-radius: 8px; color: #7facde; background: #0a1626; }.unified-picker-address input, .unified-picker-search input { width: 100%; min-height: 36px; padding: 0; border: 0; outline: 0; color: #eef5ff; background: transparent; font-size: 13px; font-weight: 580; }
.unified-picker-body { display: grid; min-height: 0; flex: 1; grid-template-columns: 220px minmax(0, 1fr) 270px; }
.unified-picker-tree { min-width: 0; overflow: auto; border-right: 1px solid rgba(88, 126, 177, .27); background: #0c192a; }.tree-caption { display: flex; min-height: 39px; align-items: center; justify-content: space-between; padding: 0 13px; border-bottom: 1px solid rgba(88, 126, 177, .24); color: #c0d0e4; font-size: 12px; font-weight: 750; }.tree-caption span:last-child { color: #758da9; font-size: 11px; font-weight: 600; }.tree-group { padding: 8px 7px 3px; }.tree-group-label { display: flex; align-items: center; gap: 7px; margin: 0 0 4px; padding: 5px 6px; color: #8096b2; font-size: 11px; font-weight: 760; }.tree-row { display: grid; grid-template-columns: 22px minmax(0, 1fr); min-width: 0; padding-left: calc(var(--tree-depth) * 14px); }.tree-expand, .tree-expand-spacer { display: inline-flex; width: 22px; height: 28px; align-items: center; justify-content: center; color: #7892b2; }.tree-expand { border: 0; border-radius: 5px; background: transparent; cursor: pointer; }.tree-expand:hover:not(:disabled) { color: #eaf4ff; background: rgba(65, 118, 179, .28); }.tree-node { display: flex; min-width: 0; height: 28px; align-items: center; gap: 7px; overflow: hidden; padding: 0 7px; border: 0; border-radius: 6px; color: #b8c8dc; background: transparent; cursor: pointer; font-size: 12px; text-align: left; }.tree-node svg { flex: 0 0 auto; color: #6caef0; }.tree-node span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.tree-node:hover { color: #f0f7ff; background: rgba(49, 99, 158, .34); }.tree-node.active { color: #eff7ff; background: rgba(45, 105, 174, .58); }.tree-empty { margin: 20px 14px; color: #6f86a2; font-size: 12px; text-align: center; }
.unified-picker-browser { display: flex; min-width: 0; min-height: 0; flex-direction: column; border-right: 1px solid rgba(88, 126, 177, .27); }.unified-picker-table-wrap { position: relative; min-height: 0; flex: 1; overflow: auto; background: #081422; }.unified-picker-table-wrap.is-dragging-selection { cursor: cell; user-select: none; }.unified-picker-table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; }.unified-picker-table th { position: sticky; top: 0; z-index: 2; height: 40px; padding: 0 12px; border-bottom: 1px solid rgba(92, 132, 184, .38); color: #b8c7da; background: #13243a; font-size: 12px; font-weight: 720; text-align: left; }.unified-picker-table th:nth-child(2) { width: 39%; }.unified-picker-table th:nth-child(3) { width: 22%; }.unified-picker-table th:nth-child(4) { width: 18%; }.unified-picker-table th:nth-child(5) { width: 12%; }.unified-picker-table .selection-column { width: 44px; padding-inline: 12px; }.unified-picker-table td { height: 43px; padding: 0 12px; overflow: hidden; border-bottom: 1px solid rgba(76, 111, 158, .15); color: #aebed2; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }.unified-picker-table tbody tr { outline: none; cursor: pointer; transition: background 100ms ease; user-select: none; }.unified-picker-table tbody tr:hover { background: rgba(40, 84, 137, .35); }.unified-picker-table tbody tr.selected { background: rgba(45, 105, 174, .58); }.unified-picker-table tbody tr:focus-visible { box-shadow: inset 0 0 0 2px #55a7ff; }
.entry-name { display: flex; min-width: 0; align-items: center; gap: 9px; color: #edf5ff !important; font-weight: 660; }.entry-name svg { flex: 0 0 auto; color: #52a9fa; }.entry-name span { overflow: hidden; text-overflow: ellipsis; }.entry-checkbox { display: inline-flex; width: 18px; height: 18px; align-items: center; justify-content: center; border: 1px solid #5f7695; border-radius: 5px; color: #06121f; background: #0d1d30; }.entry-checkbox.checked { border-color: #62b3ff; background: #62b3ff; }.table-select-all { padding: 0; cursor: pointer; }.table-select-all.partial span { display: block; width: 9px; height: 2px; border-radius: 2px; background: #62b3ff; }.table-select-all:disabled { cursor: not-allowed; }
.empty-row, .error-row { height: 120px !important; text-align: center; }.error-row { color: #ff9b9b !important; }.picker-loading { position: absolute; inset: 40px 0 0; display: grid; place-items: center; color: #92a8c4; background: rgba(8, 20, 34, .78); font-size: 13px; }.unified-picker-status { display: flex; min-height: 36px; align-items: center; justify-content: space-between; gap: 10px; padding: 0 14px; border-top: 1px solid rgba(88, 126, 177, .24); color: #778da9; background: #0c192a; font-size: 11px; }.selection-actions { display: flex; gap: 7px; }.selection-actions button { display: inline-flex; align-items: center; gap: 5px; height: 26px; padding: 0 8px; border: 1px solid rgba(87, 131, 185, .38); border-radius: 6px; color: #aec5df; background: #12263e; cursor: pointer; font-size: 11px; font-weight: 650; }.selection-actions button:hover:not(:disabled) { color: #fff; border-color: rgba(88, 172, 255, .72); background: #1c385b; }.format-hint { white-space: nowrap; }
.unified-picker-selected { display: flex; min-width: 0; min-height: 0; flex-direction: column; gap: 12px; padding: 16px; background: #0d1a2b; }.unified-picker-selected > div:first-child { display: flex; align-items: center; justify-content: space-between; color: #e7f0fc; font-size: 13px; }.unified-picker-selected > div:first-child span { color: #65b2ff; font-weight: 750; }.unified-picker-selected > p { margin: auto 8px; color: #7187a4; font-size: 12px; line-height: 1.7; text-align: center; }.selected-source-list { display: grid; min-height: 0; gap: 8px; overflow: auto; }.selected-source-item { display: grid; grid-template-columns: minmax(0, 1fr) 28px; align-items: center; gap: 7px; min-height: 40px; padding: 4px 5px 4px 10px; border: 1px solid rgba(81, 124, 180, .34); border-radius: 8px; background: #12253d; }.selected-source-item span { overflow: hidden; color: #c8d7e9; font-size: 11px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }.selected-source-item button { display: inline-flex; width: 28px; height: 28px; align-items: center; justify-content: center; border: 0; border-radius: 6px; color: #91a5c0; background: transparent; cursor: pointer; }.selected-source-item button:hover { color: #ff9b9b; background: rgba(215, 67, 67, .15); }
.unified-picker-actions { display: flex; min-height: 68px; align-items: center; justify-content: space-between; gap: 20px; padding: 0 18px; border-top: 1px solid rgba(88, 126, 177, .3); color: #8499b5; background: #111f32; font-size: 12px; }.unified-picker-actions > div { display: flex; gap: 10px; }.unified-picker-actions button { min-width: 100px; }button:disabled { cursor: not-allowed; opacity: .45; }
@media (max-width: 1200px) { .unified-picker { width: calc(100vw - 24px); }.unified-picker-body { grid-template-columns: 190px minmax(0, 1fr) 230px; } }
@media (max-width: 980px) { .unified-picker { height: calc(100vh - 24px); min-height: 0; }.unified-picker-backdrop { padding: 12px; }.unified-picker-body { grid-template-columns: 176px minmax(0, 1fr); }.unified-picker-selected { display: none; }.unified-picker-toolbar { grid-template-columns: 38px 38px minmax(180px, 1fr) 38px; }.unified-picker-search { grid-column: 1 / -1; min-height: 36px; }.unified-picker-table th:nth-child(3), .unified-picker-table td:nth-child(3), .unified-picker-table th:nth-child(5), .unified-picker-table td:nth-child(5) { display: none; } }
@media (max-width: 720px) { .unified-picker-body { grid-template-columns: 154px minmax(0, 1fr); }.tree-group { padding-inline: 4px; }.tree-row { padding-left: calc(var(--tree-depth) * 10px); }.unified-picker-table th:nth-child(4), .unified-picker-table td:nth-child(4), .format-hint { display: none; }.unified-picker-status { padding-inline: 8px; }.selection-actions button { padding-inline: 6px; }.selection-actions button svg { display: none; } }
</style>
