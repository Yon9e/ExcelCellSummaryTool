import { describe, expect, it } from "vitest";
import { mapOcrItemsToSource, resolveDetectedColumnLabel, type OcrRegion } from "./RuleImageImporter";
import type { OcrTextItem } from "./types";

describe("mapOcrItemsToSource", () => {
  it("将放大裁剪区域的 OCR 坐标还原到原始截图", () => {
    const region: OcrRegion = {
      dataUrl: "data:image/png;base64,test",
      sourceX: 0,
      sourceY: 380,
      scaleX: 4,
      scaleY: 4,
    };
    const item: OcrTextItem = {
      text: "330",
      score: 0.98,
      box_points: [
        [4, 80],
        [92, 80],
        [92, 148],
        [4, 148],
      ],
      end: "\n",
    };

    const [mapped] = mapOcrItemsToSource([item], region);

    expect(mapped.box_points).toEqual([
      [1, 400],
      [23, 400],
      [23, 417],
      [1, 417],
    ]);
    expect(mapped.text).toBe("330");
  });
});

describe("resolveDetectedColumnLabel", () => {
  it("截图从非 A 列开始时返回识别到的真实列字母", () => {
    const columns = [
      { index: 0, label: "M" },
      { index: 1, label: "N" },
    ];

    expect(resolveDetectedColumnLabel(columns, 0)).toBe("M");
    expect(resolveDetectedColumnLabel(columns, 1)).toBe("N");
  });
});
