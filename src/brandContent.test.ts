import { describe, expect, it } from "vitest";
import { getBrandSubtitle } from "./brandContent";

describe("getBrandSubtitle", () => {
  it("does not show the audit automation subtitle", () => {
    expect(getBrandSubtitle()).toBeNull();
  });
});
