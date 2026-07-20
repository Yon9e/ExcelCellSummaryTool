import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ExternalLink, RefreshCw, Save, Settings2 } from "lucide-react";
import { browserPreviewMessage, isTauriRuntime } from "./browserPreview";
import type { OcrRuntimeStatus, OcrSettings } from "./types";

interface OcrSettingsPageProps {
  onLog: (level: "INFO" | "WARN" | "ERROR" | "DONE", message: string) => void;
}

const browserPreview = !isTauriRuntime();

const previewSettings: OcrSettings = {
  language: "简体中文",
  max_side_len: 1024,
  correct_text_direction: false,
  text_layout: "multi_none",
  screenshot_hotkey: "alt+s",
  paste_hotkey: "win+alt+v",
  repeat_screenshot_hotkey: "",
  copy_result: true,
  pop_main_window: false,
  notification_type: "default",
};

const textLayoutOptions = [
  ["multi_para", "多栏 - 按自然段换行"],
  ["multi_line", "多栏 - 总是换行"],
  ["multi_none", "多栏 - 无换行"],
  ["single_para", "单栏 - 按自然段换行"],
  ["single_line", "单栏 - 总是换行"],
  ["single_none", "单栏 - 无换行"],
  ["single_code", "单栏 - 保留缩进"],
  ["none", "不做处理"],
] as const;

const notificationOptions = [
  ["default", "跟随全局设定"],
  ["inside", "优先内部"],
  ["onlyInside", "只允许内部"],
  ["onlyOutside", "只允许外部"],
  ["none", "禁用所有通知"],
] as const;

const languageOptions = [
  ["简体中文", "简体中文"],
  ["English", "英语（English）"],
] as const;

function SettingToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      className={checked ? "setting-toggle enabled" : "setting-toggle"}
      role="switch"
      aria-label={label}
      aria-checked={checked}
      onClick={onChange}
    >
      <span />
    </button>
  );
}

export function OcrSettingsPage({ onLog }: OcrSettingsPageProps) {
  const [settings, setSettings] = useState<OcrSettings>(previewSettings);
  const [status, setStatus] = useState<OcrRuntimeStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void refreshSettings();
  }, []);

  async function refreshSettings() {
    if (browserPreview) {
      setStatus({
        version: "浏览器预览",
        bundled: false,
        prepared: false,
        message: "浏览器预览不加载本地 Umi-OCR 组件。",
      });
      setSettings(previewSettings);
      return;
    }

    setBusy(true);
    try {
      const [nextSettings, nextStatus] = await Promise.all([
        invoke<OcrSettings>("get_ocr_settings"),
        invoke<OcrRuntimeStatus>("get_ocr_runtime_status"),
      ]);
      setSettings(nextSettings);
      setStatus(nextStatus);
      setNotice("");
    } catch (error) {
      setNotice(String(error));
      onLog("ERROR", String(error));
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings() {
    if (browserPreview) {
      setNotice(browserPreviewMessage);
      return;
    }

    setBusy(true);
    try {
      const nextSettings = await invoke<OcrSettings>("save_ocr_settings", { settings });
      setSettings(nextSettings);
      setStatus(await invoke<OcrRuntimeStatus>("get_ocr_runtime_status"));
      setNotice("设置已保存，OCR 服务已重新加载。");
      onLog("DONE", "Umi-OCR 设置已保存并重新加载服务。");
    } catch (error) {
      setNotice(String(error));
      onLog("ERROR", String(error));
    } finally {
      setBusy(false);
    }
  }

  async function openNativeSettings() {
    if (browserPreview) {
      setNotice(browserPreviewMessage);
      return;
    }

    setBusy(true);
    try {
      const text = await invoke<string>("show_ocr_settings");
      setNotice(text);
      onLog("INFO", text);
    } catch (error) {
      setNotice(String(error));
      onLog("ERROR", String(error));
    } finally {
      setBusy(false);
    }
  }

  function updateSettings(patch: Partial<OcrSettings>) {
    setSettings((current) => ({ ...current, ...patch }));
  }

  return (
    <div className="ocr-settings-page">
      <section className="ocr-settings-intro">
        <div>
          <span className="ocr-kicker"><Settings2 size={16} /> Umi-OCR</span>
          <h4>截图识字设置</h4>
          <p>此处管理本工具使用的截图、识别与复制行为；保存后会重新加载本工具启动的 OCR 服务。</p>
        </div>
        <div className="ocr-settings-actions">
          <button className="soft-button" disabled={busy} onClick={() => void refreshSettings()}>
            <RefreshCw size={18} />
            重新读取
          </button>
          <button className="soft-button" disabled={busy || !status?.bundled} onClick={() => void openNativeSettings()}>
            <ExternalLink size={18} />
            打开原生设置
          </button>
          <button className="primary-button" disabled={busy || !status?.bundled} onClick={() => void saveSettings()}>
            <Save size={18} />
            保存设置
          </button>
        </div>
      </section>

      <div className="ocr-status-line">
        <span className={status?.prepared ? "status-dot ready" : "status-dot"} />
        <strong>Umi-OCR {status?.version ?? ""}</strong>
        <span>{status?.message ?? "正在读取 OCR 组件状态..."}</span>
      </div>

      {notice && <div className="ocr-notice" role="status">{busy ? "处理中：" : ""}{notice}</div>}

      <div className="ocr-settings-grid">
        <section className="ocr-settings-group">
          <div className="ocr-settings-group-heading">
            <h5>文字识别</h5>
            <span>RapidOCR</span>
          </div>
          <div className="ocr-settings-fields">
            <label>
              <span>语言/模型库</span>
              <select
                value={settings.language}
                onChange={(event) => updateSettings({ language: event.target.value })}
              >
                {languageOptions.map(([value, label]) => (
                  <option value={value} key={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>限制图像边长</span>
              <select
                value={settings.max_side_len}
                onChange={(event) => updateSettings({ max_side_len: Number(event.target.value) })}
              >
                {[512, 1024, 2048, 4096, 8192, 16000, 24000].map((size) => (
                  <option value={size} key={size}>{size}{size === 1024 ? "（默认）" : ""}</option>
                ))}
              </select>
            </label>
            <div className="ocr-setting-row">
              <div>
                <strong>纠正文本方向</strong>
                <span>适合存在旋转文本的截图，普通表格建议保持关闭。</span>
              </div>
              <SettingToggle
                checked={settings.correct_text_direction}
                label="纠正文本方向"
                onChange={() => updateSettings({ correct_text_direction: !settings.correct_text_direction })}
              />
            </div>
          </div>
        </section>

        <section className="ocr-settings-group">
          <div className="ocr-settings-group-heading">
            <h5>文本与快捷键</h5>
            <span>截图工作流</span>
          </div>
          <div className="ocr-settings-fields">
            <label>
              <span>排版解析方案</span>
              <select
                value={settings.text_layout}
                onChange={(event) => updateSettings({ text_layout: event.target.value })}
              >
                {textLayoutOptions.map(([value, label]) => (
                  <option value={value} key={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>屏幕截图</span>
              <input
                value={settings.screenshot_hotkey}
                onChange={(event) => updateSettings({ screenshot_hotkey: event.target.value })}
                placeholder="例如 alt+s"
              />
            </label>
            <label>
              <span>粘贴图片</span>
              <input
                value={settings.paste_hotkey}
                onChange={(event) => updateSettings({ paste_hotkey: event.target.value })}
                placeholder="例如 win+alt+v"
              />
            </label>
            <label>
              <span>重复截图</span>
              <input
                value={settings.repeat_screenshot_hotkey}
                onChange={(event) => updateSettings({ repeat_screenshot_hotkey: event.target.value })}
                placeholder="未设置"
              />
            </label>
          </div>
        </section>

        <section className="ocr-settings-group ocr-settings-group-wide">
          <div className="ocr-settings-group-heading">
            <h5>识图后的操作</h5>
            <span>结果处理</span>
          </div>
          <div className="ocr-settings-fields ocr-settings-actions-grid">
            <div className="ocr-setting-row">
              <div>
                <strong>复制结果</strong>
                <span>截图识别完成后自动写入系统剪贴板。</span>
              </div>
              <SettingToggle
                checked={settings.copy_result}
                label="复制结果"
                onChange={() => updateSettings({ copy_result: !settings.copy_result })}
              />
            </div>
            <div className="ocr-setting-row">
              <div>
                <strong>弹出主窗口</strong>
                <span>截图识别完成后将 Umi-OCR 原生窗口切换到前台。</span>
              </div>
              <SettingToggle
                checked={settings.pop_main_window}
                label="弹出主窗口"
                onChange={() => updateSettings({ pop_main_window: !settings.pop_main_window })}
              />
            </div>
            <label>
              <span>通知弹窗类型</span>
              <select
                value={settings.notification_type}
                onChange={(event) => updateSettings({ notification_type: event.target.value })}
              >
                {notificationOptions.map(([value, label]) => (
                  <option value={value} key={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}
