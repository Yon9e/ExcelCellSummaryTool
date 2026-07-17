import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { confirm, message, open, save } from "@tauri-apps/plugin-dialog";
import {
  BookOpen,
  FileSpreadsheet,
  FolderOpen,
  GripVertical,
  Info,
  Plus,
  Rocket,
  Save,
  ScanSearch,
  Trash2,
} from "lucide-react";
import type {
  CurrentFileEvent,
  FilterMode,
  LogEvent,
  PageKey,
  ProgressEvent,
  Rule,
  Scheme,
  SheetChoice,
  SheetConflict,
  SheetMode,
  SummaryRequest,
  SummaryResult,
} from "./types";
import { getBrandSubtitle } from "./brandContent";
import { getRuleRowKey } from "./ruleKeys";
import { reorderRules } from "./ruleOrdering";
import { getSummaryCompletionPrompt } from "./summaryPrompt";
import { SupportWindowContent } from "./SupportWindowContent";
import { AboutPage } from "./AboutPage";
import { OcrPage } from "./OcrPage";
import { RuleImageImporter } from "./RuleImageImporter";
import { pages } from "./navigation";
import {
  getSupportViewFromSearch,
  getSupportWindowConfig,
  type SupportView,
} from "./supportWindows";

const emptyRule: Rule = {
  output_column: "",
  sheet_mode: "exact",
  sheet_value: "",
  cell: "",
};

const sampleRules: Rule[] = [
  {
    output_column: "货币资金",
    sheet_mode: "exact",
    sheet_value: "资产负债表",
    cell: "B7",
  },
  {
    output_column: "营业收入",
    sheet_mode: "contains",
    sheet_value: "利润",
    cell: "C12",
  },
  {
    output_column: "第一个 Sheet 样例",
    sheet_mode: "index",
    sheet_value: "1",
    cell: "A1",
  },
];

function getSheetConflictKey(conflict: SheetConflict): string {
  return `${conflict.file_path}::${conflict.rule_index}`;
}

function buildSheetChoices(
  conflicts: SheetConflict[],
  selectedSheets: Record<string, string>,
): SheetChoice[] {
  return conflicts.map((conflict) => ({
    file_path: conflict.file_path,
    rule_index: conflict.rule_index,
    sheet_name: selectedSheets[getSheetConflictKey(conflict)] ?? conflict.matched_sheets[0],
  }));
}

const brandSubtitle = getBrandSubtitle();
const supportView = getSupportViewFromSearch(window.location.search);

function App() {
  if (supportView !== "main") {
    return <SupportWindowContent view={supportView} />;
  }

  const [activePage, setActivePage] = useState<PageKey>("source");
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [selectedScheme, setSelectedScheme] = useState("");
  const [schemeName, setSchemeName] = useState("");
  const [targetFolder, setTargetFolder] = useState("");
  const [outputFile, setOutputFile] = useState("");
  const [keyword, setKeyword] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("include");
  const [rules, setRules] = useState<Rule[]>(sampleRules);
  const [selectedRuleIndex, setSelectedRuleIndex] = useState<number | null>(null);
  const [draggedRuleIndex, setDraggedRuleIndex] = useState<number | null>(null);
  const [dragOverRuleIndex, setDragOverRuleIndex] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [currentFile, setCurrentFile] = useState("-");
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [running, setRunning] = useState(false);
  const [sheetConflicts, setSheetConflicts] = useState<SheetConflict[]>([]);
  const [selectedSheets, setSelectedSheets] = useState<Record<string, string>>({});
  const [pendingRequest, setPendingRequest] = useState<SummaryRequest | null>(null);
  const [showRuleImageImporter, setShowRuleImageImporter] = useState(false);

  const activeTitle = pages.find((page) => page.key === activePage)?.label ?? "";
  const percent = total > 0 ? Math.round((processed / total) * 100) : 0;
  const selectedSchemeData = useMemo(
    () => schemes.find((scheme) => scheme.name === selectedScheme),
    [schemes, selectedScheme],
  );

  useEffect(() => {
    void refreshSchemes();
    const unlisteners = [
      listen<LogEvent>("summary-log", (event) => {
        appendLog(event.payload.level, event.payload.message);
      }),
      listen<ProgressEvent>("summary-progress", (event) => {
        setProcessed(event.payload.processed);
        setTotal(event.payload.total);
      }),
      listen<CurrentFileEvent>("summary-current-file", (event) => {
        setCurrentFile(event.payload.path);
      }),
    ];
    return () => {
      unlisteners.forEach((promise) => {
        void promise.then((unlisten) => unlisten());
      });
    };
  }, []);

  async function refreshSchemes() {
    try {
      const loaded = await invoke<Scheme[]>("load_schemes");
      setSchemes(loaded);
    } catch (error) {
      appendLog("WARN", String(error));
    }
  }

  function appendLog(level: LogEvent["level"], text: string) {
    const time = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    setLogs((items) => [...items, `[${time}] [${level}] ${text}`]);
  }

  function collectScheme(): Scheme {
    return {
      name: schemeName,
      target_folder: targetFolder,
      output_file: outputFile,
      keyword,
      filter_mode: filterMode,
      rules,
    };
  }

  async function saveCurrentScheme() {
    try {
      await invoke("save_scheme", { scheme: collectScheme() });
      appendLog("DONE", `方案已保存：${schemeName}`);
      await refreshSchemes();
      setSelectedScheme(schemeName);
    } catch (error) {
      await message(String(error), { title: "保存方案失败", kind: "error" });
    }
  }

  function loadSelectedScheme() {
    if (!selectedSchemeData) {
      return;
    }
    setSchemeName(selectedSchemeData.name);
    setTargetFolder(selectedSchemeData.target_folder);
    setOutputFile(selectedSchemeData.output_file);
    setKeyword(selectedSchemeData.keyword);
    setFilterMode(selectedSchemeData.filter_mode);
    setRules(selectedSchemeData.rules.length ? selectedSchemeData.rules : [emptyRule]);
    appendLog("INFO", `已载入方案：${selectedSchemeData.name}`);
  }

  async function deleteSelectedScheme() {
    if (!selectedScheme) {
      return;
    }
    const ok = await confirm(`确认删除方案“${selectedScheme}”？`, {
      title: "删除方案",
      kind: "warning",
    });
    if (!ok) {
      return;
    }
    await invoke("delete_scheme", { name: selectedScheme });
    appendLog("DONE", `方案已删除：${selectedScheme}`);
    setSelectedScheme("");
    await refreshSchemes();
  }

  async function browseTargetFolder() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "选择包含 Excel 文件的文件夹",
    });
    if (typeof selected === "string") {
      setTargetFolder(selected);
    }
  }

  async function browseOutputFile() {
    const selected = await save({
      title: "选择汇总结果输出路径",
      defaultPath: "汇总结果.xlsx",
      filters: [{ name: "Excel 工作簿", extensions: ["xlsx"] }],
    });
    if (typeof selected === "string") {
      setOutputFile(selected);
    }
  }

  function updateRule(index: number, patch: Partial<Rule>) {
    setRules((items) =>
      items.map((rule, ruleIndex) =>
        ruleIndex === index ? { ...rule, ...patch } : rule,
      ),
    );
  }

  function addRule() {
    setRules((items) => [...items, emptyRule]);
    setSelectedRuleIndex(rules.length);
  }

  function deleteSelectedRule() {
    if (selectedRuleIndex === null) {
      return;
    }
    setRules((items) => items.filter((_, index) => index !== selectedRuleIndex));
    setSelectedRuleIndex(null);
  }

  function appendImportedRules(importedRules: Rule[]) {
    setRules((items) => [...items, ...importedRules]);
    setSelectedRuleIndex(rules.length);
    setShowRuleImageImporter(false);
    appendLog("DONE", `已从标注截图追加 ${importedRules.length} 条规则。`);
  }

  function startRuleDrag(event: React.DragEvent<HTMLButtonElement>, index: number) {
    setDraggedRuleIndex(index);
    setDragOverRuleIndex(index);
    setSelectedRuleIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  }

  function dropRule(event: React.DragEvent<HTMLTableRowElement>, toIndex: number) {
    event.preventDefault();
    const transferIndex = Number(event.dataTransfer.getData("text/plain"));
    const fromIndex = draggedRuleIndex ?? transferIndex;

    if (Number.isInteger(fromIndex)) {
      const result = reorderRules(rules, fromIndex, toIndex, selectedRuleIndex);
      setRules(result.rules);
      setSelectedRuleIndex(result.selectedIndex);
    }

    setDraggedRuleIndex(null);
    setDragOverRuleIndex(null);
  }

  function endRuleDrag() {
    setDraggedRuleIndex(null);
    setDragOverRuleIndex(null);
  }

  async function runSummary() {
    if (running) {
      return;
    }
    const request: SummaryRequest = {
      target_folder: targetFolder,
      output_file: outputFile,
      keyword,
      filter_mode: filterMode,
      rules,
      sheet_choices: [],
    };

    if (!targetFolder || !outputFile) {
      await message("请先选择目标文件夹和输出文件。", {
        title: "配置不完整",
        kind: "warning",
      });
      return;
    }
    if (!rules.length) {
      await message("请至少配置一条规则。", {
        title: "规则为空",
        kind: "warning",
      });
      return;
    }
    const exists = await invoke<boolean>("path_exists", { path: outputFile });
    if (exists) {
      const overwrite = await confirm("输出文件已存在，是否覆盖？", {
        title: "确认覆盖",
        kind: "warning",
      });
      if (!overwrite) {
        return;
      }
    }

    try {
      const conflicts = await invoke<SheetConflict[]>("collect_sheet_conflicts", { request });
      if (conflicts.length > 0) {
        const initialSheets = Object.fromEntries(
          conflicts.map((conflict) => [
            getSheetConflictKey(conflict),
            conflict.matched_sheets[0],
          ]),
        );
        setSelectedSheets(initialSheets);
        setSheetConflicts(conflicts);
        setPendingRequest(request);
        appendLog(
          "WARN",
          `发现 ${conflicts.length} 处 Sheet 关键词命中多个 Sheet，请选择后继续。`,
        );
        return;
      }
    } catch (error) {
      await message(String(error), { title: "Sheet 冲突检查失败", kind: "error" });
      return;
    }

    await executeSummary(request);
  }

  async function executeSummary(request: SummaryRequest) {
    setRunning(true);
    setProcessed(0);
    setTotal(0);
    setCurrentFile("-");
    appendLog("INFO", "开始执行汇总。");
    try {
      const result = await invoke<SummaryResult>("run_summary", { request });
      appendLog(
        "DONE",
        `处理完成：${result.processed_files}/${result.total_files}，输出 ${result.output_path}`,
      );
      const shouldOpen = await confirm(getSummaryCompletionPrompt(), {
        title: "执行完成",
        kind: "info",
      });
      if (shouldOpen) {
        await invoke("open_output_file", { path: result.output_path });
      }
    } catch (error) {
      appendLog("ERROR", String(error));
      await message(String(error), { title: "汇总失败", kind: "error" });
    } finally {
      setRunning(false);
    }
  }

  function cancelSheetChoice() {
    setSheetConflicts([]);
    setSelectedSheets({});
    setPendingRequest(null);
    appendLog("INFO", "已取消 Sheet 选择。");
  }

  async function continueWithSheetChoices() {
    if (!pendingRequest) {
      return;
    }
    const request: SummaryRequest = {
      ...pendingRequest,
      sheet_choices: buildSheetChoices(sheetConflicts, selectedSheets),
    };
    setSheetConflicts([]);
    setSelectedSheets({});
    setPendingRequest(null);
    await executeSummary(request);
  }

  async function openHelpWindow() {
    const config = getSupportWindowConfig("help");
    const existing = await WebviewWindow.getByLabel(config.label);
    if (existing) {
      await existing.show();
      await existing.unminimize();
      await existing.setFocus();
      return;
    }
    const { label, ...windowOptions } = config;
    const supportWindow = new WebviewWindow(label, windowOptions);
    await supportWindow.once("tauri://error", (event) => {
      appendLog("ERROR", `打开${config.title}窗口失败：${String(event.payload)}`);
    });
  }

  return (
    <div className="app-shell">
      <aside className="side-nav">
        <div className="brand">
          <div className="brand-mark">
            <FileSpreadsheet size={26} />
          </div>
          <div>
            <h1>Financial Tool</h1>
            {brandSubtitle && <p>{brandSubtitle}</p>}
          </div>
        </div>
        <nav className="nav-list">
          {pages.map((page) => {
            const Icon = page.icon;
            return (
              <button
                key={page.key}
                className={activePage === page.key ? "nav-item active" : "nav-item"}
                onClick={() => setActivePage(page.key)}
              >
                <Icon size={22} />
                <span>{page.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="side-note">
          <p>非递归扫描目标目录</p>
          <p>支持 .xlsx / .xlsm / .xltx / .xltm</p>
          <p>公式读取已保存缓存值</p>
        </div>
      </aside>

      <main className="workspace">
        <header className="window-bar" data-tauri-drag-region>
          <div>
            <h2>Financial Tool 财务工具箱</h2>
            <p>Excel 定向汇总、截图识字与规则定位</p>
          </div>
          <div className="window-actions">
            <button className="soft-button" onClick={() => void openHelpWindow()}>
              <Info size={19} />
              帮助说明
            </button>
          </div>
        </header>

        <section className="content-panel" key={activePage}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">当前页面</p>
              <h3>{activeTitle}</h3>
            </div>
            {activePage === "rules" && (
              <div className="toolbar">
                <button className="soft-button" onClick={() => setShowRuleImageImporter(true)}>
                  <ScanSearch size={18} />
                  图片生成规则
                </button>
                <button className="soft-button" onClick={addRule}>
                  <Plus size={18} />
                  新增规则
                </button>
                <button className="danger-button" onClick={deleteSelectedRule}>
                  <Trash2 size={18} />
                  删除选中
                </button>
                <button className="soft-button" onClick={() => setRules(sampleRules)}>
                  <BookOpen size={18} />
                  填充示例规则
                </button>
              </div>
            )}
          </div>

          {activePage === "scheme" && (
            <div className="form-grid">
              <label>
                <span>方案名称</span>
                <input
                  value={schemeName}
                  onChange={(event) => setSchemeName(event.target.value)}
                  placeholder="方案名称"
                />
              </label>
              <label>
                <span>已保存方案</span>
                <select
                  value={selectedScheme}
                  onChange={(event) => setSelectedScheme(event.target.value)}
                >
                  <option value="">选择已保存方案</option>
                  {schemes.map((scheme) => (
                    <option key={scheme.name} value={scheme.name}>
                      {scheme.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="button-row">
                <button className="soft-button" onClick={saveCurrentScheme}>
                  <Save size={18} />
                  保存方案
                </button>
                <button className="soft-button" onClick={loadSelectedScheme}>
                  <FolderOpen size={18} />
                  载入方案
                </button>
                <button className="danger-button" onClick={deleteSelectedScheme}>
                  <Trash2 size={18} />
                  删除方案
                </button>
              </div>
            </div>
          )}

          {activePage === "source" && (
            <div className="form-grid">
              <label className="wide-field">
                <span>目标文件夹</span>
                <div className="input-action">
                  <input
                    value={targetFolder}
                    onChange={(event) => setTargetFolder(event.target.value)}
                    placeholder="选择包含 Excel 文件的文件夹"
                  />
                  <button className="soft-button" onClick={browseTargetFolder}>
                    浏览
                  </button>
                </div>
              </label>
              <label className="wide-field">
                <span>输出文件</span>
                <div className="input-action">
                  <input
                    value={outputFile}
                    onChange={(event) => setOutputFile(event.target.value)}
                    placeholder="选择汇总结果输出路径，建议 .xlsx"
                  />
                  <button className="soft-button" onClick={browseOutputFile}>
                    浏览
                  </button>
                </div>
              </label>
              <label>
                <span>关键词</span>
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="为空时处理全部符合条件的 Excel 文件"
                />
              </label>
              <label>
                <span>筛选模式</span>
                <select
                  value={filterMode}
                  onChange={(event) => setFilterMode(event.target.value as FilterMode)}
                >
                  <option value="include">包含关键词</option>
                  <option value="exclude">排除关键词</option>
                </select>
              </label>
            </div>
          )}

          {activePage === "rules" && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th
                      className="drag-column"
                      aria-label="拖动排序"
                      title="拖动左侧手柄调整规则顺序"
                    >
                      <GripVertical size={18} />
                    </th>
                    <th>输出列名</th>
                    <th>Sheet 模式</th>
                    <th>Sheet 值</th>
                    <th>单元格</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule, index) => (
                    <tr
                      key={getRuleRowKey(index)}
                      className={[
                        selectedRuleIndex === index ? "selected-row" : "",
                        dragOverRuleIndex === index && draggedRuleIndex !== index
                          ? "drag-over-row"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => setSelectedRuleIndex(index)}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        setDragOverRuleIndex(index);
                      }}
                      onDrop={(event) => dropRule(event, index)}
                    >
                      <td className="drag-cell">
                        <button
                          type="button"
                          className="drag-handle"
                          draggable
                          aria-label={`拖动第 ${index + 1} 条规则调整顺序`}
                          title="拖动调整顺序"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedRuleIndex(index);
                          }}
                          onDragStart={(event) => startRuleDrag(event, index)}
                          onDragEnd={endRuleDrag}
                        >
                          <GripVertical size={20} />
                        </button>
                      </td>
                      <td>
                        <input
                          value={rule.output_column}
                          onChange={(event) =>
                            updateRule(index, { output_column: event.target.value })
                          }
                        />
                      </td>
                      <td>
                        <select
                          value={rule.sheet_mode}
                          onChange={(event) =>
                            updateRule(index, { sheet_mode: event.target.value as SheetMode })
                          }
                        >
                          <option value="exact">exact - 精确匹配</option>
                          <option value="contains">contains - 包含关键词</option>
                          <option value="index">index - 按序号</option>
                        </select>
                      </td>
                      <td>
                        <input
                          value={rule.sheet_value}
                          onChange={(event) =>
                            updateRule(index, { sheet_value: event.target.value })
                          }
                        />
                      </td>
                      <td>
                        <input
                          value={rule.cell}
                          onChange={(event) => updateRule(index, { cell: event.target.value })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activePage === "run" && (
            <div className="run-layout">
              <div className="run-actions">
                <button className="primary-button" disabled={running} onClick={runSummary}>
                  <Rocket size={20} />
                  {running ? "正在汇总" : "开始汇总"}
                </button>
                <button className="soft-button" onClick={() => setLogs([])}>
                  清空日志
                </button>
                <div className="run-meta">当前处理文件：{currentFile}</div>
                <div className="run-count">
                  已处理 {processed} / {total}
                </div>
              </div>
              <div className="progress-bar">
                <div style={{ width: `${percent}%` }} />
                <span>{percent}%</span>
              </div>
              <pre className="log-console">{logs.join("\n")}</pre>
            </div>
          )}

          {activePage === "ocr" && <OcrPage onLog={appendLog} />}

          {activePage === "about" && <AboutPage />}
        </section>
      </main>

      {sheetConflicts.length > 0 && pendingRequest && (
        <div className="modal-backdrop" role="presentation">
          <div className="sheet-modal" role="dialog" aria-modal="true">
            <div className="sheet-modal-heading">
              <div>
                <p className="eyebrow">Sheet 匹配冲突</p>
                <h3>请选择实际要读取的 Sheet</h3>
              </div>
              <span>{sheetConflicts.length} 项</span>
            </div>
            <div className="sheet-conflict-list">
              {sheetConflicts.map((conflict) => {
                const key = getSheetConflictKey(conflict);
                return (
                  <label className="sheet-conflict-item" key={key}>
                    <span>
                      {conflict.file_name} / {conflict.output_column} / 关键词：
                      {conflict.sheet_value}
                    </span>
                    <select
                      value={selectedSheets[key] ?? conflict.matched_sheets[0]}
                      onChange={(event) =>
                        setSelectedSheets((items) => ({
                          ...items,
                          [key]: event.target.value,
                        }))
                      }
                    >
                      {conflict.matched_sheets.map((sheetName) => (
                        <option key={sheetName} value={sheetName}>
                          {sheetName}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>
            <div className="modal-actions">
              <button className="soft-button" onClick={cancelSheetChoice}>
                取消
              </button>
              <button className="primary-button" onClick={() => void continueWithSheetChoices()}>
                使用选择继续汇总
              </button>
            </div>
          </div>
        </div>
      )}

      {showRuleImageImporter && (
        <RuleImageImporter
          onClose={() => setShowRuleImageImporter(false)}
          onAppend={appendImportedRules}
        />
      )}

    </div>
  );
}

export default App;
