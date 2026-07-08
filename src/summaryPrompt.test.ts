import { describe, expect, it } from "vitest";
import { getSummaryCompletionPrompt } from "./summaryPrompt";

describe("getSummaryCompletionPrompt", () => {
  it("asks whether to open the output file immediately", () => {
    expect(getSummaryCompletionPrompt()).toBe("汇总完成，是否立即打开？");
  });
});
