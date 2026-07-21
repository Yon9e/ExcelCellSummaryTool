import { describe, expect, it } from "vitest";
import { getMainViewPath, getSupportWindowConfig, getSupportViewFromSearch } from "./supportWindows";

describe("support windows", () => {
  it("opens the help manual as a minimizable separate window with a dark first paint", () => {
    const config = getSupportWindowConfig("help");

    expect(config.label).toBe("help-manual");
    expect(config.url).toContain("view=help");
    expect(config.minimizable).toBe(true);
    expect(config.resizable).toBe(true);
    expect(config.backgroundColor).toBe("#0e1b2d");
  });

  it("does not route about to a support window", () => {
    expect(getSupportViewFromSearch("?view=about")).toBe("main");
  });

  it("opens the Regex tutorial as a dark, minimizable separate window", () => {
    const config = getSupportWindowConfig("regex");

    expect(config.label).toBe("regex-manual");
    expect(config.url).toContain("view=regex");
    expect(config.minimizable).toBe(true);
    expect(getSupportViewFromSearch("?view=regex")).toBe("regex");
  });

  it("returns from a support page to the main view without preserving its view query", () => {
    expect(getMainViewPath("http://127.0.0.1:5173/?view=regex")).toBe("/");
    expect(getMainViewPath("/?view=help#step-2")).toBe("/");
  });
});
