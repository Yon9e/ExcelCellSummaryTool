import { describe, expect, it } from "vitest";
import { getBrandSubtitle } from "./brandContent";

describe("getBrandSubtitle", () => {
  it("uses the FADT English expansion as the brand subtitle", () => {
    const subtitle = getBrandSubtitle();
    expect(subtitle).toBe("Financial Audit Data Toolkit");
  });
});
