import { describe, expect, it } from "vitest";
import { getAboutContent } from "./aboutContent";

describe("getAboutContent", () => {
  it("includes about information without sponsorship support", () => {
    const about = getAboutContent();
    const allText = JSON.stringify(about);

    expect(about.cards.map((card) => card.title)).toEqual(
      expect.arrayContaining(["主作者", "开源仓库", "意见反馈", "更新记录"]),
    );
    expect(allText).not.toContain("赞助支持");
  });
});
