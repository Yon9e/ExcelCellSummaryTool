import { describe, expect, it } from "vitest";
import { getBrandSubtitle } from "./brandContent";

describe("getBrandSubtitle", () => {
  it("uses a financial tool subtitle without audit automation wording", () => {
    const subtitle = getBrandSubtitle();
    expect(subtitle).toBe("Excel 汇总与 OCR");
    expect(subtitle).not.toContain("审计自动化");
  });
});
