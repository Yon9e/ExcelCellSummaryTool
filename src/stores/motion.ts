import { computed, ref } from "vue";
import { defineStore } from "pinia";
import {
  MOTION_MODE_STORAGE_KEY,
  evaluateMotionPerformance,
  normalizeMotionMode,
  resolveMotionPreference,
  type MotionMode,
  type MotionPerformanceSample,
} from "../motionPreferences";

type SamplingStatus = "idle" | "sampling" | "complete";

function getStoredMotionMode(): MotionMode {
  if (typeof localStorage === "undefined") return "auto";
  try {
    return normalizeMotionMode(localStorage.getItem(MOTION_MODE_STORAGE_KEY));
  } catch {
    return "auto";
  }
}

function persistMotionMode(mode: MotionMode) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(MOTION_MODE_STORAGE_KEY, mode);
  } catch {
    // 浏览器禁用本地存储时保留当前会话设置，不影响应用使用。
  }
}

export const useMotionStore = defineStore("motion", () => {
  const mode = ref<MotionMode>(getStoredMotionMode());
  const prefersReducedMotion = ref(false);
  const sessionDegraded = ref(false);
  const degradationReason = ref("");
  const samplingStatus = ref<SamplingStatus>("idle");
  let animationFrameId: number | null = null;
  let mediaQuery: MediaQueryList | null = null;
  let mediaQueryListener: ((event: MediaQueryListEvent) => void) | null = null;
  let longTaskObserver: PerformanceObserver | null = null;

  const decision = computed(() => resolveMotionPreference({
    mode: mode.value,
    prefersReducedMotion: prefersReducedMotion.value,
    sessionDegraded: sessionDegraded.value,
    degradationReason: degradationReason.value,
  }));
  const effectiveLevel = computed(() => decision.value.level);
  const decisionReason = computed(() => decision.value.reason);

  function setMode(value: MotionMode) {
    mode.value = value;
    persistMotionMode(value);
    if (value === "auto") {
      resamplePerformance();
    } else if (samplingStatus.value === "sampling") {
      stopPerformanceSampling();
      samplingStatus.value = "idle";
    }
  }

  function restoreDefaults() {
    setMode("auto");
  }

  function applyPerformanceSample(sample: MotionPerformanceSample) {
    const result = evaluateMotionPerformance(sample);
    samplingStatus.value = "complete";
    if (!result.degraded || sessionDegraded.value) return;
    sessionDegraded.value = true;
    degradationReason.value = result.reason;
  }

  function stopPerformanceSampling() {
    if (animationFrameId !== null && typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(animationFrameId);
    }
    animationFrameId = null;
    longTaskObserver?.disconnect();
    longTaskObserver = null;
  }

  function startPerformanceSampling(frameCount = 120) {
    if (
      samplingStatus.value !== "idle"
      || typeof requestAnimationFrame === "undefined"
      || frameCount < 2
    ) {
      return;
    }

    samplingStatus.value = "sampling";
    const frameIntervals: number[] = [];
    let previousTimestamp: number | null = null;
    let longTaskCount = 0;

    if (typeof PerformanceObserver !== "undefined") {
      try {
        longTaskObserver = new PerformanceObserver((entries) => {
          longTaskCount += entries.getEntries().length;
        });
        longTaskObserver.observe({ entryTypes: ["longtask"] });
      } catch {
        longTaskObserver = null;
      }
    }

    const captureFrame = (timestamp: number) => {
      if (previousTimestamp !== null) {
        frameIntervals.push(timestamp - previousTimestamp);
      }
      previousTimestamp = timestamp;
      if (frameIntervals.length >= frameCount - 1) {
        stopPerformanceSampling();
        applyPerformanceSample({ frameIntervals, longTaskCount });
        return;
      }
      animationFrameId = requestAnimationFrame(captureFrame);
    };

    animationFrameId = requestAnimationFrame(captureFrame);
  }

  function resamplePerformance(frameCount = 120) {
    if (mode.value !== "auto" || sessionDegraded.value) return;
    stopPerformanceSampling();
    samplingStatus.value = "idle";
    startPerformanceSampling(frameCount);
  }

  function initialize() {
    if (typeof matchMedia !== "undefined") {
      mediaQuery = matchMedia("(prefers-reduced-motion: reduce)");
      prefersReducedMotion.value = mediaQuery.matches;
      mediaQueryListener = (event: MediaQueryListEvent) => {
        prefersReducedMotion.value = event.matches;
      };
      mediaQuery.addEventListener?.("change", mediaQueryListener);
    }
    if (mode.value === "auto") startPerformanceSampling();
  }

  function dispose() {
    stopPerformanceSampling();
    if (mediaQuery && mediaQueryListener) {
      mediaQuery.removeEventListener?.("change", mediaQueryListener);
    }
    mediaQuery = null;
    mediaQueryListener = null;
  }

  return {
    mode,
    prefersReducedMotion,
    sessionDegraded,
    degradationReason,
    samplingStatus,
    effectiveLevel,
    decisionReason,
    setMode,
    restoreDefaults,
    applyPerformanceSample,
    startPerformanceSampling,
    resamplePerformance,
    initialize,
    dispose,
  };
});
