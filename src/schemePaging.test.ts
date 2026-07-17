import { describe, expect, it } from "vitest";
import { getSchemePage } from "./schemePaging";
import type { Scheme } from "./types";

function scheme(name: string): Scheme {
  return {
    name,
    target_folder: "",
    output_file: "",
    keyword: "",
    filter_mode: "include",
    rules: [],
  };
}

describe("getSchemePage", () => {
  const schemes = Array.from({ length: 19 }, (_, index) => scheme(`方案 ${index + 1}`));

  it("将长方案列表限制为固定页数", () => {
    const page = getSchemePage(schemes, "", 2, 8);

    expect(page.items).toHaveLength(8);
    expect(page.items[0].name).toBe("方案 9");
    expect(page.totalPages).toBe(3);
  });

  it("支持搜索并纠正越界页码", () => {
    const page = getSchemePage(schemes, "方案 1", 99, 8);

    expect(page.currentPage).toBe(2);
    expect(page.totalItems).toBe(11);
    expect(page.items.map((item) => item.name)).toEqual(["方案 17", "方案 18", "方案 19"]);
  });
});
