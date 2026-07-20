import { describe, expect, it } from "vitest";
import {
  appendScreenshotItems,
  removeScreenshotItem,
  type ScreenshotWorkspaceItem,
} from "./ruleImageWorkspace";
import type { ImagePayload } from "./types";

function payload(path: string): ImagePayload {
  return { path, data_url: `data:image/png;base64,${path}`, size_bytes: 10 };
}

describe("图片规则多截图工作区", () => {
  it("追加多张截图时保留旧截图状态并切换到最后一张", () => {
    const existing: ScreenshotWorkspaceItem<string>[] = [{
      id: "old",
      name: "旧截图.png",
      payload: payload("旧截图.png"),
      analysis: "已识别",
      outputSelection: new Set(["A1"]),
      dataSelection: new Set(["B1"]),
    }];
    let sequence = 0;

    const result = appendScreenshotItems(
      existing,
      [payload("C:\\截图\\第一张.png"), payload("C:\\截图\\第二张.png")],
      () => `new-${sequence += 1}`,
    );

    expect(result.items).toHaveLength(3);
    expect(result.items[0].analysis).toBe("已识别");
    expect([...result.items[0].outputSelection]).toEqual(["A1"]);
    expect(result.items.map(({ name }) => name)).toEqual(["旧截图.png", "第一张.png", "第二张.png"]);
    expect(result.activeId).toBe("new-2");
  });

  it("删除当前截图后切换到相邻截图", () => {
    const items: ScreenshotWorkspaceItem<null>[] = ["a", "b", "c"].map((id) => ({
      id,
      name: `${id}.png`,
      payload: payload(`${id}.png`),
      analysis: null,
      outputSelection: new Set(),
      dataSelection: new Set(),
    }));

    expect(removeScreenshotItem(items, "b")).toMatchObject({
      items: [{ id: "a" }, { id: "c" }],
      activeId: "c",
    });
    expect(removeScreenshotItem(items, "c").activeId).toBe("b");
  });

  it("删除非当前截图时保持当前截图", () => {
    const items: ScreenshotWorkspaceItem<null>[] = ["a", "b", "c"].map((id) => ({
      id,
      name: `${id}.png`,
      payload: payload(`${id}.png`),
      analysis: null,
      outputSelection: new Set(),
      dataSelection: new Set(),
    }));

    expect(removeScreenshotItem(items, "b", "a").activeId).toBe("a");
  });
});
