import { describe, expect, it } from "vitest";
import { reconstructSpreadsheet } from "./spreadsheetScreenshot";
import type { OcrTextItem } from "./types";

function item(text: string, x: number, y: number, width = 28, height = 16): OcrTextItem {
  return {
    text,
    score: 0.96,
    box_points: [
      [x, y],
      [x + width, y],
      [x + width, y + height],
      [x, y + height],
    ],
    end: "\n",
  };
}

describe("reconstructSpreadsheet", () => {
  it("根据可见行号、列号和 OCR 文本重建包含空单元格的表格", () => {
    const result = reconstructSpreadsheet(
      { data: new Uint8ClampedArray(420 * 180 * 4), width: 420, height: 180 },
      [
        item("A", 90, 4, 12),
        item("B", 190, 4, 12),
        item("C", 290, 4, 12),
        item("1150", 4, 43, 28),
        item("1151", 4, 73, 28),
        item("1152", 4, 103, 28),
        item("主营业务收入", 55, 43, 92),
        item("29,797,107.90", 172, 43, 96),
        item("其他业务收入", 55, 73, 92),
        item("240,000.00", 180, 73, 78),
      ],
    );

    expect(result.columns.map((column) => column.label)).toEqual(["A", "B", "C"]);
    expect(result.rows.map((row) => row.number)).toEqual([1150, 1151, 1152]);
    expect(result.cells.flat().map((cell) => cell.address)).toEqual([
      "A1150", "B1150", "C1150",
      "A1151", "B1151", "C1151",
      "A1152", "B1152", "C1152",
    ]);
    expect(result.cells[0][0].text).toBe("主营业务收入");
    expect(result.cells[0][1].text).toBe("29,797,107.90");
    expect(result.cells[2][2].text).toBe("");
  });

  it("行号中间缺失时按相邻可见行号补齐", () => {
    const result = reconstructSpreadsheet(
      { data: new Uint8ClampedArray(300 * 180 * 4), width: 300, height: 180 },
      [
        item("A", 90, 4, 12),
        item("B", 190, 4, 12),
        item("330", 4, 43, 24),
        item("332", 4, 103, 24),
      ],
    );

    expect(result.rows.map((row) => row.number)).toEqual([330, 331, 332]);
    expect(result.rows[1].center).toBeCloseTo(81, 0);
  });

  it("缺少 Excel 行列标题时返回明确提示而不是伪造坐标", () => {
    const result = reconstructSpreadsheet(
      { data: new Uint8ClampedArray(300 * 180 * 4), width: 300, height: 180 },
      [item("主营业务收入", 60, 50, 92)],
    );

    expect(result.cells).toEqual([]);
    expect(result.warnings.join("；")).toContain("列字母");
    expect(result.warnings.join("；")).toContain("行号");
  });
});
