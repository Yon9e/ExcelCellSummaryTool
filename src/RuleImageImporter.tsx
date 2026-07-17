import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { AlertTriangle, FileImage, ScanSearch, X } from "lucide-react";
import {
  detectAnnotationRectangles,
  locateRuleCandidates,
  type AnnotationRectangles,
  type PixelRect,
  type RuleCandidate,
} from "./ocrRuleLocator";
import type { ImagePayload, OcrImageResult, Rule, SheetMode } from "./types";

interface RuleImageImporterProps {
  onClose: () => void;
  onAppend: (rules: Rule[]) => void;
}

interface AnalysisResult {
  candidates: RuleCandidate[];
  annotations: AnnotationRectangles;
  previewUrl: string;
}

export function RuleImageImporter({ onClose, onAppend }: RuleImageImporterProps) {
  const [image, setImage] = useState<ImagePayload | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [candidates, setCandidates] = useState<RuleCandidate[]>([]);
  const [sheetMode, setSheetMode] = useState<SheetMode>("contains");
  const [sheetValue, setSheetValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("请选择已用红框标注表头、蓝框标注数据单元格的 Excel 截图。");
  const [error, setError] = useState("");

  async function selectAndAnalyze() {
    const selected = await open({
      multiple: false,
      title: "选择红蓝框标注的 Excel 截图",
      filters: [
        { name: "图片", extensions: ["png", "jpg", "jpeg", "bmp", "webp", "tif", "tiff"] },
      ],
    });
    if (typeof selected !== "string") {
      return;
    }

    setBusy(true);
    setError("");
    setCandidates([]);
    setStatus("正在识别标注框、表头和 Excel 坐标...");
    try {
      const payload = await invoke<ImagePayload>("read_image_file", { path: selected });
      setImage(payload);
      const ocrResult = await invoke<OcrImageResult>("ocr_image_base64", {
        imageBase64: payload.data_url,
      });
      const analysis = await analyzeRuleImage(payload.data_url, ocrResult);
      setPreviewUrl(analysis.previewUrl);
      setCandidates(analysis.candidates);
      setStatus(
        `检测到 ${analysis.annotations.red.length} 个红框、${analysis.annotations.blue.length} 个蓝框，生成 ${analysis.candidates.length} 条候选规则。`,
      );
      if (!analysis.annotations.red.length || !analysis.annotations.blue.length) {
        setError("未完整检测到红、蓝标注框。请使用清晰的纯红色和纯蓝色矩形边框后重试。");
      } else if (!analysis.candidates.length) {
        setError("标注框已检测到，但未识别出可用表头。请确认截图包含 Excel 行号和列字母。");
      }
    } catch (reason) {
      setError(String(reason));
      setStatus("图片分析失败。");
    } finally {
      setBusy(false);
    }
  }

  function updateCandidate(id: string, patch: Partial<RuleCandidate>) {
    setCandidates((items) => items.map((candidate) => candidate.id === id ? { ...candidate, ...patch } : candidate));
  }

  function confirmImport() {
    setError("");
    const selected = candidates.filter((candidate) => candidate.selected);
    if (!selected.length) {
      setError("请至少勾选一条候选规则。");
      return;
    }
    if (!sheetValue.trim()) {
      setError("请填写 Sheet 值；图片识别只负责定位表头和单元格坐标。");
      return;
    }
    if (
      sheetMode === "index"
      && (!/^\d+$/.test(sheetValue.trim()) || Number(sheetValue.trim()) < 1)
    ) {
      setError("按序号定位时，Sheet 值必须是大于 0 的整数。");
      return;
    }
    const invalid = selected.find(
      (candidate) => !candidate.outputColumn.trim() || !/^[A-Z]{1,3}[1-9]\d{0,6}$/i.test(candidate.cell.trim()),
    );
    if (invalid) {
      setError(`请修正“${invalid.outputColumn || "未命名规则"}”的输出列名或单元格坐标。`);
      return;
    }

    onAppend(
      selected.map((candidate) => ({
        output_column: candidate.outputColumn.trim(),
        sheet_mode: sheetMode,
        sheet_value: sheetValue.trim(),
        cell: candidate.cell.trim().toUpperCase(),
      })),
    );
  }

  return (
    <div className="modal-backdrop rule-import-backdrop" role="presentation">
      <div className="rule-import-modal" role="dialog" aria-modal="true" aria-labelledby="rule-import-title">
        <header className="rule-import-heading">
          <div>
            <p className="eyebrow">图片定位规则</p>
            <h3 id="rule-import-title">从红蓝框截图生成规则</h3>
            <p>红框标注输出列名，蓝框标注目标数据；Sheet 信息由人工确认。</p>
          </div>
          <button className="icon-button" onClick={onClose} title="关闭"><X size={20} /></button>
        </header>

        <div className="rule-import-controls">
          <button className="soft-button" disabled={busy} onClick={selectAndAnalyze}>
            <FileImage size={19} />
            {image ? "重新选择图片" : "选择标注截图"}
          </button>
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
          <ScanSearch size={18} />
          <span>{busy ? "处理中：" : ""}{status}</span>
        </div>
        {error && <div className="inline-error"><AlertTriangle size={18} />{error}</div>}

        <div className="rule-import-workspace">
          <div className="rule-import-preview">
            {previewUrl || image ? (
              <img src={previewUrl || image?.data_url} alt="标注截图分析预览" />
            ) : (
              <div className="ocr-empty-state"><FileImage size={40} /><strong>标注截图预览</strong></div>
            )}
          </div>
          <div className="candidate-list">
            <div className="candidate-list-heading">
              <span>候选规则</span>
              <small>{candidates.filter((candidate) => candidate.selected).length} 条已选择</small>
            </div>
            {candidates.length ? candidates.map((candidate) => (
              <div className={candidate.warning ? "candidate-row warning" : "candidate-row"} key={candidate.id}>
                <input
                  className="candidate-check"
                  type="checkbox"
                  checked={candidate.selected}
                  onChange={(event) => updateCandidate(candidate.id, { selected: event.target.checked })}
                  aria-label={`选择规则 ${candidate.outputColumn}`}
                />
                <label>
                  <span>输出列名</span>
                  <input value={candidate.outputColumn} onChange={(event) => updateCandidate(candidate.id, { outputColumn: event.target.value })} />
                </label>
                <label className="candidate-cell">
                  <span>单元格</span>
                  <input value={candidate.cell} onChange={(event) => updateCandidate(candidate.id, { cell: event.target.value.toUpperCase() })} placeholder="如 B1150" />
                </label>
                <div className="candidate-confidence">{Math.round(candidate.confidence * 100)}%</div>
                {candidate.warning && <p>{candidate.warning}</p>}
              </div>
            )) : (
              <div className="candidate-empty">分析完成后，可编辑的规则会显示在这里。</div>
            )}
          </div>
        </div>

        <footer className="modal-actions">
          <button className="soft-button" onClick={onClose}>取消</button>
          <button className="primary-button" disabled={busy || !candidates.length} onClick={confirmImport}>追加到规则配置</button>
        </footer>
      </div>
    </div>
  );
}

async function analyzeRuleImage(dataUrl: string, ocrResult: OcrImageResult): Promise<AnalysisResult> {
  const image = await loadImage(dataUrl);
  const pixelCount = image.naturalWidth * image.naturalHeight;
  if (!image.naturalWidth || !image.naturalHeight || pixelCount > 16_000_000) {
    throw new Error("图片尺寸异常或超过 1600 万像素，请裁剪后重试。");
  }
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("当前窗口无法读取图片像素。");
  }
  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const annotations = detectAnnotationRectangles(imageData);
  const candidates = locateRuleCandidates(
    ocrResult.items,
    annotations,
    canvas.width,
    canvas.height,
  );

  context.lineWidth = Math.max(2, Math.round(canvas.width / 800));
  context.setLineDash([10, 7]);
  drawDetections(context, annotations.red, "#ff6272", "表头");
  drawDetections(context, annotations.blue, "#2ea8ff", "数据");
  return { candidates, annotations, previewUrl: canvas.toDataURL("image/png") };
}

function drawDetections(
  context: CanvasRenderingContext2D,
  rectangles: PixelRect[],
  color: string,
  label: string,
) {
  context.strokeStyle = color;
  context.fillStyle = color;
  context.font = "600 14px Microsoft YaHei UI";
  rectangles.forEach((rect, index) => {
    context.strokeRect(rect.x, rect.y, rect.width, rect.height);
    context.fillText(`${label} ${index + 1}`, rect.x + 6, Math.max(16, rect.y - 6));
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("无法解码所选图片。"));
    image.src = dataUrl;
  });
}
