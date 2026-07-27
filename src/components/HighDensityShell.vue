<script setup lang="ts">
import {
  ArrowLeft,
  FileSpreadsheet,
  FolderSearch2,
  Info,
  ScanText,
  Settings,
} from "@lucide/vue";

withDefaults(defineProps<{
  eyebrow: string;
  title: string;
  description?: string;
  returnLabel?: string;
  contextItems?: string[];
  motionLevel?: "full" | "reduced";
}>(), {
  description: "",
  returnLabel: "返回",
  contextItems: () => [],
});
defineEmits<{ back: [] }>();

const railItems = [
  { label: "汇总", icon: FileSpreadsheet },
  { label: "数据源", icon: FolderSearch2 },
  { label: "截图识字", icon: ScanText },
  { label: "设置", icon: Settings },
  { label: "关于", icon: Info },
];
</script>

<template>
  <section class="high-density-shell fadt-v3" :data-motion-level="motionLevel">
    <aside class="high-density-rail" aria-hidden="true">
      <span class="high-density-rail-brand">F</span>
      <span
        v-for="(item, index) in railItems"
        :key="item.label"
        class="high-density-rail-item"
        :class="{ active: index === 1 }"
      >
        <component :is="item.icon" :size="19" />
      </span>
    </aside>

    <aside class="high-density-context" aria-label="当前工作区上下文">
      <div class="high-density-context-brand">
        <strong>FADT</strong>
        <small>Financial Audit Data Toolkit</small>
      </div>
      <div class="high-density-context-heading">
        <span>{{ eyebrow }}</span>
        <strong>{{ title }}</strong>
      </div>
      <nav v-if="contextItems.length" aria-label="工作区步骤">
        <span
          v-for="(item, index) in contextItems"
          :key="item"
          class="high-density-context-step"
          :class="{ active: index === 0 }"
        >
          <b class="high-density-context-step-index" aria-hidden="true">{{ index + 1 }}</b>
          <span class="high-density-context-step-label">{{ item }}</span>
        </span>
      </nav>
      <div class="high-density-context-note">
        <i aria-hidden="true" />
        本地安全工作区
      </div>
    </aside>

    <div class="high-density-main">
      <header class="high-density-header" data-tauri-drag-region>
        <button
          class="high-density-back"
          type="button"
          data-testid="high-density-back"
          @click="$emit('back')"
        >
          <ArrowLeft :size="18" />
          {{ returnLabel }}
        </button>
        <div class="high-density-heading">
          <p>{{ eyebrow }}</p>
          <h2>{{ title }}</h2>
          <span v-if="description">{{ description }}</span>
        </div>
        <slot name="header-actions" />
      </header>
      <div class="high-density-content">
        <slot />
      </div>
    </div>
  </section>
</template>
