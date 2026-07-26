import { describe, expect, it } from "vitest";
// @ts-expect-error Vitest 在 Node 环境运行，生产构建不需要引入 Node 类型。
import { readFileSync } from "fs";

const responsive = readFileSync(
  new URL("./styles/v3-responsive.css", import.meta.url),
  "utf-8",
);
const motion = readFileSync(new URL("./styles/v3-motion.css", import.meta.url), "utf-8");
const shell = readFileSync(new URL("./styles/v3-shell.css", import.meta.url), "utf-8");

describe("FADT v3 responsive and accessibility gates", () => {
  it("implements the approved 1280 and 1000 desktop breakpoints", () => {
    expect(responsive).toContain("@media (max-width: 1279px)");
    expect(responsive).toContain("@media (max-width: 999px)");
    expect(responsive).toContain("grid-template-columns: 72px minmax(0, 1fr)");
    expect(responsive).toContain("grid-template-columns: 64px minmax(0, 1fr)");
    expect(responsive).toContain("overflow-x: auto");
  });

  it("provides visible keyboard focus for all core controls", () => {
    const css = `${shell}\n${responsive}`;
    expect(css).toContain(":focus-visible");
    expect(css).toContain("outline: 2px solid var(--v3-signal)");
    expect(css).toContain("outline-offset: 2px");
  });

  it("honors explicit and system reduced-motion modes", () => {
    expect(motion).toContain('[data-motion-level="reduced"]');
    expect(motion).toContain("@media (prefers-reduced-motion: reduce)");
    expect(motion).toContain("animation-duration: 1ms");
  });
});
