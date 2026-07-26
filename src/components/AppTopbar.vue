<script setup lang="ts">
import { CircleHelp, ShieldCheck } from "@lucide/vue";

defineProps<{ breadcrumb: string }>();
defineEmits<{ help: [] }>();
</script>

<template>
  <header class="app-topbar" data-tauri-drag-region>
    <div class="app-topbar-breadcrumb" aria-label="当前位置">
      <ShieldCheck :size="17" />
      <span>{{ breadcrumb }}</span>
    </div>
    <div class="app-topbar-actions">
      <span class="app-topbar-local"><i aria-hidden="true" />数据仅在本机处理</span>
      <button
        class="app-topbar-help"
        type="button"
        data-testid="open-help"
        @click="$emit('help')"
      >
        <CircleHelp :size="18" />
        帮助说明
      </button>
    </div>
  </header>
</template>
