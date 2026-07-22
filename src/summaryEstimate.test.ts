import { describe, expect, it } from "vitest";
import { estimateRemainingSeconds, estimateSummarySeconds, formatSummaryDuration } from "./summaryEstimate";

describe("汇总预计时间", () => {
  it("根据文件数和规则数给出初始估计", () => {
    expect(estimateSummarySeconds(10, 4)).toBeGreaterThanOrEqual(3);
    expect(estimateSummarySeconds(0, 4)).toBe(0);
  });

  it("根据已完成速度计算剩余时间", () => {
    expect(estimateRemainingSeconds(1_000, 2, 6, 3_000)).toBe(4);
    expect(estimateRemainingSeconds(1_000, 0, 6, 3_000)).toBeNull();
  });

  it("以中文短格式显示时长", () => {
    expect(formatSummaryDuration(8.2)).toBe("9 秒");
    expect(formatSummaryDuration(125)).toBe("2 分 5 秒");
  });
});
