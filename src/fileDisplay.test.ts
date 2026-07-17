import { describe, expect, it } from "vitest";
import { getFileDisplayName } from "./fileDisplay";

describe("getFileDisplayName", () => {
  it("仅显示 Windows 输出路径中的文件名", () => {
    expect(getFileDisplayName(String.raw`D:\报表\汇总结果.xlsx`)).toBe("汇总结果.xlsx");
  });

  it("兼容正斜杠路径和空值", () => {
    expect(getFileDisplayName("C:/reports/result.xlsx")).toBe("result.xlsx");
    expect(getFileDisplayName("")).toBe("汇总结果.xlsx");
  });
});
