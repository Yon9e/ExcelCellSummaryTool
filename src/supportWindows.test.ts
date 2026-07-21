import { describe, expect, it } from "vitest";
import {
  getMainViewPath,
  getSupportReturnWorkspaceFromSearch,
  getSupportWindowConfig,
  getSupportViewFromSearch,
  getWorkspaceFromSearch,
  isWorkspaceKey,
} from "./supportWindows";

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
    const config = getSupportWindowConfig("regex", "text-cleaner");

    expect(config.label).toBe("regex-manual");
    expect(config.url).toContain("view=regex");
    expect(config.url).toContain("return=text-cleaner");
    expect(config.minimizable).toBe(true);
    expect(getSupportViewFromSearch("?view=regex")).toBe("regex");
  });

  it("returns from a support page to the workspace that opened it", () => {
    expect(getMainViewPath("http://127.0.0.1:5173/?view=regex")).toBe("/");
    expect(getMainViewPath("/?view=help&return=text-cleaner#step-2")).toBe("/?workspace=text-cleaner");
    expect(getSupportReturnWorkspaceFromSearch("?view=regex&return=text-cleaner")).toBe("text-cleaner");
    expect(getWorkspaceFromSearch("?workspace=text-cleaner")).toBe("text-cleaner");
    expect(isWorkspaceKey("text-cleaner")).toBe(true);
    expect(isWorkspaceKey("unknown")).toBe(false);
  });
});
