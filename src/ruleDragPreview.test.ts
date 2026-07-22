import { describe, expect, it } from "vitest";
import {
  acceptRuleDragOver,
  findRuleDragTarget,
  getRuleDragOverlayLeft,
  getRuleDragOverlayTop,
  getRuleDragOriginStyle,
  getRuleDragShift,
} from "./ruleDragPreview";

describe("规则拖拽预览", () => {
  it("按原始行中心确定目标，避免受动画后命中区域影响", () => {
    const rowCenters = [100, 150, 200];

    expect(findRuleDragTarget(rowCenters, 171)).toBe(1);
    expect(findRuleDragTarget(rowCenters, 182)).toBe(2);
  });

  it("只让被跨过的相邻行滑动让位", () => {
    expect([0, 1, 2, 3].map((index) => getRuleDragShift(index, 0, 2))).toEqual([
      "",
      "rule-shift-up",
      "rule-shift-up",
      "",
    ]);
    expect([0, 1, 2, 3].map((index) => getRuleDragShift(index, 3, 1))).toEqual([
      "",
      "rule-shift-down",
      "rule-shift-down",
      "",
    ]);
  });

  it("浮动行保持抓取点并随鼠标纵向移动", () => {
    expect(getRuleDragOverlayTop(360, 28)).toBe(332);
    expect(getRuleDragOverlayTop(425, 28)).toBe(397);
    expect(getRuleDragOverlayLeft(240, 36)).toBe(204);
  });

  it("源行仅变透明并继续保留原生拖拽生命周期", () => {
    expect(getRuleDragOriginStyle(true)).toEqual({ opacity: 0 });
    expect(getRuleDragOriginStyle(false)).toBeUndefined();
  });

  it("拖动期间持续声明允许移动，避免鼠标显示禁止符号", () => {
    let prevented = false;
    const dataTransfer = { dropEffect: "none" };

    acceptRuleDragOver({
      preventDefault: () => { prevented = true; },
      dataTransfer,
    });

    expect(prevented).toBe(true);
    expect(dataTransfer.dropEffect).toBe("move");
  });
});
