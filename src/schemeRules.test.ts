import { describe, expect, it } from "vitest";
import { normalizeSchemeRules } from "./schemeRules";

describe("方案规则默认状态", () => {
  it("新方案或空方案保持零条规则", () => {
    expect(normalizeSchemeRules([])).toEqual([]);
  });

  it("载入已有规则时补齐稳定 ID 且不改业务字段", () => {
    const [rule] = normalizeSchemeRules([
      {
        output_column: "工资",
        sheet_mode: "contains",
        sheet_value: "审定附注",
        cell: "B1226",
      },
    ]);

    expect(rule).toMatchObject({
      output_column: "工资",
      sheet_mode: "contains",
      sheet_value: "审定附注",
      cell: "B1226",
    });
    expect(rule.id).toBeTruthy();
  });
});
