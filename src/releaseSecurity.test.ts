import { describe, expect, it } from "vitest";
// @ts-expect-error Vitest 在 Node 环境运行，项目生产构建不需要引入 Node 类型。
import { readFileSync } from "fs";

const buildScript = readFileSync(new URL("../build.bat", import.meta.url), "utf-8");
const installerScript = readFileSync(new URL("../scripts/build_installer.bat", import.meta.url), "utf-8");
const tauriConfig = readFileSync(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf-8");

describe("发布脚本隐私检查", () => {
  it("使用脚本所在目录，不包含开发者本机绝对路径", () => {
    expect(buildScript).toContain("%~dp0");
    expect(buildScript).toContain("--remap-path-prefix=%CD%=.");
    expect(buildScript).toContain("--remap-path-prefix=%USERPROFILE%=~");
    expect(buildScript).toContain("scripts\\audit_release.ps1");
    expect(buildScript).toContain("scripts\\setup_umi_ocr.ps1");
    expect(buildScript).toContain("-Version 0.2.1");
    expect(buildScript).not.toMatch(/[A-Z]:\\(?:Users|DevHub)\\/i);
  });

  it("安装器入口同样重映射路径并执行发布审计", () => {
    expect(installerScript).toContain("--remap-path-prefix=%CD%=.");
    expect(installerScript).toContain("--remap-path-prefix=%USERPROFILE%=~");
    expect(installerScript).toContain("scripts\\audit_release.ps1");
  });

  it("安装包包含项目与第三方许可文件", () => {
    expect(tauriConfig).toContain('"../LICENSE": "LICENSE"');
    expect(tauriConfig).toContain('"../THIRD_PARTY_NOTICES.md": "THIRD_PARTY_NOTICES.md"');
    expect(tauriConfig).toContain('"../THIRD_PARTY_LICENSES": "THIRD_PARTY_LICENSES"');
  });
});
