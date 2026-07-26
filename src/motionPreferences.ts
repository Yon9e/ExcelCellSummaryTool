export type MotionMode = "auto" | "full" | "reduced";
export type MotionLevel = "full" | "reduced";

export const MOTION_MODE_STORAGE_KEY = "fadt.motion-mode";

export interface MotionPerformanceSample {
  frameIntervals: number[];
  longTaskCount: number;
}

export interface MotionPerformanceResult {
  degraded: boolean;
  reason: string;
}

export interface MotionPreferenceInput {
  mode: MotionMode;
  prefersReducedMotion: boolean;
  sessionDegraded: boolean;
  degradationReason: string;
}

export interface MotionPreferenceDecision {
  level: MotionLevel;
  reason: string;
}

export function normalizeMotionMode(value: unknown): MotionMode {
  return value === "full" || value === "reduced" || value === "auto"
    ? value
    : "auto";
}

export function evaluateMotionPerformance(
  sample: MotionPerformanceSample,
): MotionPerformanceResult {
  if (sample.longTaskCount > 0) {
    return {
      degraded: true,
      reason: `检测到 ${sample.longTaskCount} 次长任务`,
    };
  }

  if (sample.frameIntervals.length === 0) {
    return { degraded: false, reason: "等待性能采样" };
  }

  const average = sample.frameIntervals.reduce((sum, value) => sum + value, 0)
    / sample.frameIntervals.length;
  if (average > 22) {
    return {
      degraded: true,
      reason: `平均帧间隔 ${average.toFixed(1)}ms，高于 22ms`,
    };
  }

  const slowFrameCount = sample.frameIntervals.filter((value) => value > 34).length;
  const slowFrameRatio = slowFrameCount / sample.frameIntervals.length;
  if (slowFrameRatio > 0.2) {
    return {
      degraded: true,
      reason: `慢帧占比 ${Math.round(slowFrameRatio * 100)}%，高于 20%`,
    };
  }

  return { degraded: false, reason: "性能采样正常" };
}

export function resolveMotionPreference(
  input: MotionPreferenceInput,
): MotionPreferenceDecision {
  if (input.mode === "full") {
    return { level: "full", reason: "用户已选择完整动效" };
  }
  if (input.mode === "reduced") {
    return { level: "reduced", reason: "用户已选择精简动效" };
  }
  if (input.prefersReducedMotion) {
    return { level: "reduced", reason: "系统已启用减少动态效果" };
  }
  if (input.sessionDegraded) {
    return {
      level: "reduced",
      reason: input.degradationReason || "本次运行检测到设备负载较高",
    };
  }
  return { level: "full", reason: "自动评估：性能采样正常" };
}
