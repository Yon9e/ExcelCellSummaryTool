import { describe, expect, it } from "vitest";
import {
  applyVisibleSourcePathRangeSelection,
  invertVisibleSourcePaths,
  mergeUniqueSourcePaths,
  selectAllVisibleSourcePaths,
  sourcePathsEqual,
} from "./sourcePaths";

describe("mergeUniqueSourcePaths", () => {
  it("可按添加顺序混合文件和文件夹并去重", () => {
    expect(mergeUniqueSourcePaths(
      ["D:\\报表目录"],
      ["D:\\报表目录\\A.xlsx", "D:\\报表目录", "D:\\其他目录", ""],
    )).toEqual([
      "D:\\报表目录",
      "D:\\报表目录\\A.xlsx",
      "D:\\其他目录",
    ]);
  });

  it("全选当前可见结果时保留其他目录已选项目", () => {
    expect(selectAllVisibleSourcePaths(
      ["D:\\其他目录\\已选.xlsx"],
      ["D:\\当前目录\\A.xlsx", "D:\\当前目录\\B.xlsx", "D:\\当前目录\\A.xlsx"],
    )).toEqual([
      "D:\\其他目录\\已选.xlsx",
      "D:\\当前目录\\A.xlsx",
      "D:\\当前目录\\B.xlsx",
    ]);
  });

  it("反选只切换当前可见结果，保留其他目录已选项目", () => {
    expect(invertVisibleSourcePaths(
      ["D:\\其他目录\\已选.xlsx", "D:\\当前目录\\A.xlsx"],
      ["D:\\当前目录\\A.xlsx", "D:\\当前目录\\B.xlsx", "D:\\当前目录\\C.xlsx"],
    )).toEqual([
      "D:\\其他目录\\已选.xlsx",
      "D:\\当前目录\\B.xlsx",
      "D:\\当前目录\\C.xlsx",
    ]);
  });

  it("忽略 Windows 路径的大小写、末尾分隔符和正反斜杠", () => {
    expect(mergeUniqueSourcePaths(
      ["D:\\报表目录\\", "d:/报表目录/A.xlsx"],
      ["d:\\报表目录", "D:\\报表目录\\a.xlsx\\"],
    )).toEqual([
      "D:\\报表目录\\",
      "d:/报表目录/A.xlsx",
    ]);
    expect(sourcePathsEqual("D:\\报表目录\\", "d:/报表目录")).toBe(true);

    expect(invertVisibleSourcePaths(
      ["D:\\报表目录\\A.xlsx\\"],
      ["d:/报表目录/a.xlsx", "D:\\报表目录\\B.xlsx"],
    )).toEqual(["D:\\报表目录\\B.xlsx"]);
  });

  it("连续拖动会选择起止行之间的完整区间", () => {
    const visiblePaths = [
      "D:\\当前目录\\A.xlsx",
      "D:\\当前目录\\B.xlsx",
      "D:\\当前目录\\C.xlsx",
      "D:\\当前目录\\D.xlsx",
    ];
    expect(applyVisibleSourcePathRangeSelection(
      ["D:\\其他目录\\已选.xlsx"],
      visiblePaths,
      visiblePaths[0],
      visiblePaths[3],
      true,
    )).toEqual([
      "D:\\其他目录\\已选.xlsx",
      ...visiblePaths,
    ]);

    expect(applyVisibleSourcePathRangeSelection(
      ["D:\\其他目录\\已选.xlsx", ...visiblePaths],
      visiblePaths,
      visiblePaths[1],
      visiblePaths[3],
      false,
    )).toEqual([
      "D:\\其他目录\\已选.xlsx",
      "D:\\当前目录\\A.xlsx",
    ]);
  });
});
