<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { ExternalLink, RefreshCw, Save, Settings2 } from "@lucide/vue";
import { browserPreviewMessage, isTauriRuntime } from "./browserPreview";
import type { LogEvent, OcrRuntimeStatus, OcrSettings } from "./types";

const props = defineProps<{ onLog: (level: LogEvent["level"], message: string) => void }>();
const browserPreview = !isTauriRuntime();
const previewSettings: OcrSettings = {
  language: "简体中文", max_side_len: 1024, correct_text_direction: false, text_layout: "multi_none",
  screenshot_hotkey: "alt+s", paste_hotkey: "win+alt+v", repeat_screenshot_hotkey: "", copy_result: true,
  pop_main_window: false, notification_type: "default",
};
const settings = reactive<OcrSettings>({ ...previewSettings });
const status = ref<OcrRuntimeStatus | null>(null);
const busy = ref(false);
const notice = ref("");
const textLayoutOptions = [["multi_para", "多栏 - 按自然段换行"], ["multi_line", "多栏 - 总是换行"], ["multi_none", "多栏 - 无换行"], ["single_para", "单栏 - 按自然段换行"], ["single_line", "单栏 - 总是换行"], ["single_none", "单栏 - 无换行"], ["single_code", "单栏 - 保留缩进"], ["none", "不做处理"]] as const;
const notificationOptions = [["default", "跟随全局设定"], ["inside", "优先内部"], ["onlyInside", "只允许内部"], ["onlyOutside", "只允许外部"], ["none", "禁用所有通知"]] as const;
const languageOptions = [["简体中文", "简体中文"], ["English", "英语（English）"]] as const;
const imageSizes = [512, 1024, 2048, 4096, 8192, 16000, 24000];

function replaceSettings(next: OcrSettings) { Object.assign(settings, next); }
onMounted(() => void refreshSettings());

async function refreshSettings() {
  if (browserPreview) {
    status.value = { version: "浏览器预览", bundled: false, prepared: false, message: "浏览器预览不加载本地 Umi-OCR 组件。" };
    replaceSettings(previewSettings); return;
  }
  busy.value = true;
  try {
    const [nextSettings, nextStatus] = await Promise.all([invoke<OcrSettings>("get_ocr_settings"), invoke<OcrRuntimeStatus>("get_ocr_runtime_status")]);
    replaceSettings(nextSettings); status.value = nextStatus; notice.value = "";
  } catch (error) { notice.value = String(error); props.onLog("ERROR", String(error)); }
  finally { busy.value = false; }
}

async function saveSettings() {
  if (browserPreview) { notice.value = browserPreviewMessage; return; }
  busy.value = true;
  try {
    replaceSettings(await invoke<OcrSettings>("save_ocr_settings", { settings: { ...settings } }));
    status.value = await invoke<OcrRuntimeStatus>("get_ocr_runtime_status");
    notice.value = "设置已保存，OCR 服务已重新加载。"; props.onLog("DONE", "Umi-OCR 设置已保存并重新加载服务。");
  } catch (error) { notice.value = String(error); props.onLog("ERROR", String(error)); }
  finally { busy.value = false; }
}

async function openNativeSettings() {
  if (browserPreview) { notice.value = browserPreviewMessage; return; }
  busy.value = true;
  try { const text = await invoke<string>("show_ocr_settings"); notice.value = text; props.onLog("INFO", text); }
  catch (error) { notice.value = String(error); props.onLog("ERROR", String(error)); }
  finally { busy.value = false; }
}
</script>

<template>
  <div class="ocr-settings-page">
    <section class="ocr-settings-intro">
      <div><span class="ocr-kicker"><Settings2 :size="16" /> Umi-OCR</span><h4>截图识字设置</h4><p>此处管理本工具使用的截图、识别与复制行为；保存后会重新加载本工具启动的 OCR 服务。</p></div>
      <div class="ocr-settings-actions">
        <button class="soft-button" :disabled="busy" @click="refreshSettings"><RefreshCw :size="18" />重新读取</button>
        <button class="soft-button" :disabled="busy || !status?.bundled" @click="openNativeSettings"><ExternalLink :size="18" />打开原生设置</button>
        <button class="primary-button" :disabled="busy || !status?.bundled" @click="saveSettings"><Save :size="18" />保存设置</button>
      </div>
    </section>
    <div class="ocr-status-line"><span :class="status?.prepared ? 'status-dot ready' : 'status-dot'" /><strong>Umi-OCR {{ status?.version ?? '' }}</strong><span>{{ status?.message ?? "正在读取 OCR 组件状态..." }}</span></div>
    <div v-if="notice" class="ocr-notice" role="status">{{ busy ? "处理中：" : "" }}{{ notice }}</div>
    <div class="ocr-settings-grid">
      <section class="ocr-settings-group">
        <div class="ocr-settings-group-heading"><h5>文字识别</h5><span>RapidOCR</span></div>
        <div class="ocr-settings-fields">
          <label><span>语言/模型库</span><select v-model="settings.language"><option v-for="([value, label]) in languageOptions" :key="value" :value="value">{{ label }}</option></select></label>
          <label><span>限制图像边长</span><select v-model.number="settings.max_side_len"><option v-for="size in imageSizes" :key="size" :value="size">{{ size }}{{ size === 1024 ? "（默认）" : "" }}</option></select></label>
          <div class="ocr-setting-row"><div><strong>纠正文本方向</strong><span>适合存在旋转文本的截图，普通表格建议保持关闭。</span></div><button type="button" :class="settings.correct_text_direction ? 'setting-toggle enabled' : 'setting-toggle'" role="switch" aria-label="纠正文本方向" :aria-checked="settings.correct_text_direction" @click="settings.correct_text_direction = !settings.correct_text_direction"><span /></button></div>
        </div>
      </section>
      <section class="ocr-settings-group">
        <div class="ocr-settings-group-heading"><h5>文本与快捷键</h5><span>截图工作流</span></div>
        <div class="ocr-settings-fields">
          <label><span>排版解析方案</span><select v-model="settings.text_layout"><option v-for="([value, label]) in textLayoutOptions" :key="value" :value="value">{{ label }}</option></select></label>
          <label><span>屏幕截图</span><input v-model="settings.screenshot_hotkey" placeholder="例如 alt+s" /></label>
          <label><span>粘贴图片</span><input v-model="settings.paste_hotkey" placeholder="例如 win+alt+v" /></label>
          <label><span>重复截图</span><input v-model="settings.repeat_screenshot_hotkey" placeholder="未设置" /></label>
        </div>
      </section>
      <section class="ocr-settings-group ocr-settings-group-wide">
        <div class="ocr-settings-group-heading"><h5>识图后的操作</h5><span>结果处理</span></div>
        <div class="ocr-settings-fields ocr-settings-actions-grid">
          <div class="ocr-setting-row"><div><strong>复制结果</strong><span>截图识别完成后自动写入系统剪贴板。</span></div><button type="button" :class="settings.copy_result ? 'setting-toggle enabled' : 'setting-toggle'" role="switch" aria-label="复制结果" :aria-checked="settings.copy_result" @click="settings.copy_result = !settings.copy_result"><span /></button></div>
          <div class="ocr-setting-row"><div><strong>弹出主窗口</strong><span>截图识别完成后将 Umi-OCR 原生窗口切换到前台。</span></div><button type="button" :class="settings.pop_main_window ? 'setting-toggle enabled' : 'setting-toggle'" role="switch" aria-label="弹出主窗口" :aria-checked="settings.pop_main_window" @click="settings.pop_main_window = !settings.pop_main_window"><span /></button></div>
          <label><span>通知弹窗类型</span><select v-model="settings.notification_type"><option v-for="([value, label]) in notificationOptions" :key="value" :value="value">{{ label }}</option></select></label>
        </div>
      </section>
    </div>
  </div>
</template>
