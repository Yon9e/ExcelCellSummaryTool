import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Check, Clipboard, FileImage, ScanLine, Settings, Sparkles } from "lucide-react";
import type { ImagePayload, OcrImageResult, OcrRuntimeStatus } from "./types";

interface OcrPageProps {
  onLog: (level: "INFO" | "WARN" | "ERROR" | "DONE", message: string) => void;
}

export function OcrPage({ onLog }: OcrPageProps) {
  const [status, setStatus] = useState<OcrRuntimeStatus | null>(null);
  const [image, setImage] = useState<ImagePayload | null>(null);
  const [result, setResult] = useState<OcrImageResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void refreshStatus();
  }, []);

  async function refreshStatus() {
    try {
      setStatus(await invoke<OcrRuntimeStatus>("get_ocr_runtime_status"));
    } catch (error) {
      setNotice(String(error));
    }
  }

  async function initializeRuntime() {
    setBusy(true);
    setNotice("正在初始化 OCR 组件，首次使用需要复制本地运行文件...");
    try {
      const nextStatus = await invoke<OcrRuntimeStatus>("prepare_ocr_runtime");
      setStatus(nextStatus);
      setNotice("OCR 组件初始化完成。");
      onLog("DONE", "Umi-OCR 组件初始化完成。");
    } catch (error) {
      setNotice(String(error));
      onLog("ERROR", String(error));
    } finally {
      setBusy(false);
    }
  }

  async function captureAndCopy() {
    setBusy(true);
    setNotice("正在打开截图工具...");
    try {
      const text = await invoke<string>("start_screenshot_ocr");
      setNotice(text);
      onLog("INFO", text);
      await refreshStatus();
    } catch (error) {
      setNotice(String(error));
      onLog("ERROR", String(error));
    } finally {
      setBusy(false);
    }
  }

  async function recognizeImage() {
    const selected = await open({
      multiple: false,
      title: "选择需要识别的图片",
      filters: [
        { name: "图片", extensions: ["png", "jpg", "jpeg", "bmp", "webp", "tif", "tiff"] },
      ],
    });
    if (typeof selected !== "string") {
      return;
    }

    setBusy(true);
    setResult(null);
    setNotice("正在识别图片文字...");
    try {
      const payload = await invoke<ImagePayload>("read_image_file", { path: selected });
      setImage(payload);
      const ocrResult = await invoke<OcrImageResult>("ocr_image_base64", {
        imageBase64: payload.data_url,
      });
      setResult(ocrResult);
      const text = ocrResult.text.trim();
      if (text) {
        let copied = false;
        try {
          await navigator.clipboard.writeText(text);
          copied = true;
        } catch {
          // 剪贴板权限失败不应覆盖已经成功返回的 OCR 结果。
        }
        setNotice(
          copied
            ? `识别到 ${ocrResult.items.length} 个文本区域，结果已复制。`
            : `识别到 ${ocrResult.items.length} 个文本区域；自动复制失败，可点击“复制结果”。`,
        );
        onLog("DONE", `图片 OCR 完成，共 ${ocrResult.items.length} 个文本区域。`);
      } else {
        setNotice("图片中未识别到文字。");
        onLog("WARN", "图片 OCR 未识别到文字。");
      }
      await refreshStatus();
    } catch (error) {
      setNotice(String(error));
      onLog("ERROR", String(error));
    } finally {
      setBusy(false);
    }
  }

  async function copyResult() {
    const text = result?.text.trim();
    if (!text) {
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setNotice("识别结果已复制到剪贴板。");
    } catch {
      setNotice("无法写入剪贴板，请检查系统剪贴板权限后重试。");
    }
  }

  async function openSettings() {
    setBusy(true);
    try {
      const text = await invoke<string>("show_ocr_settings");
      setNotice(text);
      onLog("INFO", text);
      await refreshStatus();
    } catch (error) {
      setNotice(String(error));
      onLog("ERROR", String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ocr-page">
      <section className="ocr-command-band">
        <div className="ocr-intro">
          <span className="ocr-kicker"><Sparkles size={16} /> 本地 OCR</span>
          <h4>截图后直接粘贴文字</h4>
          <p>应用启动时自动加载 Umi-OCR；按 Alt+S 截图，识别结果自动写入剪贴板。</p>
        </div>
        <div className="ocr-command-actions">
          <button className="primary-button" disabled={busy || !status?.bundled} onClick={captureAndCopy}>
            <ScanLine size={20} />
            截图并复制
          </button>
          <button className="soft-button" disabled={busy || !status?.bundled} onClick={recognizeImage}>
            <FileImage size={19} />
            识别图片
          </button>
          <button className="icon-button" disabled={busy || !status?.bundled} onClick={openSettings} title="OCR 设置与插件">
            <Settings size={20} />
          </button>
        </div>
      </section>

      <div className="ocr-status-line">
        <span className={status?.prepared ? "status-dot ready" : "status-dot"} />
        <strong>Umi-OCR {status?.version ?? ""}</strong>
        <span>{status?.message ?? "正在读取 OCR 组件状态..."}</span>
        {status?.bundled && !status.prepared && (
          <button className="text-button" disabled={busy} onClick={initializeRuntime}>立即初始化</button>
        )}
      </div>

      {notice && <div className="ocr-notice" role="status">{busy ? "处理中：" : ""}{notice}</div>}

      <section className="ocr-result-layout">
        <div className="ocr-preview">
          {image ? (
            <img src={image.data_url} alt="待识别图片预览" />
          ) : (
            <div className="ocr-empty-state">
              <FileImage size={42} />
              <strong>图片预览</strong>
              <span>选择“识别图片”后在此核对原图</span>
            </div>
          )}
        </div>
        <div className="ocr-text-result">
          <div className="ocr-result-heading">
            <div>
              <span>识别结果</span>
              {result && <small>{result.items.length} 个文本区域 · {result.elapsed_seconds.toFixed(2)} 秒</small>}
            </div>
            <button className="icon-button" disabled={!result?.text.trim()} onClick={copyResult} title="复制识别结果">
              {notice.includes("已复制") ? <Check size={19} /> : <Clipboard size={19} />}
            </button>
          </div>
          <textarea readOnly value={result?.text ?? ""} placeholder="识别出的文字将显示在这里" />
        </div>
      </section>
    </div>
  );
}
