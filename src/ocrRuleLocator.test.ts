import { describe, expect, it } from "vitest";
import {
  detectAnnotationRectangles,
  locateRuleCandidates,
  type AnnotationRectangles,
} from "./ocrRuleLocator";
import type { OcrTextItem } from "./types";

function drawRect(
  pixels: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  rectWidth: number,
  rectHeight: number,
  color: [number, number, number],
) {
  for (let offset = 0; offset < 3; offset += 1) {
    for (let px = x; px < x + rectWidth; px += 1) {
      setPixel(px, y + offset);
      setPixel(px, y + rectHeight - 1 - offset);
    }
    for (let py = y; py < y + rectHeight; py += 1) {
      setPixel(x + offset, py);
      setPixel(x + rectWidth - 1 - offset, py);
    }
  }

  function setPixel(px: number, py: number) {
    const index = (py * width + px) * 4;
    pixels[index] = color[0];
    pixels[index + 1] = color[1];
    pixels[index + 2] = color[2];
    pixels[index + 3] = 255;
  }
}

function drawSparseSinglePixelRect(
  pixels: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  rectWidth: number,
  rectHeight: number,
  color: [number, number, number],
) {
  for (let px = x; px < x + rectWidth; px += 1) {
    if ((px - x) % 19 !== 0) {
      setPixel(px, y);
      setPixel(px, y + rectHeight - 1);
    }
  }
  for (let py = y; py < y + rectHeight; py += 1) {
    if ((py - y) % 17 !== 0) {
      setPixel(x, py);
      setPixel(x + rectWidth - 1, py);
    }
  }

  function setPixel(px: number, py: number) {
    const index = (py * width + px) * 4;
    pixels[index] = color[0];
    pixels[index + 1] = color[1];
    pixels[index + 2] = color[2];
    pixels[index + 3] = 255;
  }
}

function item(text: string, x: number, y: number, width = 100): OcrTextItem {
  return {
    text,
    score: 0.96,
    box_points: [
      [x, y],
      [x + width, y],
      [x + width, y + 16],
      [x, y + 16],
    ],
    end: "\n",
  };
}

describe("detectAnnotationRectangles", () => {
  it("finds outlined red and blue rectangles and ignores filled blue areas", () => {
    const width = 220;
    const height = 130;
    const pixels = new Uint8ClampedArray(width * height * 4);
    drawRect(pixels, width, 10, 24, 82, 34, [245, 66, 70]);
    drawRect(pixels, width, 108, 24, 70, 34, [20, 155, 245]);
    for (let y = 82; y < 112; y += 1) {
      for (let x = 10; x < 72; x += 1) {
        const index = (y * width + x) * 4;
        pixels.set([20, 155, 245, 255], index);
      }
    }

    const result = detectAnnotationRectangles({ data: pixels, width, height });

    expect(result.red).toHaveLength(1);
    expect(result.blue).toHaveLength(1);
    expect(result.red[0]).toMatchObject({ x: 10, y: 24, width: 82, height: 34 });
    expect(result.blue[0]).toMatchObject({ x: 108, y: 24, width: 70, height: 34 });
  });

  it("finds single-pixel annotation rectangles with small screenshot gaps", () => {
    const width = 320;
    const height = 180;
    const pixels = new Uint8ClampedArray(width * height * 4);
    drawSparseSinglePixelRect(pixels, width, 14, 26, 132, 92, [245, 66, 70]);
    drawSparseSinglePixelRect(pixels, width, 174, 26, 112, 92, [20, 155, 245]);

    const result = detectAnnotationRectangles({ data: pixels, width, height });

    expect(result.red).toEqual([{ x: 14, y: 26, width: 132, height: 92 }]);
    expect(result.blue).toEqual([{ x: 174, y: 26, width: 112, height: 92 }]);
  });
});

describe("locateRuleCandidates", () => {
  const annotations: AnnotationRectangles = {
    red: [
      { x: 36, y: 480, width: 565, height: 58 },
      { x: 36, y: 690, width: 565, height: 58 },
    ],
    blue: [
      { x: 604, y: 480, width: 270, height: 58 },
      { x: 604, y: 690, width: 270, height: 58 },
    ],
  };

  it("maps grouped annotated rows to Excel cells", () => {
    const result = locateRuleCandidates(
      [
        item("B", 720, 6, 18),
        item("1150主营业务收入", 18, 487, 210),
        item("1151其他业务收入", 18, 515, 210),
        item("1157废弃资源综合利用业", 18, 697, 270),
        item("1158新能源电池材料", 18, 725, 220),
      ],
      annotations,
      2048,
      907,
    );

    expect(result.map(({ outputColumn, cell }) => [outputColumn, cell])).toEqual([
      ["主营业务收入", "B1150"],
      ["其他业务收入", "B1151"],
      ["废弃资源综合利用业", "B1157"],
      ["新能源电池材料", "B1158"],
    ]);
    expect(result.every((candidate) => candidate.selected && !candidate.warning)).toBe(true);
  });

  it("keeps a candidate editable when the column letter cannot be recognized", () => {
    const result = locateRuleCandidates(
      [item("1150主营业务收入", 18, 487, 210)],
      annotations,
      2048,
      907,
    );

    expect(result[0].cell).toBe("");
    expect(result[0].selected).toBe(false);
    expect(result[0].warning).toContain("数据列字母");
  });

  it("does not pair a label with a blue rectangle from another row", () => {
    const result = locateRuleCandidates(
      [item("B", 720, 6, 18), item("1150主营业务收入", 18, 487, 210)],
      {
        red: [{ x: 36, y: 480, width: 565, height: 58 }],
        blue: [{ x: 604, y: 690, width: 270, height: 58 }],
      },
      2048,
      907,
    );

    expect(result[0].cell).toBe("");
    expect(result[0].selected).toBe(false);
    expect(result[0].warning).toContain("同一行的蓝色数据框");
  });
});
