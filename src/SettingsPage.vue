<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { Activity, Gauge, RotateCcw, Sparkles, Zap } from "@lucide/vue";
import type { MotionMode } from "./motionPreferences";
import { useMotionStore } from "./stores/motion";

const motionStore = useMotionStore();
const {
  mode,
  effectiveLevel,
  decisionReason,
  samplingStatus,
  sessionDegraded,
} = storeToRefs(motionStore);

const options: Array<{
  mode: MotionMode;
  title: string;
  description: string;
  icon: typeof Activity;
}> = [
  {
    mode: "auto",
    title: "自动",
    description: "遵循系统偏好，并在检测到低性能时为当前会话自动精简。",
    icon: Activity,
  },
  {
    mode: "full",
    title: "完整",
    description: "保留页面过渡、卡片入场、拖动反馈与任务进度动效。",
    icon: Sparkles,
  },
  {
    mode: "reduced",
    title: "精简",
    description: "关闭非必要位移和错峰动画，仅保留必要状态反馈。",
    icon: Zap,
  },
];

const samplingLabel = computed(() => {
  if (samplingStatus.value === "sampling") return "正在采样";
  if (samplingStatus.value === "complete") return sessionDegraded.value ? "已自动降级" : "采样完成";
  return "等待采样";
});
</script>

<template>
  <section class="settings-page" aria-labelledby="motion-settings-title">
    <div class="settings-intro">
      <div>
        <p class="eyebrow">界面与性能</p>
        <h3 id="motion-settings-title">界面动效</h3>
        <p>选择动效强度。设置仅保存在本机，不会更改方案、OCR 或业务数据。</p>
      </div>
      <button
        class="soft-button settings-restore"
        type="button"
        data-testid="restore-motion-defaults"
        @click="motionStore.restoreDefaults"
      >
        <RotateCcw :size="17" />
        恢复默认
      </button>
    </div>

    <div class="motion-option-grid" role="group" aria-label="界面动效模式">
      <button
        v-for="option in options"
        :key="option.mode"
        class="motion-option"
        :class="{ active: mode === option.mode }"
        type="button"
        :data-motion-mode="option.mode"
        :aria-pressed="mode === option.mode"
        @click="motionStore.setMode(option.mode)"
      >
        <span class="motion-option-icon" aria-hidden="true">
          <component :is="option.icon" :size="20" />
        </span>
        <span class="motion-option-copy">
          <strong>{{ option.title }}</strong>
          <small>{{ option.description }}</small>
        </span>
        <span class="motion-option-check" aria-hidden="true" />
      </button>
    </div>

    <div class="motion-status-grid">
      <article class="motion-status-card motion-status-primary" aria-live="polite">
        <span class="motion-status-icon"><Gauge :size="20" /></span>
        <div>
          <span>当前生效</span>
          <strong>{{ effectiveLevel === "full" ? "完整动效" : "精简动效" }}</strong>
          <p>{{ decisionReason }}</p>
        </div>
        <span class="status-badge">{{ samplingLabel }}</span>
      </article>

      <article class="motion-status-card">
        <span class="motion-status-icon motion-status-icon-warm"><Activity :size="20" /></span>
        <div>
          <span>自动判断规则</span>
          <strong>优先保障操作稳定性</strong>
          <p>平均帧间隔高于 22ms、慢帧超过 20%，或检测到长任务时，本次会话保持精简。</p>
        </div>
      </article>
    </div>
  </section>
</template>
