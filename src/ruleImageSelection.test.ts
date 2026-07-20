import { describe, expect, it } from "vitest";
import {
  buildRowSelectionPairs,
  fillCandidatePairs,
  fillCandidateValues,
  selectCellRange,
  selectSingleColumnRange,
  toggleCellSelection,
  toggleSingleCellPerRow,
  type CandidateRuleRow,
  type SelectableCell,
} from "./ruleImageSelection";

const cells: SelectableCell[] = [
  { id: "A1", rowIndex: 0, columnIndex: 0, text: "收入", address: "A1" },
  { id: "B1", rowIndex: 0, columnIndex: 1, text: "100", address: "B1" },
  { id: "A2", rowIndex: 1, columnIndex: 0, text: "成本", address: "A2" },
  { id: "B2", rowIndex: 1, columnIndex: 1, text: "60", address: "B2" },
  { id: "A3", rowIndex: 2, columnIndex: 0, text: "利润", address: "A3" },
  { id: "B3", rowIndex: 2, columnIndex: 1, text: "40", address: "B3" },
];

function rows(): CandidateRuleRow[] {
  return [
    { id: "r1", outputColumn: "已有列", cell: "C1" },
    { id: "r2", outputColumn: "", cell: "" },
  ];
}

describe("单元格选择", () => {
  it("支持点击选择和再次点击取消", () => {
    const selected = toggleCellSelection(new Set<string>(), "A1");
    expect([...selected]).toEqual(["A1"]);
    expect([...toggleCellSelection(selected, "A1")]).toEqual([]);
  });

  it("拖动选择连续矩形并按从上到下、从左到右排序", () => {
    const selected = selectCellRange(cells, "A1", "B2");
    expect([...selected]).toEqual(["A1", "B1", "A2", "B2"]);
  });

  it("输出列名同一行只能选一个，新选择会替换该行原选择", () => {
    const selected = toggleSingleCellPerRow(new Set(["A1", "A2"]), "B1", cells);
    expect([...selected]).toEqual(["A2", "B1"]);
    expect([...toggleSingleCellPerRow(selected, "B1", cells)]).toEqual(["A2"]);
  });

  it("输出列名拖动时只选择起始单元格所在列", () => {
    const selected = selectSingleColumnRange(cells, "A1", "B3");
    expect([...selected]).toEqual(["A1", "A2", "A3"]);
  });
});

describe("候选规则填充", () => {
  it("可从活动行开始仅向下填充输出列名并自动补行", () => {
    const result = fillCandidateValues(rows(), "r2", ["收入", "成本"], "outputColumn");
    expect(result.rows.map((row) => [row.outputColumn, row.cell])).toEqual([
      ["已有列", "C1"],
      ["收入", ""],
      ["成本", ""],
    ]);
  });

  it("可仅填充目标坐标且默认跳过已有内容", () => {
    const source = [
      { id: "r1", outputColumn: "收入", cell: "B9" },
      { id: "r2", outputColumn: "成本", cell: "" },
    ];
    const result = fillCandidateValues(source, "r1", ["B1", "B2"], "cell");
    expect(result.rows.map((row) => row.cell)).toEqual(["B9", "B1", "B2"]);
  });

  it("可将两组选择按顺序配对填入输出列名和目标坐标", () => {
    const result = fillCandidatePairs(
      rows(),
      "r2",
      [cells[0], cells[2]],
      [cells[1], cells[3]],
    );
    expect(result.rows.map((row) => [row.outputColumn, row.cell])).toEqual([
      ["已有列", "C1"],
      ["收入", "B1"],
      ["成本", "B2"],
    ]);
  });

  it("可将同一行的一个输出列名展开到多个目标数据并追加列后缀", () => {
    const extendedCells = [
      ...cells,
      { id: "C1", rowIndex: 0, columnIndex: 2, text: "120", address: "C1" },
    ];
    const result = buildRowSelectionPairs(
      [extendedCells[0], extendedCells[2]],
      [extendedCells[1], extendedCells[6], extendedCells[3]],
      { 1: "期末", 2: "期初" },
    );

    expect(result.pairs).toEqual([
      { outputColumn: "收入期末", cell: "B1" },
      { outputColumn: "收入期初", cell: "C1" },
      { outputColumn: "成本", cell: "B2" },
    ]);
    expect(result.suffixColumnIndexes).toEqual([1, 2]);
    expect(result.missingSuffixColumnIndexes).toEqual([]);
  });

  it("同一行多目标数据时报告缺失和重复后缀", () => {
    const extendedCells = [
      ...cells,
      { id: "C1", rowIndex: 0, columnIndex: 2, text: "120", address: "C1" },
    ];
    const missing = buildRowSelectionPairs(
      [extendedCells[0]],
      [extendedCells[1], extendedCells[6]],
      { 1: "期末" },
    );
    expect(missing.missingSuffixColumnIndexes).toEqual([2]);

    const duplicate = buildRowSelectionPairs(
      [extendedCells[0]],
      [extendedCells[1], extendedCells[6]],
      { 1: "余额", 2: "余额" },
    );
    expect(duplicate.duplicateSuffixes).toEqual(["余额"]);
  });
});
