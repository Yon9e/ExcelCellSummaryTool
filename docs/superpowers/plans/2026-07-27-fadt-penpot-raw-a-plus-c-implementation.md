# FADT Penpot RAW A+C Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将自托管 Penpot 的 `FADT UI Baseline / RAW` 重构为已确认的 A+C 审计工作台，并保持 Release v0.2.8 的功能结构与空白初始化状态。

**Architecture:** 主页面复用 A 型完整侧栏、顶栏、页面标题、模块标签与内容卡结构；高密度页面复用 C 型图标栏、上下文导航和主任务工作区。实施采用“先快照、再分批重建、最后结构与视觉双重验收”，只修改 RAW 页面，不修改 `FADT Dashboard Baseline` 和共享库。

**Tech Stack:** 自托管 Penpot、Penpot MCP `execute_code`、可编辑 Penpot 文本和矢量图形、Release v0.2.8 页面结构

## Global Constraints

- 仅修改自托管 Penpot `http://127.0.0.1:9001` 中的 `FADT UI Baseline / RAW`。
- `FADT Dashboard Baseline` 页面及共享库不得发生变化。
- RAW 保持 13 个画板，名称、顺序和尺寸均固定；每个画板为 1440×900。
- 页面初始化数据默认都为空，不添加虚构公司、路径、金额、任务数量或识别结果。
- 所有业务文字必须是可编辑文本，不得转成图片。
- 主页面使用 A 型；高密度页面使用 C 型；规则配置主页面为 A 型、表格工作区借用 C 型密度。
- 中文使用 `Noto Sans SC`；英文、数字、版本使用 `Inter Tight`。
- 核心正文与控件文字不得小于 13 px。
- 主操作使用紫色；信息使用蓝/青；成功使用绿色；警告使用橙色；危险使用红色。
- 同一容器最多使用一个主强调色和一个状态色。
- 不发布 GitHub Release，不修改 FADT 业务源码。

---

## Penpot 对象结构

### 保留页面

- `RAW`：覆盖旧画板内容并保留页面本身。
- `FADT Dashboard Baseline`：只读参考。

### RAW 画板

1. `00 · 启动默认页 · 数据源配置`
2. `01-1 · 汇总 · 方案管理`
3. `01-2 · 汇总 · 规则配置`
4. `01-3 · 汇总 · 执行与日志`
5. `02-1 · 截图识字 · 初始`
6. `02-2 · 截图识字 · Umi-OCR 设置`
7. `03 · 文本清洗 · 初始`
8. `04 · 关于`
9. `05-1 · 数据源选择 · 初始`
10. `05-2 · 图片生成规则 · 初始`
11. `05-3 · Sheet 匹配冲突 · 初始`
12. `06-1 · 使用手册`
13. `06-2 · 正则表达式教程`

### 共享视觉构件

- `A/Shell/Sidebar`：216 px 完整侧栏。
- `A/Shell/Topbar`：48–56 px 顶栏。
- `A/PageHeader`：眉题、标题、说明、单一主操作。
- `A/ModuleTabs`：汇总四标签。
- `C/Shell/IconRail`：64–72 px 图标栏。
- `C/Shell/ContextNav`：184–216 px 上下文导航。
- `Common/Card`、`Common/Button`、`Common/Input`、`Common/Badge`、`Common/EmptyState`、`Common/TableToolbar`。

---

### Task 1: 建立修改前快照与保护基线

**Penpot objects:**
- Read: `FADT UI Baseline / RAW`
- Read: `FADT UI Baseline / FADT Dashboard Baseline`
- Create: Penpot 保存版本 `FADT RAW · before A+C redesign`

**Interfaces:**
- Consumes: 当前自托管 Penpot MCP 连接。
- Produces: RAW 与 Baseline 的画板清单、尺寸、文本/图片计数和 Baseline 参考对象 ID。

- [x] **Step 1: 读取文件和页面总览**

使用 `high_level_overview` 确认文件名、RAW 页面、Baseline 页面、当前 13 个画板及其对象 ID。

- [x] **Step 2: 保存修改前版本**

在 Penpot 中保存版本 `FADT RAW · before A+C redesign`，作为可恢复点。

- [x] **Step 3: 记录结构基线**

通过 `execute_code` 输出：

```javascript
const pages = penpot.root.children;
return pages.map(page => ({
  name: page.name,
  boards: page.children
    .filter(shape => shape.type === "board")
    .map(board => ({ id: board.id, name: board.name, width: board.width, height: board.height }))
}));
```

预期：RAW 为 13 个画板；Baseline 至少包含一个 1440×1080 参考画板。

- [x] **Step 4: 导出参考缩略图**

导出 Baseline 参考画板和 RAW 的第 1、3、9 个画板，用于重构前后视觉比较。

---

### Task 2: 建立 A+C 视觉构件与语义色

**Penpot objects:**
- Modify: `RAW` 页面内各画板的重复外壳与通用组件。
- Preserve: `FADT Dashboard Baseline` 页面与共享库。

**Interfaces:**
- Consumes: Task 1 的 Baseline 参考对象与结构快照。
- Produces: 可复制的 A 型外壳、C 型外壳和通用视觉构件。

- [x] **Step 1: 创建 A 型外壳**

在 RAW 第一个画板内建立：

- 216 px 左侧栏，背景 `#2E283A`；
- 52 px 顶栏，背景采用 `#2B2637` 或同层级颜色；
- 主画布背景 `#242031`；
- 当前模块紫色底、青色 3 px 活动轨；
- 24 px 内容区安全边距。

- [x] **Step 2: 创建 C 型外壳**

在第一个高密度画板内建立：

- 68 px 图标栏；
- 200 px 上下文导航；
- 剩余空间作为主工作区；
- 顶部返回、标题、说明和必要操作；
- 上下文激活项使用蓝青信息色，主模块仍保留紫色品牌定位。

- [x] **Step 3: 统一控件尺寸**

建立并复用以下尺寸：

| 控件 | 尺寸 |
|---|---|
| 主/次按钮 | 高 38 px |
| 输入框/下拉框 | 高 40 px |
| 表格行 | 高 44–48 px |
| 图标 | 16–20 px |
| 一级导航图标 | 20–22 px |
| 卡片圆角 | 12 px |
| 输入与按钮圆角 | 8 px |

- [x] **Step 4: 应用语义色**

- 主操作与品牌：`#7C3AED` / `#5B2CCB`
- 信息与文件：`#0EA5E9` / `#06B6D4`
- 成功：`#10B981`
- 警告：`#F59E0B`
- 危险：`#EF4444`
- 主文字：`#F4F1F8`
- 次文字：`#B7AFC0`
- 弱文字：`#81788E`

- [x] **Step 5: 验证构件**

导出 A、C 两个外壳缩略图，确认：

- 没有超出 1440×900；
- 13 px 正文仍可读；
- 主操作和危险操作颜色明确区分；
- 图标均为同一线性风格，不使用 Emoji。

---

### Task 3: 重建 A 型主页面

**Penpot objects:**
- Modify: RAW 画板 1、2、3、4、5、7、8。

**Interfaces:**
- Consumes: Task 2 的 A 型外壳和通用构件。
- Produces: 7 个完成的 A 型主页面。

- [x] **Step 1: 重建启动默认页与数据源配置**

页面内容：

- 标题“数据源配置”；
- 汇总四标签；
- “选择数据源”单一主按钮；
- 目标文件/文件夹、输出文件、关键词、筛选模式；
- 空状态“尚未选择数据源”；
- 不显示任何实际路径、文件数或任务数据。

- [x] **Step 2: 重建方案管理**

页面内容：

- 新建方案、载入方案、保存方案；
- 当前方案为空；
- 最近保存时间显示“尚未保存”；
- 主工作区为空状态，不列示虚构方案。

- [x] **Step 3: 重建规则配置**

页面内容：

- 图片生成规则、新增规则、删除选中、填充示例规则；
- 表头包含全选框、拖动区、输出列名、Sheet 模式、Sheet 值、单元格；
- 空状态“暂无规则”；
- 复选框、拖动手柄保持行内安全边距；
- 危险删除使用红色，图片规则使用蓝色信息色。

- [x] **Step 4: 重建执行与日志**

页面内容：

- 运行任务主按钮；
- 预计时间区域显示“等待数据源与规则”；
- 日志分级使用蓝、绿、橙、红；
- 初始日志为空。

- [x] **Step 5: 重建截图识字初始页**

页面内容：

- 添加图片、读取剪贴板、识别图片；
- OCR 服务状态使用蓝色信息徽标；
- 图片列表、预览与结果区均为空；
- Umi-OCR 设置作为次操作入口。

- [x] **Step 6: 重建文本清洗初始页**

页面内容：

- 四个清洗选项；
- 符号标准化、正则输入和开关；
- 原始内容、清洗结果双栏；
- 初始字符数均为 0，文本区为空。

- [x] **Step 7: 重建关于页**

页面内容：

- FADT 产品名、全称和一句话定位；
- 版本号以英文/数字字体展示；
- 功能、隐私、开源许可分卡呈现；
- 使用紫、蓝、绿三类图标区分信息，不添加宣传性统计数据。

- [x] **Step 8: 批量验收 A 型页面**

通过 `execute_code` 检查这 7 个画板：

- 尺寸全部为 1440×900；
- 均存在侧栏、顶栏和页面标题；
- 无图片化业务文字；
- 初始化值为空；
- 每页强主按钮不超过 1 个。

---

### Task 4: 重建 C 型高密度工作页

**Penpot objects:**
- Modify: RAW 画板 6、9、10、11、12、13。

**Interfaces:**
- Consumes: Task 2 的 C 型外壳和通用构件。
- Produces: 6 个完成的 C 型工作页。

- [x] **Step 1: 重建 Umi-OCR 设置**

页面内容：

- 返回截图识字；
- 服务地址、启动方式、语言、诊断状态；
- 保存设置为主操作；
- 测试连接使用蓝色次操作；
- 状态默认为“未检测”。

- [x] **Step 2: 重建数据源选择**

页面内容：

- 返回数据源配置；
- 左侧图标栏与目录上下文区；
- 中央文件/文件夹表格；
- 右侧已选数据源；
- 表头全选、搜索、路径栏、刷新；
- 双击进入文件夹的说明；
- 初始选择数为 0，不放真实目录和文件名。

- [x] **Step 3: 重建图片生成规则**

页面内容：

- 返回规则配置；
- 左侧图片来源与可缩放预览；
- 中央 OCR 表格工作区；
- 右侧候选规则；
- 输出列名、目标数据模式；
- 初始图片、单元格、候选规则均为空。

- [x] **Step 4: 重建 Sheet 匹配冲突**

页面内容：

- 返回执行与日志；
- 冲突摘要、文件/Sheet 列表、候选匹配与处理策略；
- 警告使用橙色；
- 确认处理使用紫色主操作；
- 默认无冲突记录。

- [x] **Step 5: 重建使用手册**

页面内容：

- 返回原页面；
- 左侧章节导航；
- 右侧正文区；
- 当前章节使用蓝青激活色；
- 仅显示产品功能说明，不添加虚构操作记录。

- [x] **Step 6: 重建正则表达式教程**

页面内容：

- 返回文本清洗；
- 左侧教程章节；
- 右侧规则说明、代码示例和注意事项；
- 示例代码保持可编辑文本；
- 代码区域使用独立深色卡片和信息蓝强调。

- [x] **Step 7: 批量验收 C 型页面**

确认：

- 所有页面都有返回入口；
- 核心文字不小于 13 px；
- 图标栏、上下文导航和主工作区层级清楚；
- 高密度内容不依靠整体缩放塞入画板；
- 初始数据为空。

---

### Task 5: 全局视觉、结构与回归验收

**Penpot objects:**
- Read/Modify: RAW 13 个画板。
- Read only: Baseline 页面。
- Create: Penpot 保存版本 `FADT RAW · A+C UI Baseline`

**Interfaces:**
- Consumes: Tasks 1–4 的 13 个完成画板和修改前快照。
- Produces: 验收通过的最终 RAW 与可回滚版本。

- [x] **Step 1: 执行结构检查**

通过 `execute_code` 返回每个画板：

```javascript
return rawPage.children
  .filter(shape => shape.type === "board")
  .map(board => ({
    name: board.name,
    width: board.width,
    height: board.height,
    textCount: board.findAll(shape => shape.type === "text").length,
    imageCount: board.findAll(shape => shape.type === "image").length
  }));
```

预期：

- 13 个画板；
- 名称和顺序与计划一致；
- 全部 1440×900；
- 业务文字均为文本层。

- [x] **Step 2: 检查越界与重叠**

检查所有画板直接子层和关键容器边界；修正：

- 画板外对象；
- 标题、导航和操作按钮重叠；
- 文字裁切；
- 表格控件溢出；
- 安全边距不足。

- [x] **Step 3: 检查颜色与图标一致性**

逐页确认：

- 紫色只承担品牌与主操作；
- 蓝青承担信息和当前工作区；
- 绿色、橙色、红色只承担状态；
- 无 Emoji；
- 同一容器不超过一个强调色和一个状态色。

- [x] **Step 4: 回归保护 Baseline**

重新读取 `FADT Dashboard Baseline` 的画板数、尺寸和顶层对象数量，与 Task 1 快照一致。

- [x] **Step 5: 导出验收缩略图**

至少导出：

1. 启动默认页；
2. 规则配置；
3. 截图识字；
4. 数据源选择；
5. 图片生成规则；
6. 关于。

对照 Baseline 检查整体层级、密度和配色。

- [x] **Step 6: 保存最终版本**

保存 Penpot 版本 `FADT RAW · A+C UI Baseline`。

- [x] **Step 7: 记录完成结果**

在计划末尾补充：

- 最终版本名称；
- 13 个画板检查结果；
- Baseline 未变检查结果；
- 已导出缩略图清单；
- 尚存限制（如有）。

## 执行结果

- 最终版本：`FADT RAW · A+C UI Baseline`
- RAW：13 个画板全部为 1440×900；名称完整，无多余画板。
- 内容：495 个可编辑文本层；无图片对象、Emoji、真实 Windows 路径或示例金额。
- 版式：所有对象均位于所属画板内；无 `auto-height` 遗留；文本行高统一为 1.45。
- 交互表达：6 个 C 型高密度页面均包含返回控件；空白初始状态与 v0.2.8 Release 一致。
- 颜色：紫、蓝、青、绿、橙、红六类语义色均已应用。
- Baseline 回归：`FADT Dashboard Baseline` 仍为 1 个 1440×1080 画板，126 个直接子对象、127 个后代对象、86 个文本对象、0 个图片对象，与修改前快照一致。
- 验收缩略图：启动默认页、规则配置、截图识字、Umi-OCR 设置、数据源选择、图片生成规则、关于。
- 尚存限制：本次只更新 Penpot 设计基线，不修改 FADT Release 或业务代码。
