import { describe, expect, it } from "vitest";
import { getAboutContent } from "./aboutContent";

describe("getAboutContent", () => {
  it("includes about information without sponsorship support", () => {
    const about = getAboutContent();
    const allText = JSON.stringify(about);

    expect(about.cards.map((card) => card.title)).toEqual(
      expect.arrayContaining(["主作者", "开源仓库", "意见反馈", "更新记录"]),
    );
    expect(allText).toContain("GNU GPL v3.0");
    expect(about.title).toBe("FADT · Financial Audit Data Toolkit");
    expect(about.description).toBe("面向财务与审计人员的一体化数据处理工具");
    expect(about.version).toBe("v0.2.7");
    expect(allText).toContain("github.com/Yon9e/FADT");
    expect(allText).toContain("v0.2.7");
    expect(allText).not.toContain("赞助支持");
  });
});
