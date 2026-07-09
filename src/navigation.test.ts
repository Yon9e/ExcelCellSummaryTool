import { describe, expect, it } from "vitest";
import { pages } from "./navigation";

describe("navigation", () => {
  it("keeps about as a sidebar page instead of a support window", () => {
    expect(pages.map((page) => page.key)).toContain("about");
    expect(pages.find((page) => page.key === "about")?.label).toBe("关于");
  });
});
