import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Check, CircleHelp, ClipboardPaste, Copy, Eraser } from "lucide-react";
import { browserPreviewMessage, isTauriRuntime } from "./browserPreview";
import {
  cleanClipboardText,
  defaultTextCleaningOptions,
  type SymbolWidth,
  type TextCleaningOptions,
  type TextCleaningResult,
} from "./textCleaner";
import { startTextCleaningWorker } from "./textCleanerWorkerRunner";
import type { ClipboardTextPayload, LogEvent } from "./types";

interface TextCleanerPageProps {
  onLog: (level: LogEvent["level"], text: string) => void;
  onOpenRegexTutorial: () => void;
}

const optionLabels: Array<{ key: keyof Pick<TextCleaningOptions, "cleanHtml" | "removeSpaces" | "removeLineBreaks" | "prefixApostrophe">; label: string; note: string }> = [
  { key: "cleanHtml", label: "清洗 HTML", note: "保留表格行列结构" },
  { key: "removeSpaces", label: "去除空格", note: "保留制表符与换行" },
  { key: "removeLineBreaks", label: "去除换行符", note: "合并为连续文本" },
  { key: "prefixApostrophe", label: "添加前置撇号", note: "强制 Excel 按文本粘贴" },
];

export function TextCleanerPage({ onLog, onOpenRegexTutorial }: TextCleanerPageProps) {
  const [source, setSource] = useState("");
  const [options, setOptions] = useState<TextCleaningOptions>(defaultTextCleaningOptions);
  const [result, setResult] = useState<TextCleaningResult>({ value: "" });
  const [processing, setProcessing] = useState(false);
  const desktopRuntime = isTauriRuntime();

  useEffect(() => {
    const usesCustomRegex = options.customRegex.enabled && Boolean(options.customRegex.pattern);
    if (!usesCustomRegex) {
      setResult(cleanClipboardText(source, options));
      setProcessing(false);
      return;
    }

    const safeOptions: TextCleaningOptions = {
      ...options,
      customRegex: { ...options.customRegex, enabled: false },
    };
    const safeResult = cleanClipboardText(source, safeOptions);
    setProcessing(true);
    setResult(safeResult);
    const task = startTextCleaningWorker({ input: source, options }, safeResult);
    let active = true;
    void task.promise.then((nextResult: TextCleaningResult) => {
      if (!active) {
        return;
      }
      setResult(nextResult);
      setProcessing(false);
    });

    return () => {
      active = false;
      task.cancel();
    };
  }, [source, options]);

  function setBooleanOption(key: typeof optionLabels[number]["key"], checked: boolean) {
    setOptions((current) => ({ ...current, [key]: checked }));
  }

  function setSymbolWidth(symbolWidth: SymbolWidth) {
    setOptions((current) => ({ ...current, symbolWidth }));
  }

  async function readClipboard() {
    if (!desktopRuntime) {
      window.alert(browserPreviewMessage);
      return;
    }
    try {
      const payload = await invoke<ClipboardTextPayload>("read_clipboard_text");
      const nextSource = payload.html ?? payload.text;
      setSource(nextSource);
      if (payload.html) {
        setOptions((current) => ({ ...current, cleanHtml: true }));
      }
      onLog("INFO", payload.html ? "已读取剪贴板 HTML，并自动启用 HTML 清洗。" : "已读取剪贴板文本。");
    } catch (error) {
      onLog("WARN", String(error));
      window.alert(String(error));
    }
  }

  async function copyResult() {
    if (result.error) {
      window.alert(result.error);
      return;
    }
    if (!desktopRuntime) {
      window.alert(browserPreviewMessage);
      return;
    }
    try {
      await invoke("write_clipboard_text", { text: result.value });
      onLog("DONE", "清洗结果已复制到系统剪贴板。");
    } catch (error) {
      onLog("ERROR", String(error));
      window.alert(String(error));
    }
  }

  return (
    <div className="text-cleaner-page">
      <section className="cleaner-options" aria-label="文本清洗选项">
        <div className="cleaner-option-grid">
          {optionLabels.map((option) => (
            <label className="cleaner-toggle" key={option.key}>
              <input
                type="checkbox"
                checked={options[option.key]}
                onChange={(event) => setBooleanOption(option.key, event.target.checked)}
              />
              <span className="cleaner-toggle-icon"><Check size={14} /></span>
              <span><strong>{option.label}</strong><small>{option.note}</small></span>
            </label>
          ))}
        </div>

        <div className="cleaner-width-control">
          <span>符号标准化</span>
          <div className="segmented-control" role="group" aria-label="符号宽度">
            {(["none", "fullwidth", "halfwidth"] as SymbolWidth[]).map((value) => (
              <button
                type="button"
                key={value}
                className={options.symbolWidth === value ? "active" : ""}
                onClick={() => setSymbolWidth(value)}
              >
                {value === "none" ? "不处理" : value === "fullwidth" ? "全角" : "半角"}
              </button>
            ))}
          </div>
        </div>

        <div className="regex-option">
          <label className="cleaner-toggle compact">
            <input
              type="checkbox"
              checked={options.customRegex.enabled}
              onChange={(event) => setOptions((current) => ({
                ...current,
                customRegex: { ...current.customRegex, enabled: event.target.checked },
              }))}
            />
            <span className="cleaner-toggle-icon"><Check size={14} /></span>
            <span><strong>自定义正则</strong></span>
          </label>
          <button
            type="button"
            className="circle-help-button"
            title="打开财务工作常用正则表达式教程"
            aria-label="打开正则表达式教程"
            onClick={onOpenRegexTutorial}
          >
            <CircleHelp size={18} />
          </button>
          <input
            aria-label="正则查找表达式"
            value={options.customRegex.pattern}
            disabled={!options.customRegex.enabled}
            placeholder="查找表达式，例如 ^(\\d{4})(\\d{2})(\\d{2})$"
            onChange={(event) => setOptions((current) => ({
              ...current,
              customRegex: { ...current.customRegex, pattern: event.target.value },
            }))}
          />
          <input
            aria-label="正则替换内容"
            value={options.customRegex.replacement}
            disabled={!options.customRegex.enabled}
            placeholder="替换内容，例如 $1-$2-$3"
            onChange={(event) => setOptions((current) => ({
              ...current,
              customRegex: { ...current.customRegex, replacement: event.target.value },
            }))}
          />
          <div className="regex-flags" aria-label="正则标记">
            {[["g", "全部"], ["m", "多行"], ["i", "忽略大小写"]].map(([flag, label]) => (
              <label key={flag}>
                <input
                  type="checkbox"
                  checked={options.customRegex.flags.includes(flag)}
                  disabled={!options.customRegex.enabled}
                  onChange={(event) => setOptions((current) => {
                    const flags = event.target.checked
                      ? `${current.customRegex.flags}${flag}`
                      : current.customRegex.flags.replace(flag, "");
                    return { ...current, customRegex: { ...current.customRegex, flags } };
                  })}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      </section>

      <div className="cleaner-actions">
        <button className="soft-button" onClick={() => void readClipboard()}><ClipboardPaste size={18} />读取剪贴板</button>
        <button className="primary-button" disabled={!source || processing || Boolean(result.error)} onClick={() => void copyResult()}><Copy size={18} />复制清洗结果</button>
        <button className="icon-button" title="清空文本" aria-label="清空文本" onClick={() => setSource("")}><Eraser size={18} /></button>
        <span className="cleaner-count" aria-live="polite">
          {processing ? "正在安全处理正则… · " : ""}输入 {source.length} 字符 · 输出 {result.value.length} 字符
        </span>
      </div>

      {result.error && <div className="cleaner-error" role="alert">{result.error}</div>}

      <div className="cleaner-editor-grid">
        <label className="cleaner-editor">
          <span>原始内容</span>
          <textarea value={source} onChange={(event) => setSource(event.target.value)} placeholder="在此粘贴内容，或点击“读取剪贴板”" />
        </label>
        <label className="cleaner-editor result">
          <span>清洗结果</span>
          <textarea value={result.value} readOnly placeholder="清洗结果会实时显示在这里" />
        </label>
      </div>
    </div>
  );
}
