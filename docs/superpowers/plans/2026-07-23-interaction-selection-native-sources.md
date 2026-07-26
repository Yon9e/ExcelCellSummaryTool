# 交互选择与原生数据源 Implementation Plan（历史记录）

> 本计划中的原生文件/文件夹双入口已被后续需求替代。当前数据源交互以 `AGENTS.md`、`CONTEXT.md`、`docs/DEVELOPMENT.md`、源码和测试为准，不要按本文恢复旧实现。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 FADT 的截图规则导入、规则表和数据源配置实现可靠的多选交互、原生 Windows 选择器及重复文件决策。

**Architecture:** 保留现有 Vue/Tauri 分层。纯选择逻辑抽到 TypeScript 模块并先用 Vitest 覆盖；Vue 组件只保存状态和绑定 Pointer 事件；递归源文件预检及任务期去重开关放入 Rust，确保提示结果与实际汇总一致。

**Tech Stack:** Vue 3 Composition API、TypeScript、Vitest、Tauri 2 Dialog、Rust 标准库。

## Global Constraints

- 仅输出列名 OCR 文本可经确认后编辑；坐标和目标数据必须只读。
- 截图预览：滚轮缩放，中键二维平移，永久水平/垂直滚动条；右键不拦截。
- OCR 网格默认行高、列宽、文字均为现有基准的 0.5 倍。
- 拖选范围若与当前选择相交则逐格反选，否则逐格加入；边缘自动滚动时持续更新范围。
- 规则排序只允许从六点手柄开始；输入框、下拉框焦点内不得触发行多选。
- 数据源用两个 Windows 原生入口累加文件和文件夹；路径重复仅按规范化绝对路径判断。
- 发现实际 Excel 文件重复时必须提供自动去重、保留重复、返回修改；旧方案默认继续去重。
- 本计划不发布 GitHub Release，不删除用户文件或方案。

---

## 文件结构

- `src/ruleImageSelection.ts`：OCR 网格范围切换、配对冲突报告。
- `src/ruleImageSelection.test.ts`：OCR 网格逻辑的 Vitest 回归测试。
- `src/ruleSelection.ts`（新建）：规则 ID 的单击、范围切换、批量复制/删除纯函数。
- `src/ruleSelection.test.ts`（新建）：规则选择和批处理测试。
- `src/RuleImageImporter.vue`：截图视口、自动滚动、双击输出列名确认、半尺寸网格。
- `src/App.vue`：原生对话框、重复文件决策弹窗、规则表绑定。
- `src/types.ts`：`Rule` 稳定 ID、方案/请求去重开关、源预检数据结构。
- `src/sourcePaths.ts`、`src/sourcePaths.test.ts`：源项追加、Windows 路径键及选择模式。
- `src-tauri/src/file_filter.rs`：递归源预检和可切换的实际文件去重。
- `src-tauri/src/models.rs`：方案和汇总请求的 `deduplicate_sources` 默认兼容。
- `src-tauri/src/lib.rs`：暴露异步源预检命令。
- `src-tauri/src/excel_summary.rs`：按请求开关执行实际文件去重。

---

### Task 1: OCR 网格选择的集合切换和配对验证

**Files:**
- Modify: `src/ruleImageSelection.ts`
- Modify: `src/ruleImageSelection.test.ts`

**Interfaces:**
- Produces `toggleCellRange(cells, selected, startId, endId): Set<string>`。
- Produces `RowSelectionPairResult.duplicateOutputRowIndexes: number[]`。
- `buildRowSelectionPairs` 在任何目标行拥有零个或多个输出列名时显式报告，只有恰一个才生成配对。

- [ ] **Step 1: 写入失败测试：范围未相交时追加，范围相交时逐格反选。**

```ts
it("拖选会保留既有选择，并对相交范围逐格反选", () => {
  const initiallySelected = new Set(["A1"]);
  expect([...toggleCellRange(cells, initiallySelected, "B2", "B3")])
    .toEqual(["A1", "B2", "B3"]);
  expect([...toggleCellRange(cells, new Set(["A1", "B2"]), "A1", "B2")])
    .toEqual([]);
});

it("同一行多输出列名会阻止配对并报告冲突行", () => {
  const result = buildRowSelectionPairs([cells[0], cells[1]], [cells[1]], {});
  expect(result.duplicateOutputRowIndexes).toEqual([0]);
  expect(result.pairs).toEqual([]);
});
```

- [ ] **Step 2: 运行失败测试。**

Run: `npm.cmd test -- --run src/ruleImageSelection.test.ts`
Expected: FAIL，提示 `toggleCellRange` 或 `duplicateOutputRowIndexes` 不存在。

- [ ] **Step 3: 实现最小选择和验证逻辑。**

```ts
export function toggleCellRange(
  cells: SelectableCell[], selected: ReadonlySet<string>, startId: string, endId: string,
): Set<string> {
  const range = selectCellRange(cells, startId, endId);
  const shouldInvert = [...range].some((cellId) => selected.has(cellId));
  const next = new Set(selected);
  for (const cellId of range) {
    if (shouldInvert && next.has(cellId)) next.delete(cellId);
    else next.add(cellId);
  }
  return next;
}
```

删除 `toggleSingleCellPerRow` 的调用路径，但可暂时保留函数以避免不相关调用中断。`buildRowSelectionPairs` 用 `Map<number, SelectableCell[]>` 收集输出，再以数量 `!== 1` 填充缺失/冲突数组；仅在数量等于一时创建 pair。

- [ ] **Step 4: 运行测试验证通过。**

Run: `npm.cmd test -- --run src/ruleImageSelection.test.ts`
Expected: PASS。

- [ ] **Step 5: 记录本任务完成。**

不提交，因为工作目录已有同一功能链的未提交改动；在最终用户验收后统一整理提交范围。

---

### Task 2: 建立规则行多选的纯函数模型

**Files:**
- Create: `src/ruleSelection.ts`
- Create: `src/ruleSelection.test.ts`
- Modify: `src/types.ts`

**Interfaces:**
- `Rule` 增加 `id: string`；`createRuleId(): string` 仅在前端创建新规则时使用。
- `toggleRuleSelection(selectedIds, ruleId, additive): Set<string>`。
- `toggleRuleRange(allIds, selectedIds, startId, endId): Set<string>`。
- `duplicateSelectedRules(rules, selectedIds): { rules: Rule[]; selectedIds: Set<string> }`。
- `deleteSelectedRules(rules, selectedIds): Rule[]`。

- [ ] **Step 1: 写入失败测试：规则复制顺序、范围反选和稳定 ID。**

```ts
it("已勾选的规则按原顺序复制到最后一条源规则之后", () => {
  const source = fixtureRules();
  const result = duplicateSelectedRules(source, new Set(["r1", "r3"]));
  expect(result.rules.map((rule) => rule.output_column))
    .toEqual(["货币资金", "营业收入", "第一张", "货币资金", "第一张"]);
  expect([...result.selectedIds]).toEqual([result.rules[3].id, result.rules[4].id]);
});

it("范围中含已选行时逐行反选", () => {
  expect([...toggleRuleRange(["r1", "r2", "r3"], new Set(["r2"]), "r1", "r3")])
    .toEqual(["r1", "r3"]);
});
```

- [ ] **Step 2: 运行失败测试。**

Run: `npm.cmd test -- --run src/ruleSelection.test.ts`
Expected: FAIL，模块尚未创建。

- [ ] **Step 3: 创建最小实现并给旧方案补 ID。**

```ts
export function toggleRuleRange(
  allIds: string[], selectedIds: ReadonlySet<string>, startId: string, endId: string,
): Set<string> {
  const start = allIds.indexOf(startId); const end = allIds.indexOf(endId);
  if (start < 0 || end < 0) return new Set(selectedIds);
  const range = allIds.slice(Math.min(start, end), Math.max(start, end) + 1);
  const invert = range.some((id) => selectedIds.has(id));
  const next = new Set(selectedIds);
  for (const id of range) { if (invert && next.has(id)) next.delete(id); else next.add(id); }
  return next;
}
```

复制时使用对象展开保留规则字段、生成新 `id`；插入位置是选中规则的最大索引加一。`types.ts` 中 `Rule.id` 使用可选字段兼容历史 JSON，前端 `ensureRuleIds` 将缺失 ID 的规则映射为新增 ID。

- [ ] **Step 4: 运行测试验证通过。**

Run: `npm.cmd test -- --run src/ruleSelection.test.ts src/ruleOrdering.test.ts`
Expected: PASS。

- [ ] **Step 5: 记录本任务完成。**

不提交；继续使用同一未提交功能链。

---

### Task 3: 将截图导入器接入视口、自动滚动和只读边界

**Files:**
- Modify: `src/RuleImageImporter.vue`
- Modify: `src/styles.css`
- Modify: `src/RuleImageImporter.test.ts`

**Interfaces:**
- 消费 Task 1 的 `toggleCellRange` 和配对冲突信息。
- DOM 引用：`previewViewport`、`detectedSheetViewport`。
- 视口状态：`previewZoom`、`isPreviewPanning`、`sheetDragState`、`sheetAutoScrollFrame`。

- [ ] **Step 1: 写入失败测试：配对冲突与编辑边界的用户可见提示。**

```ts
it("同一行选择多个输出列名时提示冲突且不执行配对填充", async () => {
  const wrapper = mountImporterWithRecognizedCells();
  await selectOutputCells(wrapper, ["A1", "B1"]);
  await selectDataCells(wrapper, ["B1"]);
  await wrapper.get("button", { name: "配对填充" }).trigger("click");
  expect(wrapper.text()).toContain("输出列名只能选择一个");
});

it("目标数据模式双击单元格不会打开编辑确认", async () => {
  const wrapper = mountImporterWithRecognizedCells({ selectionTarget: "data" });
  await wrapper.get('[data-cell-id="A1"]').trigger("dblclick");
  expect(wrapper.text()).not.toContain("修改输出列名");
});
```

- [ ] **Step 2: 运行失败测试。**

Run: `npm.cmd test -- --run src/RuleImageImporter.test.ts`
Expected: FAIL，冲突提示或只读边界尚未实现。

- [ ] **Step 3: 实现视口、选择和编辑。**

1. 给预览容器 `ref="previewViewport" tabindex="0"`；去掉 `object-fit: contain`，使用缩放后的实际图片宽高。
2. `wheel.prevent` 以指针相对图片比例计算新的 `scrollLeft/scrollTop`，并把 `previewZoom` 限制为 `0.25..4`。
3. 只在 `event.button === 1` 时开启 Pointer Capture；用滚动位置实现中键二维平移；`pointerup/pointercancel/onBeforeUnmount` 统一清理。
4. 检测表格使用 CSS 变量 `--sheet-cell-width: 58px`、`--sheet-cell-height: 25px`、`--sheet-font-size: 6px` 和对应坐标字体，替代原有 116px/50px/12px 基准。
5. 拖选只在网格 cell 上启动；调用 `toggleCellRange`，使用 `requestAnimationFrame` 基于指针距上下左右边缘的距离滚动容器；每帧依据 `document.elementFromPoint` 更新终点单元格。
6. 双击仅在 `selectionTarget === "output"` 时弹出本地确认编辑层；确认后写入 `editedCellTexts[cell.id]`，渲染和填充使用该覆盖文本；不修改 `address`。
7. `applyPairedSelection` 对 `duplicateOutputRowIndexes` 生成行号提示并 `return`。

- [ ] **Step 4: 运行组件和选择单元测试。**

Run: `npm.cmd test -- --run src/RuleImageImporter.test.ts src/ruleImageSelection.test.ts`
Expected: PASS。

- [ ] **Step 5: 手工验证截图导入器。**

Run: `npm.cmd run dev`
Expected: 在桌面应用中确认：滚轮缩放锚点、中键上下左右平移、双滚动条、半尺寸网格、四向边缘选择、输出名确认编辑和目标数据不可编辑。

---

### Task 4: 将规则表接入多选、批量操作和边缘滚动

**Files:**
- Modify: `src/App.vue`
- Modify: `src/styles.css`
- Modify: `src/ruleDragPreview.test.ts`

**Interfaces:**
- 消费 Task 2 的 `toggleRuleSelection`、`toggleRuleRange`、`duplicateSelectedRules` 和 `deleteSelectedRules`。
- `selectedRuleIds: Ref<Set<string>>` 为唯一多选来源。
- `ruleTableViewport: Ref<HTMLElement | null>` 用于范围拖选自动滚动。

- [ ] **Step 1: 写入失败测试：排序手柄不触发选择，复制和删除复选行。**

```ts
it("拖动六点手柄仅重新排序，不改变其他已勾选规则", () => {
  const result = reorderRules(fixtureRules(), 0, 2, null);
  expect(result.rules.map((rule) => rule.id)).toEqual(["r2", "r3", "r1"]);
});

it("批量删除按 ID 删除勾选规则", () => {
  expect(deleteSelectedRules(fixtureRules(), new Set(["r1", "r3"])).map((rule) => rule.id))
    .toEqual(["r2"]);
});
```

- [ ] **Step 2: 运行失败测试。**

Run: `npm.cmd test -- --run src/ruleSelection.test.ts src/ruleDragPreview.test.ts`
Expected: FAIL，测试所需的新状态/函数尚不存在。

- [ ] **Step 3: 接入界面状态与事件边界。**

1. 载入、创建和图片导入规则时调用 `ensureRuleIds`，不再保存/比较选择索引。
2. 表头新增全选复选框；每行在六点旁新增复选框，`checked` 由 `selectedRuleIds.has(rule.id)` 推导。
3. `<tr>` 的 `pointerdown/move/up` 只在目标不匹配 `input, select, button, label` 时处理；普通点击、Ctrl 点击和拖动范围调用 Task 2 函数。
4. 拖动排序沿用现有 overlay，但改为传入、保留 `selectedRuleIds`，删除排序中 `selectedRuleIndex` 的所有赋值。
5. 表体外层添加 `ref="ruleTableViewport"`，当拖选指针靠近上下边缘时按上限速度滚动，并用当前行 ID 扩展范围。
6. `addRule`：有选择则调用 `duplicateSelectedRules`，无选择则 append 一条 `createEmptyRule()`；`deleteSelectedRule` 改为批量删除并在无选择时警告。

- [ ] **Step 4: 运行测试验证通过。**

Run: `npm.cmd test -- --run src/ruleSelection.test.ts src/ruleOrdering.test.ts src/ruleDragPreview.test.ts`
Expected: PASS。

- [ ] **Step 5: 手工验证规则表。**

确认输入框/下拉框可编辑而不选行，空白区域 Ctrl/拖动多选和反选，表头全选、批量删除、复制插入顺序和六点排序均正确。

---

### Task 5: 接入原生数据源选择、预检和重复策略

**Files:**
- Modify: `src/types.ts`
- Modify: `src/sourcePaths.ts`
- Modify: `src/sourcePaths.test.ts`
- Modify: `src/App.vue`
- Modify: `src-tauri/src/models.rs`
- Modify: `src-tauri/src/file_filter.rs`
- Modify: `src-tauri/src/excel_summary.rs`
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- 前端 `SourcePreflightResult { duplicate_files: string[]; unreadable_sources: string[] }`。
- Rust `file_filter::preflight_source_paths(paths: &[String]) -> Result<SourcePreflightResult, String>`。
- Rust `SummaryRequest` 和 `Scheme` 增加 `#[serde(default = "default_deduplicate_sources")] pub deduplicate_sources: bool`，默认 `true`。
- TypeScript `Scheme` 和 `SummaryRequest` 增加 `deduplicate_sources: boolean`。

- [ ] **Step 1: 写入失败测试：源项保留重复与任务期可选去重。**

```rust
#[test]
fn preflight_reports_file_reached_by_folder_and_direct_path_twice() {
    let result = preflight_source_paths(&vec![folder_string, file_string]).unwrap();
    assert_eq!(result.duplicate_files, vec![canonical_file_string]);
}

#[test]
fn mixed_sources_can_preserve_duplicates_when_requested() {
    let files = collect_source_files(&paths, "", FILTER_MODE_INCLUDE, false).unwrap();
    assert_eq!(files.len(), 2);
}
```

```ts
it("追加源路径时可保留原始重复项供用户选择保留重复", () => {
  expect(appendSourcePaths(["D:\\A.xlsx"], ["d:\\a.xlsx"]))
    .toEqual(["D:\\A.xlsx", "d:\\a.xlsx"]);
});
```

- [ ] **Step 2: 运行失败测试。**

Run: `cargo test preflight_reports_file_reached_by_folder_and_direct_path_twice mixed_sources_can_preserve_duplicates_when_requested`
Expected: FAIL，预检接口和去重开关不存在。

Run: `npm.cmd test -- --run src/sourcePaths.test.ts`
Expected: FAIL，`appendSourcePaths` 不存在。

- [ ] **Step 3: 实现共享递归预检和实际汇总开关。**

1. `file_filter.rs` 抽出 `collect_source_files(paths, keyword, filter_mode, deduplicate)`：各路径使用既有 `list_excel_files`，规范化为 `fs::canonicalize` 后按 Windows 小写字符串分组；`deduplicate=true` 仅保留每组第一个，`false` 保留全部。
2. `preflight_source_paths` 用空关键词递归收集，返回出现次数大于一的规范化绝对路径及不可访问路径；不写文件。
3. `excel_summary.rs::source_files_for_request` 改用共享函数，并保留输出文件排除逻辑。
4. `models.rs` 对缺失 `deduplicate_sources` 使用 `true`；旧 JSON 方案加载后保持旧版不重复处理。
5. 在 `lib.rs` 注册 `preflight_source_paths`，通过 `spawn_blocking` 执行。
6. 前端用 Tauri `open`：文件按钮 `multiple: true` 和四种 Excel 扩展过滤；文件夹按钮 `directory: true, multiple: true`。选中路径追加而不提前去重，调用预检。
7. 在 `App.vue` 加入重复决策模态框：自动去重将 `deduplicate_sources=true` 后追加；保留重复将其设为 `false` 后追加；返回修改不写入任何路径。不可访问路径在同一提示中列出。
8. 移除 `SourcePickerModal` 的 import、状态、模板入口和旧按钮，改为两个原生按钮；保留旧 Rust picker 命令，避免超出范围的删除。

- [ ] **Step 4: 运行 Rust 与前端测试。**

Run: `cargo test`（工作目录 `src-tauri`）
Expected: PASS。

Run: `npm.cmd test -- --run src/sourcePaths.test.ts src/summaryPrompt.test.ts`
Expected: PASS。

- [ ] **Step 5: 手工验证原生选择器。**

在桌面应用中反复添加多个文件和文件夹；验证 Windows 原生窗口出现、文件夹递归、重叠目录/直接文件提示三种决策、自动去重后任务仅处理一次、保留重复后任务按选择语义重复处理。

---

### Task 6: 全量验证与文档同步

**Files:**
- Modify: `docs/superpowers/specs/2026-07-23-interaction-selection-and-native-sources-design.md`（仅更新状态和最终验证结果）
- Modify: `docs/superpowers/plans/2026-07-23-interaction-selection-native-sources.md`（勾选完成项）

- [ ] **Step 1: 运行全量前端测试。**

Run: `npm.cmd test -- --run`
Expected: 全部 Vitest 测试通过。

- [ ] **Step 2: 运行静态检查和生产构建。**

Run: `npm.cmd run typecheck`
Expected: Exit code 0。

Run: `npm.cmd run build`
Expected: Exit code 0；只允许既有第三方纯注释警告。

Run: `cargo check`（工作目录 `src-tauri`）
Expected: Exit code 0。

- [ ] **Step 3: 运行差异与安全检查。**

Run: `git diff --check`
Expected: 无空白错误。

Run: `rg -n -i "(userToken|api[_-]?key|secret|password)\s*[:=]" src src-tauri`
Expected: 不出现本次功能引入的凭据。

- [ ] **Step 4: 更新设计和计划状态。**

将设计状态改为“已实施并验证”，勾选实际完成的计划步骤；记录测试数量、构建结论和未执行的发布操作。

## 计划自审

- [x] 设计中的所有截图、规则表、原生选择器和重复路径需求均映射到具体任务。
- [x] 每个生产逻辑任务均从失败测试开始，并列出明确的验证命令。
- [x] 规则 ID、选择集合、预检结构和去重布尔值在生产者/消费者间名称一致。
- [x] 没有把原生对话框无法混选的限制隐藏为不可实现承诺；两个入口累计到同一清单。
- [x] 没有包含发布、删除旧选择器模块或迁移用户数据等超出范围操作。
