import { describe, expect, it } from "vitest";
// @ts-expect-error Vitest 在 Node 环境运行，项目生产构建不需要引入 Node 类型。
import { readFileSync } from "fs";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf-8"));
const cargoToml = readFileSync(new URL("../src-tauri/Cargo.toml", import.meta.url), "utf-8");
const tauriConfig = JSON.parse(
  readFileSync(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf-8"),
);
const identity = readFileSync(new URL("../src-tauri/src/app_identity.rs", import.meta.url), "utf-8");
const schemeStore = readFileSync(new URL("../src-tauri/src/scheme_store.rs", import.meta.url), "utf-8");
const ocr = readFileSync(new URL("../src-tauri/src/ocr.rs", import.meta.url), "utf-8");
const installerHooks = readFileSync(
  new URL("../src-tauri/resources/fadt-installer-hooks.nsh", import.meta.url),
  "utf-8",
);
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf-8");

describe("FADT 项目身份与旧版数据兼容", () => {
  it("将对外项目、包和仓库统一命名为 FADT", () => {
    expect(packageJson.name).toBe("fadt");
    expect(tauriConfig.version).toBe(packageJson.version);
    expect(cargoToml).toContain('name = "fadt"');
    expect(cargoToml).toContain(`version = "${packageJson.version}"`);
    expect(cargoToml).toContain('repository = "https://github.com/Yon9e/FADT"');
    expect(tauriConfig.productName).toBe("FADT");
  });

  it("将新数据写入 FADT 目录，并保留旧目录迁移能力", () => {
    expect(identity).toContain('pub const APP_DATA_DIRECTORY: &str = "FADT"');
    expect(identity).toContain('pub const LEGACY_APP_DATA_DIRECTORY: &str = "ExcelCellSummaryTool"');
    expect(schemeStore).toContain("migrate_legacy_schemes_if_needed");
    expect(ocr).toContain("migrate_legacy_ocr_data_if_needed");
    expect(readme).toContain("%APPDATA%\\FADT\\schemes.json");
    expect(readme).toContain("%LOCALAPPDATA%\\FADT\\ocr-runtime\\UmiOCR-data");
  });

  it("保留旧安装标识，以便 v0.2.6 原地升级", () => {
    expect(tauriConfig.identifier).toBe("com.yon9e.excel-cell-summary-tool");
    expect(tauriConfig.bundle.windows.nsis.installerHooks).toBe("resources/fadt-installer-hooks.nsh");
    expect(installerHooks).toContain("Uninstall\\Financial Tool");
    expect(installerHooks).toContain("ExecWait '\"$R1\\uninstall.exe\" /S _?=$R1' $R2");
  });
});
