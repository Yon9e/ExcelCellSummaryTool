import { describe, expect, it } from "vitest";
import { getRuleRowKey } from "./ruleKeys";

describe("getRuleRowKey", () => {
  it("规则对象换位时保持稳定标识", () => {
    const first = { output_column: "货币资金" };
    const second = { output_column: "营业收入" };

    expect(getRuleRowKey(first)).toBe(getRuleRowKey(first));
    expect(getRuleRowKey(first)).not.toBe(getRuleRowKey(second));
  });
});
