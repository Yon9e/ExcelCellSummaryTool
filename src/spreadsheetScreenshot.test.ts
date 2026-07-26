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

  it("首列较宽且文字贴近左边界时，仍保留输出列名文本", () => {
    const result = reconstructSpreadsheet(
      { data: new Uint8ClampedArray(1_320 * 220 * 4), width: 1_320, height: 220 },
      [
        // A 列很宽：列标题在中间，科目名称靠近左侧网格线。
        item("A", 400, 4, 12),
        item("B", 860, 4, 12),
        item("C", 1_150, 4, 12),
        item("1226", 8, 70, 32),
        item("1227", 8, 118, 32),
        item("工资", 82, 70, 42),
        item("福利费", 82, 118, 52),
        item("73,563,985.67", 780, 70, 110),
        item("4,579,747.01", 780, 118, 96),
      ],
    );

    expect(result.cells[0][0].text).toBe("工资");
    expect(result.cells[1][0].text).toBe("福利费");
    expect(result.cells[0][1].text).toBe("73,563,985.67");
  });

  it("首列短文本贴近行号边界时也不得丢失", () => {
    const result = reconstructSpreadsheet(
      { data: new Uint8ClampedArray(1_280 * 240 * 4), width: 1_280, height: 240 },
      [
        item("A", 360, 4, 12),
        item("B", 840, 4, 12),
        item("C", 1_120, 4, 12),
        item("1226", 8, 70, 32, 18),
        item("1227", 8, 118, 32, 18),
        item("1228", 8, 166, 32, 18),
        // 三个文本都从首列左边界起排；短文本中心比“社会保险”更靠左。
        item("工资", 47, 70, 28, 18),
        item("福利费", 47, 118, 42, 18),
        item("社会保险", 47, 166, 68, 18),
      ],
    );

    expect(result.cells[0][0].text).toBe("工资");
    expect(result.cells[1][0].text).toBe("福利费");
    expect(result.cells[2][0].text).toBe("社会保险");
  });

  it("首列文本框仅部分落入 A 列时仍保留短输出列名", () => {
    const result = reconstructSpreadsheet(
      { data: new Uint8ClampedArray(1_280 * 240 * 4), width: 1_280, height: 240 },
      [
        item("A", 360, 4, 12),
        item("B", 840, 4, 12),
        // OCR 对行号框留出的右侧空白会使 A 列起点推到 64。
        item("1226", 12, 70, 48, 18),
        item("1227", 12, 118, 48, 18),
        // 工资框 [48, 72] 与 A 列相交，但其中心点 60 位于 A 列起点左侧。
        item("工资", 48, 70, 24, 18),
        item("福利费", 48, 118, 48, 18),
      ],
    );

    expect(result.cells[0][0].text).toBe("工资");
    expect(result.cells[1][0].text).toBe("福利费");
  });

  it("保留未分配 OCR 文本供界面诊断", () => {
    const result = reconstructSpreadsheet(
      { data: new Uint8ClampedArray(320 * 220 * 4), width: 320, height: 220 },
      [
        item("A", 90, 4, 12),
        item("B", 190, 4, 12),
        item("1150", 4, 43, 28),
        item("主营业务收入", 55, 43, 92),
        item("页脚文字", 55, 156, 56),
      ],
    );
    const diagnostics = (result as unknown as {
      ocrDiagnostics?: Array<{ text: string; assignment: string; reason?: string }>;
    }).ocrDiagnostics;

    expect(diagnostics).toContainEqual(expect.objectContaining({
      text: "页脚文字",
      assignment: "unassigned",
      reason: "outside-cell-bounds",
    }));
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
