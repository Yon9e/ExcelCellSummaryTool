<script setup lang="ts">
import { ref, watch } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { Check, CircleHelp, ClipboardPaste, Copy, Eraser } from "@lucide/vue";
import { browserPreviewMessage, isTauriRuntime } from "./browserPreview";
import { cleanClipboardText, defaultTextCleaningOptions, type SymbolWidth, type TextCleaningOptions, type TextCleaningResult } from "./textCleaner";
import { startTextCleaningWorker } from "./textCleanerWorkerRunner";
import type { ClipboardTextPayload, LogEvent } from "./types";

interface PendingClipboardText { source: string; sequence: number }
type BooleanOptionKey = keyof Pick<TextCleaningOptions, "cleanHtml" | "removeSpaces" | "removeLineBreaks" | "prefixApostrophe">;
const props = defineProps<{ onLog: (level: LogEvent["level"], text: string) => void; onOpenRegexTutorial: () => void }>();
const optionLabels: Array<{ key: BooleanOptionKey; label: string; note: string }> = [
  { key: "cleanHtml", label: "清洗 HTML", note: "保留表格行列结构" },
  { key: "removeSpaces", label: "去除空格", note: "保留制表符与换行" },
  { key: "removeLineBreaks", label: "去除换行符", note: "合并为连续文本" },
  { key: "prefixApostrophe", label: "添加前置撇号", note: "强制 Excel 按文本粘贴" },
];
const source = ref("");
const options = ref<TextCleaningOptions>({ ...defaultTextCleaningOptions, customRegex: { ...defaultTextCleaningOptions.customRegex } });
const result = ref<TextCleaningResult>({ value: "" });
const resultSource = ref<string | null>(null);
const processing = ref(false);
const watchClipboard = ref(false);
const pendingClipboard = ref<PendingClipboardText | null>(null);
const desktopRuntime = isTauriRuntime();
let lastClipboardSequence: number | null = null;
let writtenClipboard: PendingClipboardText | null = null;
let lastClipboardError: string | null = null;
let clipboardPollBusy = false;
let clipboardWriteBusy = false;

watch([source, options], ([nextSource, nextOptions], _previous, onCleanup) => {
  const usesCustomRegex = nextOptions.customRegex.enabled && Boolean(nextOptions.customRegex.pattern);
  if (!usesCustomRegex) {
    result.value = cleanClipboardText(nextSource, nextOptions);
    resultSource.value = nextSource;
    processing.value = false;
    return;
  }
  const safeOptions: TextCleaningOptions = { ...nextOptions, customRegex: { ...nextOptions.customRegex, enabled: false } };
  const safeResult = cleanClipboardText(nextSource, safeOptions);
  processing.value = true; result.value = safeResult; resultSource.value = null;
  const task = startTextCleaningWorker({ input: nextSource, options: nextOptions }, safeResult);
  let active = true;
  void task.promise.then((nextResult) => {
    if (!active) return;
    result.value = nextResult; resultSource.value = nextSource; processing.value = false;
  });
  onCleanup(() => { active = false; task.cancel(); });
}, { deep: true, immediate: true });

watch(watchClipboard, (enabled, _previous, onCleanup) => {
  if (!enabled || !desktopRuntime) return;
  let active = true;
  async function pollClipboard() {
    if (clipboardPollBusy) return;
    clipboardPollBusy = true;
    try {
      const before = await invoke<number>("get_clipboard_sequence_number");
      if (!active || before === lastClipboardSequence) return;
      const payload = await invoke<ClipboardTextPayload>("read_clipboard_text");
      const after = await invoke<number>("get_clipboard_sequence_number");
      const nextSource = payload.html ?? payload.text;
      if (!active || before !== after) return;
      lastClipboardSequence = after; lastClipboardError = null;
      if (writtenClipboard?.sequence === after && writtenClipboard.source === nextSource) { writtenClipboard = null; return; }
      if (!nextSource) return;
      if (payload.html) options.value.cleanHtml = true;
      source.value = nextSource; pendingClipboard.value = { source: nextSource, sequence: after };
    } catch (error) {
      if (!active) return;
      const message = String(error);
      if (lastClipboardError !== message) { lastClipboardError = message; props.onLog("WARN", `监听剪贴板暂时不可用，将继续重试：${message}`); }
    } finally { clipboardPollBusy = false; }
  }
  void pollClipboard();
  const intervalId = window.setInterval(() => void pollClipboard(), 700);
  onCleanup(() => { active = false; window.clearInterval(intervalId); });
});

watch([watchClipboard, source, resultSource, processing, () => result.value.error, () => result.value.value, pendingClipboard], () => {
  const pending = pendingClipboard.value;
  if (!watchClipboard.value || !desktopRuntime || !pending || source.value !== pending.source || resultSource.value !== pending.source || processing.value || result.value.error || clipboardWriteBusy) return;
  if (result.value.value === pending.source) { pendingClipboard.value = null; return; }
  clipboardWriteBusy = true;
  void invoke<number | null>("write_clipboard_text_if_sequence", { text: result.value.value, expectedSequence: pending.sequence })
    .then((writtenSequence) => {
      if (pendingClipboard.value?.sequence === pending.sequence) pendingClipboard.value = null;
      if (writtenSequence === null) { props.onLog("INFO", "检测到剪贴板已有新内容，已跳过过期的清洗结果。"); return; }
      writtenClipboard = { source: result.value.value, sequence: writtenSequence };
      props.onLog("DONE", "已检测到新的剪贴板文本并完成实时清洗。");
    })
    .catch((error) => {
      if (pendingClipboard.value?.sequence === pending.sequence) pendingClipboard.value = null;
      props.onLog("WARN", `写回清洗结果失败，将继续监听：${String(error)}`);
    })
    .finally(() => { clipboardWriteBusy = false; });
}, { deep: true });

function setBooleanOption(key: BooleanOptionKey, checked: boolean) { options.value[key] = checked; }
function setSymbolWidth(value: SymbolWidth) { options.value.symbolWidth = value; }
function setRegexFlag(flag: string, checked: boolean) {
  options.value.customRegex.flags = checked ? `${options.value.customRegex.flags}${flag}` : options.value.customRegex.flags.replace(flag, "");
}
function setClipboardWatching(checked: boolean) {
  if (!desktopRuntime) { window.alert(browserPreviewMessage); return; }
  lastClipboardSequence = null; writtenClipboard = null; lastClipboardError = null; pendingClipboard.value = null; watchClipboard.value = checked;
  props.onLog("INFO", checked ? "已开启剪贴板监听，将自动清洗新复制的文本。" : "已关闭剪贴板监听。");
}
async function readClipboard() {
  if (!desktopRuntime) { window.alert(browserPreviewMessage); return; }
  try {
    const payload = await invoke<ClipboardTextPayload>("read_clipboard_text");
    const nextSource = payload.html ?? payload.text;
    if (!nextSource) { const message = "剪贴板中没有可读取的文本或 HTML 内容。"; props.onLog("INFO", message); window.alert(message); return; }
    pendingClipboard.value = null; source.value = nextSource; if (payload.html) options.value.cleanHtml = true;
    props.onLog("INFO", payload.html ? "已读取剪贴板 HTML，并自动启用 HTML 清洗。" : "已读取剪贴板文本。");
  } catch (error) { props.onLog("WARN", String(error)); window.alert(String(error)); }
}
async function copyResult() {
  if (result.value.error) { window.alert(result.value.error); return; }
  if (!desktopRuntime) { window.alert(browserPreviewMessage); return; }
  try {
    await invoke("write_clipboard_text", { text: result.value.value });
    if (watchClipboard.value) writtenClipboard = { source: result.value.value, sequence: await invoke<number>("get_clipboard_sequence_number") };
    props.onLog("DONE", "清洗结果已复制到系统剪贴板。");
  } catch (error) { props.onLog("ERROR", String(error)); window.alert(String(error)); }
}
</script>

<template>
  <div class="text-cleaner-page" data-page="text-cleaner">
    <section class="cleaner-options" aria-label="文本清洗选项">
      <div class="cleaner-option-grid">
        <label v-for="option in optionLabels" :key="option.key" class="cleaner-toggle">
          <input type="checkbox" :checked="options[option.key]" @change="setBooleanOption(option.key, ($event.target as HTMLInputElement).checked)" />
          <span class="cleaner-toggle-icon"><Check :size="14" /></span><span><strong>{{ option.label }}</strong><small>{{ option.note }}</small></span>
        </label>
      </div>
      <div class="cleaner-width-control"><span>符号标准化</span><div class="segmented-control" role="group" aria-label="符号宽度"><button v-for="value in (['none', 'fullwidth', 'halfwidth'] as SymbolWidth[])" :key="value" type="button" :class="options.symbolWidth === value ? 'active' : ''" @click="setSymbolWidth(value)">{{ value === "none" ? "不处理" : value === "fullwidth" ? "全角" : "半角" }}</button></div></div>
      <div class="regex-option">
        <label class="cleaner-toggle compact"><input v-model="options.customRegex.enabled" type="checkbox" /><span class="cleaner-toggle-icon"><Check :size="14" /></span><span><strong>自定义正则</strong></span></label>
        <button type="button" class="circle-help-button" title="打开财务工作常用正则表达式教程" aria-label="打开正则表达式教程" @click="props.onOpenRegexTutorial"><CircleHelp :size="18" /></button>
        <input v-model="options.customRegex.pattern" class="regex-pattern-input" aria-label="正则查找表达式" :disabled="!options.customRegex.enabled" placeholder="查找表达式，例如 ^(\d{4})(\d{2})(\d{2})$" />
        <input v-model="options.customRegex.replacement" class="regex-replacement-input" aria-label="正则替换内容" :disabled="!options.customRegex.enabled" placeholder="替换内容，例如 $1-$2-$3" />
        <div class="regex-flags" aria-label="正则标记"><label v-for="([flag, label]) in [['g', '全部'], ['m', '多行'], ['i', '忽略大小写']]" :key="flag"><input type="checkbox" :checked="options.customRegex.flags.includes(flag)" :disabled="!options.customRegex.enabled" @change="setRegexFlag(flag, ($event.target as HTMLInputElement).checked)" />{{ label }}</label></div>
      </div>
    </section>
    <div class="cleaner-actions">
      <button class="soft-button" @click="readClipboard"><ClipboardPaste :size="18" />读取剪贴板</button>
      <button class="primary-button" :disabled="!source || processing || Boolean(result.error)" @click="copyResult"><Copy :size="18" />复制清洗结果</button>
      <button class="icon-button" title="清空文本" aria-label="清空文本" @click="source = ''"><Eraser :size="18" /></button>
      <label class="clipboard-watch-toggle" :aria-disabled="!desktopRuntime"><input type="checkbox" :checked="watchClipboard" :disabled="!desktopRuntime" @change="setClipboardWatching(($event.target as HTMLInputElement).checked)" /><span class="clipboard-watch-indicator"><Check :size="13" /></span><span><strong>监听剪贴板</strong><small aria-live="polite">{{ watchClipboard ? "实时清洗已开启" : "发现新文本后自动清洗" }}</small></span></label>
      <span class="cleaner-count" aria-live="polite">{{ processing ? "正在安全处理正则… · " : "" }}输入 {{ source.length }} 字符 · 输出 {{ result.value.length }} 字符</span>
    </div>
    <div v-if="result.error" class="cleaner-error" role="alert">{{ result.error }}</div>
    <div class="cleaner-editor-grid"><label class="cleaner-editor"><span>原始内容</span><textarea v-model="source" placeholder="在此粘贴内容，或点击“读取剪贴板”" /></label><label class="cleaner-editor result"><span>清洗结果</span><textarea :value="result.value" readonly placeholder="清洗结果会实时显示在这里" /></label></div>
  </div>
</template>
