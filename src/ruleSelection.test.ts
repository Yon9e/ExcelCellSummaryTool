import { describe, expect, it } from "vitest";
import {
  deleteSelectedRules,
  duplicateSelectedRules,
  ensureRuleIds,
  toggleRuleRange,
  toggleRuleSelection,
} from "./ruleSelection";
import type { Rule } from "./types";

function fixtureRules(): Rule[] {
  return [
    { id: "r1", output_column: "货币资金", sheet_mode: "exact", sheet_value: "资产负债表", cell: "B7" },
    { id: "r2", output_column: "营业收入", sheet_mode: "contains", sheet_value: "利润", cell: "C12" },
    { id: "r3", output_column: "第一张", sheet_mode: "index", sheet_value: "1", cell: "A1" },
  ];
}

describe("规则多选", () => {
  it("普通点击单选，Ctrl 点击切换指定规则", () => {
    expect([...toggleRuleSelection(new Set(["r1", "r2"]), "r3", false)]).toEqual(["r3"]);
    expect([...toggleRuleSelection(new Set(["r1"]), "r2", true)]).toEqual(["r1", "r2"]);
    expect([...toggleRuleSelection(new Set(["r1", "r2"]), "r2", true)]).toEqual(["r1"]);
  });

  it("拖选范围与当前选择相交时逐行反选", () => {
    expect([...toggleRuleRange(["r1", "r2", "r3"], new Set(["r2"]), "r1", "r3")])
      .toEqual(["r1", "r3"]);
  });

  it("可批量删除已勾选规则", () => {
    expect(deleteSelectedRules(fixtureRules(), new Set(["r1", "r3"])).map((rule) => rule.id))
      .toEqual(["r2"]);
  });

  it("已勾选的规则按原顺序复制到最后一条源规则之后", () => {
    const result = duplicateSelectedRules(fixtureRules(), new Set(["r1", "r3"]));

    expect(result.rules.map((rule) => rule.output_column)).toEqual([
      "货币资金",
      "营业收入",
      "第一张",
      "货币资金",
      "第一张",
    ]);
    expect(result.rules.slice(3).map((rule) => rule.id)).not.toEqual(["r1", "r3"]);
    expect([...result.selectedIds]).toEqual(result.rules.slice(3).map((rule) => rule.id));
  });
  it("载入旧方案时为没有前端 ID 的规则补齐稳定标识", () => {
    const loaded = ensureRuleIds(fixtureRules().map(({ id: _id, ...rule }) => rule));
    expect(loaded.map((rule) => rule.id)).toHaveLength(3);
    expect(new Set(loaded.map((rule) => rule.id)).size).toBe(3);
  });
});
