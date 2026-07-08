import { describe, expect, it } from "vitest";
import { getRuleRowKey } from "./ruleKeys";

describe("getRuleRowKey", () => {
  it("does not change when output column text changes", () => {
    expect(getRuleRowKey(2)).toBe("rule-2");
  });
});
