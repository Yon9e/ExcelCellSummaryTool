import { describe, expect, it } from "vitest";
import { getSupportWindowConfig, getSupportViewFromSearch } from "./supportWindows";

describe("support windows", () => {
  it("opens the help manual as a minimizable separate window", () => {
    const config = getSupportWindowConfig("help");

    expect(config.label).toBe("help-manual");
    expect(config.url).toContain("view=help");
    expect(config.minimizable).toBe(true);
    expect(config.resizable).toBe(true);
  });

  it("detects the about support view from the query string", () => {
    expect(getSupportViewFromSearch("?view=about")).toBe("about");
  });
});
