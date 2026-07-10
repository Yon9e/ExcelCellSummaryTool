import { describe, expect, it } from "vitest";
// @ts-expect-error Vitest 在 Node 环境运行，项目生产构建不需要引入 Node 类型。
import { readFileSync } from "fs";

const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf-8");

function getCssBlock(selector: string): string {
  const start = styles.indexOf(`${selector} {`);
  if (start === -1) {
    return "";
  }
  const bodyStart = styles.indexOf("{", start) + 1;
  const bodyEnd = styles.indexOf("}", bodyStart);
  return styles.slice(bodyStart, bodyEnd);
}

describe("support window styles", () => {
  it("keeps the help manual scrollable inside the support window viewport", () => {
    const block = getCssBlock(".support-window-shell");

    expect(block).toContain("height: 100vh");
    expect(block).toContain("overflow-y: auto");
    expect(block).toContain("overflow-x: hidden");
  });
});
