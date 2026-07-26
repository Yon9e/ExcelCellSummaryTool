import { describe, expect, it } from "vitest";
import {
  evaluateMotionPerformance,
  normalizeMotionMode,
  resolveMotionPreference,
} from "./motionPreferences";

describe("motionPreferences", () => {
  it("normalizes persisted values and falls back to auto", () => {
    expect(normalizeMotionMode("auto")).toBe("auto");
    expect(normalizeMotionMode("full")).toBe("full");
    expect(normalizeMotionMode("reduced")).toBe("reduced");
    expect(normalizeMotionMode("unknown")).toBe("auto");
    expect(normalizeMotionMode(null)).toBe("auto");
  });

  it("degrades when the average frame interval is above 22ms", () => {
    expect(evaluateMotionPerformance({
      frameIntervals: [23, 24, 21, 25],
      longTaskCount: 0,
    })).toEqual({
      degraded: true,
      reason: "平均帧间隔 23.3ms，高于 22ms",
    });
  });

  it("degrades when more than 20 percent of frames exceed 34ms", () => {
    expect(evaluateMotionPerformance({
      frameIntervals: [16, 16, 16, 35, 40, 16, 16, 16, 16],
      longTaskCount: 0,
    })).toEqual({
      degraded: true,
      reason: "慢帧占比 22%，高于 20%",
    });
  });

  it("degrades when a long task is observed", () => {
    expect(evaluateMotionPerformance({
      frameIntervals: [16, 17, 16, 17],
      longTaskCount: 1,
    })).toEqual({
      degraded: true,
      reason: "检测到 1 次长任务",
    });
  });

  it("keeps full motion when samples are healthy or insufficient", () => {
    expect(evaluateMotionPerformance({
      frameIntervals: [16, 17, 16, 18],
      longTaskCount: 0,
    }).degraded).toBe(false);
    expect(evaluateMotionPerformance({
      frameIntervals: [],
      longTaskCount: 0,
    })).toEqual({
      degraded: false,
      reason: "等待性能采样",
    });
  });

  it("lets explicit user choice override automatic decisions", () => {
    expect(resolveMotionPreference({
      mode: "full",
      prefersReducedMotion: true,
      sessionDegraded: true,
      degradationReason: "设备负载较高",
    })).toEqual({
      level: "full",
      reason: "用户已选择完整动效",
    });
    expect(resolveMotionPreference({
      mode: "reduced",
      prefersReducedMotion: false,
      sessionDegraded: false,
      degradationReason: "",
    })).toEqual({
      level: "reduced",
      reason: "用户已选择精简动效",
    });
  });

  it("uses system preference and sticky session degradation in auto mode", () => {
    expect(resolveMotionPreference({
      mode: "auto",
      prefersReducedMotion: true,
      sessionDegraded: false,
      degradationReason: "",
    })).toEqual({
      level: "reduced",
      reason: "系统已启用减少动态效果",
    });
    expect(resolveMotionPreference({
      mode: "auto",
      prefersReducedMotion: false,
      sessionDegraded: true,
      degradationReason: "平均帧间隔 25.0ms，高于 22ms",
    })).toEqual({
      level: "reduced",
      reason: "平均帧间隔 25.0ms，高于 22ms",
    });
  });
});
