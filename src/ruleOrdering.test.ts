import { describe, expect, it } from "vitest";
import type { Rule } from "./types";

const rules: Rule[] = [
  { output_column: "货币资金", sheet_mode: "exact", sheet_value: "资产负债表", cell: "B7" },
  { output_column: "营业收入", sheet_mode: "contains", sheet_value: "利润", cell: "C12" },
  { output_column: "第一个 Sheet", sheet_mode: "index", sheet_value: "1", cell: "A1" },
];

describe("规则行排序", () => {
  it("拖动规则后更新顺序，并保持原规则的选中状态", async () => {
    const modulePath = "./ruleOrdering";
    const orderingModule = await import(/* @vite-ignore */ modulePath).catch(() => ({}));

    expect(orderingModule).toHaveProperty("reorderRules");

    const result = orderingModule.reorderRules(rules, 0, 2, 0);

    expect(result.rules.map((rule: Rule) => rule.output_column)).toEqual([
      "营业收入",
      "第一个 Sheet",
      "货币资金",
    ]);
    expect(result.selectedIndex).toBe(2);
  });
});
