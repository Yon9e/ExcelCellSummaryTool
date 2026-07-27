<script setup lang="ts">
import { nextTick } from "vue";
import type { NavigationItem } from "../navigation";

const props = defineProps<{
  tabs: NavigationItem<string>[];
  activeKey: string;
  label: string;
  panelId: string;
}>();
const emit = defineEmits<{ select: [key: string] }>();

function selectByKeyboard(event: KeyboardEvent, index: number) {
  const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
  if (!keys.includes(event.key)) return;
  event.preventDefault();
  const lastIndex = props.tabs.length - 1;
  const nextIndex = event.key === "Home"
    ? 0
    : event.key === "End"
      ? lastIndex
      : event.key === "ArrowRight"
        ? (index + 1) % props.tabs.length
        : (index - 1 + props.tabs.length) % props.tabs.length;
  emit("select", props.tabs[nextIndex].key);
  void nextTick(() => {
    const buttons = (event.currentTarget as HTMLElement | null)
      ?.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[nextIndex]?.focus();
  });
}
</script>

<template>
  <nav class="v3-workspace-tabs" role="tablist" :aria-label="label">
    <button
      v-for="(tab, index) in tabs"
      :key="tab.key"
      type="button"
      role="tab"
      :data-tab="tab.key"
      :id="`${panelId}-tab-${tab.key}`"
      :aria-controls="panelId"
      :aria-selected="activeKey === tab.key"
      :tabindex="activeKey === tab.key ? 0 : -1"
      :class="{ active: activeKey === tab.key }"
      @click="$emit('select', tab.key)"
      @keydown="selectByKeyboard($event, index)"
    >
      <component :is="tab.icon" :size="17" />
      <span>{{ tab.label }}</span>
    </button>
  </nav>
</template>
