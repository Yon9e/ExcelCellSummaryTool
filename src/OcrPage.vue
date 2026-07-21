<script setup lang="ts">
import { onMounted, ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Check, Clipboard, FileImage, ScanLine, Sparkles } from "@lucide/vue";
import { browserPreviewMessage, isTauriRuntime } from "./browserPreview";
import type { ImagePayload, LogEvent, OcrImageResult, OcrRuntimeStatus } from "./types";

const props = defineProps<{ onLog: (level: LogEvent["level"], message: string) => void }>();
const browserPreview = !isTauriRuntime();
const status = ref<OcrRuntimeStatus | null>(null);
const image = ref<ImagePayload | null>(null);
const result = ref<OcrImageResult | null>(null);
const busy = ref(false);
const notice = ref("");

onMounted(() => {
  if (browserPreview) {
    status.value = { version: "浏览器预览", bundled: false, prepared: false, message: "浏览器预览不加载本地 Umi-OCR 组件。" };
    return;
  }
  void refreshStatus();
});

async function refreshStatus() {
  try { status.value = await invoke<OcrRuntimeStatus>("get_ocr_runtime_status"); }
  catch (error) { notice.value = String(error); }
}

async function initializeRuntime() {
  if (browserPreview) { notice.value = browserPreviewMessage; return; }
  busy.value = true;
  notice.value = "正在初始化 OCR 组件，首次使用需要复制本地运行文件...";
  try {
    status.value = await invoke<OcrRuntimeStatus>("prepare_ocr_runtime");
    notice.value = "OCR 组件初始化完成。";
    props.onLog("DONE", "Umi-OCR 组件初始化完成。");
  } catch (error) {
    notice.value = String(error); props.onLog("ERROR", String(error));
  } finally { busy.value = false; }
}

async function captureAndCopy() {
  if (browserPreview) { notice.value = browserPreviewMessage; return; }
  busy.value = true; notice.value = "正在打开截图工具...";
  try {
    const text = await invoke<string>("start_screenshot_ocr");
    notice.value = text; props.onLog("INFO", text); await refreshStatus();
  } catch (error) {
    notice.value = String(error); props.onLog("ERROR", String(error));
  } finally { busy.value = false; }
}

async function recognizeImage() {
  if (browserPreview) { notice.value = browserPreviewMessage; return; }
  const selected = await open({ multiple: false, title: "选择需要识别的图片", filters: [{ name: "图片", extensions: ["png", "jpg", "jpeg", "bmp", "webp", "tif", "tiff"] }] });
  if (typeof selected !== "string") return;
  busy.value = true; result.value = null; notice.value = "正在识别图片文字...";
  try {
    const payload = await invoke<ImagePayload>("read_image_file", { path: selected });
    image.value = payload;
    const next = await invoke<OcrImageResult>("ocr_image_base64", { imageBase64: payload.data_url });
    result.value = next;
    const text = next.text.trim();
    if (text) {
      let copied = false;
      try { await navigator.clipboard.writeText(text); copied = true; } catch { /* 保留已成功返回的 OCR 结果。 */ }
      notice.value = copied ? `识别到 ${next.items.length} 个文本区域，结果已复制。` : `识别到 ${next.items.length} 个文本区域；自动复制失败，可点击“复制结果”。`;
      props.onLog("DONE", `图片 OCR 完成，共 ${next.items.length} 个文本区域。`);
    } else {
      notice.value = "图片中未识别到文字。"; props.onLog("WARN", "图片 OCR 未识别到文字。");
    }
    await refreshStatus();
  } catch (error) {
    notice.value = String(error); props.onLog("ERROR", String(error));
  } finally { busy.value = false; }
}

async function copyResult() {
  const text = result.value?.text.trim();
  if (!text) return;
  try { await navigator.clipboard.writeText(text); notice.value = "识别结果已复制到剪贴板。"; }
  catch { notice.value = "无法写入剪贴板，请检查系统剪贴板权限后重试。"; }
}
</script>

<template>
  <div class="ocr-page">
    <section class="ocr-command-band">
      <div class="ocr-intro">
        <span class="ocr-kicker"><Sparkles :size="16" /> 本地 OCR</span>
        <h4>截图后直接粘贴文字</h4>
        <p>应用启动时自动加载 Umi-OCR；按 Alt+S 截图，识别结果自动写入剪贴板。</p>
      </div>
      <div class="ocr-command-actions">
        <button class="primary-button" :disabled="busy || !status?.bundled" @click="captureAndCopy"><ScanLine :size="20" />截图并复制</button>
        <button class="soft-button" :disabled="busy || !status?.bundled" @click="recognizeImage"><FileImage :size="19" />识别图片</button>
      </div>
    </section>
    <div class="ocr-status-line">
      <span :class="status?.prepared ? 'status-dot ready' : 'status-dot'" />
      <strong>Umi-OCR {{ status?.version ?? '' }}</strong>
      <span>{{ status?.message ?? "正在读取 OCR 组件状态..." }}</span>
      <button v-if="status?.bundled && !status.prepared" class="text-button" :disabled="busy" @click="initializeRuntime">立即初始化</button>
    </div>
    <div v-if="notice" class="ocr-notice" role="status">{{ busy ? "处理中：" : "" }}{{ notice }}</div>
    <section class="ocr-result-layout">
      <div class="ocr-preview">
        <img v-if="image" :src="image.data_url" alt="待识别图片预览" />
        <div v-else class="ocr-empty-state"><FileImage :size="42" /><strong>图片预览</strong><span>选择“识别图片”后在此核对原图</span></div>
      </div>
      <div class="ocr-text-result">
        <div class="ocr-result-heading">
          <div><span>识别结果</span><small v-if="result">{{ result.items.length }} 个文本区域 · {{ result.elapsed_seconds.toFixed(2) }} 秒</small></div>
          <button class="icon-button" :disabled="!result?.text.trim()" title="复制识别结果" @click="copyResult">
            <Check v-if="notice.includes('已复制')" :size="19" /><Clipboard v-else :size="19" />
          </button>
        </div>
        <textarea readonly :value="result?.text ?? ''" placeholder="识别出的文字将显示在这里" />
      </div>
    </section>
  </div>
</template>
