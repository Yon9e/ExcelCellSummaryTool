import { describe, expect, it } from "vitest";
// @ts-expect-error Vitest 在 Node 环境运行，项目生产构建不需要引入 Node 类型。
import { readFileSync } from "fs";

const tauriConfig = JSON.parse(
  readFileSync(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf-8"),
);
const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf-8");
const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf-8");
const releaseScript = readFileSync(new URL("../scripts/make_release.ps1", import.meta.url), "utf-8");
const auditScript = readFileSync(new URL("../scripts/audit_release.ps1", import.meta.url), "utf-8");
const contentTypographyRule =
  styles.match(/#root :where\([\s\S]*?\)\s*\{\s*font-size: var\(--content-font-size\);\s*\}/)?.[0] ?? "";
const dragOverlayTypographyRule =
  styles.match(/\.rule-drag-overlay,\s*\.rule-drag-overlay :where\([\s\S]*?\)\s*\{\s*font-size: var\(--content-font-size\);\s*\}/)?.[0] ?? "";

describe("桌面端首帧与呈现规范", () => {
  it("在前端加载前保持 FADT 的深色首帧", () => {
    expect(tauriConfig.productName).toBe("FADT");
    expect(tauriConfig.app.windows[0].backgroundColor).toBe("#0e1b2d");
    expect(indexHtml).toContain("background: #0e1b2d");
    expect(indexHtml).toContain('class="app-startup"');
    expect(indexHtml).toContain("正在启动 FADT…");
  });

  it("以统一的 14px 作为全部内容文字的字号", () => {
    expect(styles).toContain("--content-font-size: 14px");
    expect(contentTypographyRule).toContain("button,");
    expect(contentTypographyRule).toContain("strong,");
    expect(contentTypographyRule).toContain("time,");
    expect(dragOverlayTypographyRule).toContain(".rule-drag-overlay,");
    expect(dragOverlayTypographyRule).toContain("span,");
  });

  it("便携版与审计都使用 FADT.exe", () => {
    expect(releaseScript).toContain('"FADT.exe"');
    expect(auditScript).toContain('"FADT.exe"');
  });
});
