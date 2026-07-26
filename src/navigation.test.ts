import { describe, expect, it } from "vitest";
import { ocrTabs, summaryTabs, workspacePages } from "./navigation";

describe("navigation", () => {
  it("keeps settings immediately before about in the sidebar", () => {
    expect(workspacePages.map((page) => page.key)).toEqual([
      "summary",
      "ocr",
      "text-cleaner",
      "settings",
      "about",
    ]);
    expect(workspacePages.find((page) => page.key === "text-cleaner")?.label).toBe("文本清洗");
    expect(workspacePages.find((page) => page.key === "settings")?.label).toBe("设置");
    expect(workspacePages.find((page) => page.key === "about")?.label).toBe("关于");
  });

  it("groups the previous summary pages into top tabs", () => {
    expect(summaryTabs.map((tab) => tab.key)).toEqual(["scheme", "source", "rules", "run"]);
  });

  it("exposes capture and Umi-OCR settings as OCR tabs", () => {
    expect(ocrTabs.map((tab) => tab.key)).toEqual(["capture", "settings"]);
    expect(ocrTabs.find((tab) => tab.key === "settings")?.label).toBe("Umi-OCR 设置");
  });
});
