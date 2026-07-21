<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { ArrowLeft, Search } from "@lucide/vue";
import { emitTo, listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauriRuntime } from "./browserPreview";
import { getHelpManual } from "./helpManual";
import { regexManualSections } from "./regexManual";
import { getMainViewPath, getSupportReturnWorkspaceFromSearch, isWorkspaceKey, type SupportView } from "./supportWindows";
import type { WorkspaceKey } from "./types";

const props = defineProps<{ view: Exclude<SupportView, "main"> }>();
const query = ref("");
const returnWorkspace = ref<WorkspaceKey>(getSupportReturnWorkspaceFromSearch(window.location.search));
const manual = getHelpManual();
let stopListening: (() => void) | undefined;
const returnLabel = computed(() => ({ summary: "返回汇总", ocr: "返回截图识字", "text-cleaner": "返回文本清洗", about: "返回关于" })[returnWorkspace.value]);
const filteredRegexSections = computed(() => {
  const normalized = query.value.trim().toLowerCase();
  if (!normalized) return regexManualSections;
  return regexManualSections.map((section) => ({
    ...section,
    recipes: section.recipes.filter((recipe) => [section.title, section.description, recipe.title, recipe.find, recipe.replace, recipe.note].join(" ").toLowerCase().includes(normalized)),
  })).filter((section) => section.recipes.length > 0);
});

onMounted(async () => {
  if (!isTauriRuntime()) return;
  const current = getCurrentWindow();
  await current.show().then(() => current.setFocus());
  stopListening = await listen<WorkspaceKey>("support-return-workspace", (event) => {
    if (isWorkspaceKey(event.payload)) returnWorkspace.value = event.payload;
  });
});
onBeforeUnmount(() => stopListening?.());

async function returnToMain() {
  if (isTauriRuntime()) {
    try { await emitTo<WorkspaceKey>("main", "navigate-workspace", returnWorkspace.value); } catch { /* 仍继续关闭辅助窗口。 */ }
    try { await getCurrentWindow().close(); return; } catch { /* 降级为切回主界面。 */ }
  }
  window.location.assign(getMainViewPath(window.location.href));
}
</script>

<template>
  <main v-if="props.view === 'regex'" class="support-window-shell regex-manual-shell">
    <header class="support-window-heading regex-heading">
      <div><p class="eyebrow">剪贴板文本清洗</p><h1>财务工作常用正则表达式</h1><p>按任务查找可直接使用的查找与替换方案。本工具使用 JavaScript 正则语法。</p></div>
      <div class="regex-heading-actions">
        <label class="regex-search"><Search :size="18" /><input v-model="query" placeholder="搜索日期、金额、公司名、OCR……" /></label>
        <button class="support-return-button" type="button" @click="returnToMain"><ArrowLeft :size="18" />{{ returnLabel }}</button>
      </div>
    </header>
    <div class="regex-manual-layout">
      <nav class="regex-index" aria-label="正则教程目录"><strong>常用清洗任务</strong><span>按需要处理的问题查找</span><a v-for="section in regexManualSections" :key="section.id" :href="`#${section.id}`">{{ section.title }}</a></nav>
      <div class="regex-sections">
        <section v-for="section in filteredRegexSections" :id="section.id" :key="section.id" class="regex-section">
          <header><h2>{{ section.title }}</h2><p>{{ section.description }}</p></header>
          <div class="regex-recipe-list">
            <article v-for="recipe in section.recipes" :key="recipe.title" class="regex-recipe">
              <h3>{{ recipe.title }}</h3><div class="regex-code-grid"><div><span>查找</span><code>{{ recipe.find }}</code></div><div><span>替换</span><code>{{ recipe.replace || "（留空）" }}</code></div></div><p>{{ recipe.note }}</p>
            </article>
          </div>
        </section>
        <div v-if="filteredRegexSections.length === 0" class="regex-empty">没有找到匹配的正则方案。</div>
      </div>
    </div>
  </main>
  <main v-else class="support-window-shell">
    <header class="support-window-heading support-window-heading-with-return"><div><p class="eyebrow">Excel 单元格定向汇总工具</p><h1>{{ manual.title }}</h1></div><button class="support-return-button" type="button" @click="returnToMain"><ArrowLeft :size="18" />{{ returnLabel }}</button></header>
    <div class="help-manual-body support-manual-body">
      <section v-for="(section, sectionIndex) in manual.sections" :key="section.title" class="help-section"><div class="help-section-index">{{ sectionIndex + 1 }}</div><div><h4>{{ section.title }}</h4><ol><li v-for="item in section.items" :key="item">{{ item }}</li></ol></div></section>
    </div>
  </main>
</template>
