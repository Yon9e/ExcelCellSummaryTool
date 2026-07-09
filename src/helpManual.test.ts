import { describe, expect, it } from "vitest";
import { getHelpManual } from "./helpManual";

describe("getHelpManual", () => {
  it("provides titled manual sections with step guidance", () => {
    const manual = getHelpManual();

    expect(manual.title).toBe("使用手册");
    expect(manual.sections.length).toBeGreaterThanOrEqual(4);
    expect(manual.sections.map((section) => section.title)).toContain("操作步骤");
    expect(manual.sections.flatMap((section) => section.items)).toContain(
      "遇到 Sheet 关键词命中多个 Sheet 时，在弹窗中选择实际要读取的 Sheet 后继续。",
    );
  });
});
