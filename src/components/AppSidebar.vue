<script setup lang="ts">
import { FileSpreadsheet } from "@lucide/vue";
import { APP_VERSION } from "../appVersion";
import { getBrandSubtitle } from "../brandContent";
import { workspacePages } from "../navigation";
import type { WorkspaceKey } from "../types";

defineProps<{ activeWorkspace: WorkspaceKey }>();
defineEmits<{ navigate: [workspace: WorkspaceKey] }>();

const brandSubtitle = getBrandSubtitle();
</script>

<template>
  <aside class="app-sidebar" aria-label="FADT 主导航">
    <div class="app-sidebar-brand">
      <span class="app-sidebar-mark" aria-hidden="true">
        <FileSpreadsheet :size="24" />
      </span>
      <span class="app-sidebar-brand-copy">
        <strong>FADT</strong>
        <small>{{ brandSubtitle }}</small>
      </span>
    </div>

    <nav class="app-sidebar-nav" aria-label="工作区">
      <button
        v-for="page in workspacePages"
        :key="page.key"
        type="button"
        :class="{ active: activeWorkspace === page.key }"
        :data-workspace="page.key"
        :aria-current="activeWorkspace === page.key ? 'page' : undefined"
        :title="page.label"
        @click="$emit('navigate', page.key)"
      >
        <span class="app-sidebar-signal" aria-hidden="true" />
        <component :is="page.icon" :size="20" />
        <span class="app-sidebar-label">{{ page.label }}</span>
      </button>
    </nav>

    <div class="app-sidebar-footer">
      <span class="app-sidebar-status" aria-hidden="true" />
      <span>本地运行</span>
      <small>v{{ APP_VERSION }}</small>
    </div>
  </aside>
</template>
