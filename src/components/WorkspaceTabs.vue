<script setup lang="ts">
import type { NavigationItem } from "../navigation";

defineProps<{
  tabs: NavigationItem<string>[];
  activeKey: string;
  label: string;
}>();
defineEmits<{ select: [key: string] }>();
</script>

<template>
  <nav class="v3-workspace-tabs" role="tablist" :aria-label="label">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      type="button"
      role="tab"
      :data-tab="tab.key"
      :aria-selected="activeKey === tab.key"
      :class="{ active: activeKey === tab.key }"
      @click="$emit('select', tab.key)"
    >
      <component :is="tab.icon" :size="17" />
      <span>{{ tab.label }}</span>
    </button>
  </nav>
</template>
