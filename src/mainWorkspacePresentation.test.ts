import { describe, expect, it } from "vitest";
// @ts-expect-error Vitest 在 Node 环境运行，生产构建不需要引入 Node 类型。
import { readFileSync } from "fs";

const appSource = readFileSync(new URL("./App.vue", import.meta.url), "utf-8");
const ocrSource = readFileSync(new URL("./OcrPage.vue", import.meta.url), "utf-8");
const cleanerSource = readFileSync(new URL("./TextCleanerPage.vue", import.meta.url), "utf-8");
const settingsSource = readFileSync(new URL("./SettingsPage.vue", import.meta.url), "utf-8");
const aboutSource = readFileSync(new URL("./AboutPage.vue", import.meta.url), "utf-8");
const workspaceStyles = readFileSync(
  new URL("./styles/v3-workspaces.css", import.meta.url),
  "utf-8",
);

describe("FADT v3 primary workspaces", () => {
  it("marks every A-type page with a stable page identity", () => {
    expect(appSource).toContain('data-page="summary-scheme"');
    expect(appSource).toContain('data-page="summary-source"');
    expect(appSource).toContain('data-page="summary-rules"');
    expect(appSource).toContain('data-page="summary-run"');
    expect(ocrSource).toContain('data-page="ocr-capture"');
    expect(cleanerSource).toContain('data-page="text-cleaner"');
    expect(settingsSource).toContain('data-page="settings"');
    expect(aboutSource).toContain('data-page="about"');
  });

  it("starts new installations without sample rules", () => {
    expect(appSource).not.toContain("const sampleRules");
    expect(appSource).toContain("const rules = ref<Rule[]>([])");
  });

  it("provides the shared RAW workspace primitives without gradients", () => {
    expect(workspaceStyles).toContain(".audit-stat-grid");
    expect(workspaceStyles).toContain(".audit-card");
    expect(workspaceStyles).toContain(".audit-table-toolbar");
    expect(workspaceStyles).toContain(".audit-empty-state");
    expect(workspaceStyles).toContain(".audit-log-console");
    expect(workspaceStyles).not.toContain("linear-gradient");
    expect(workspaceStyles).not.toContain("radial-gradient");
  });
});
