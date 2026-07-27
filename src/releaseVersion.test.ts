import { describe, expect, it } from "vitest";
// @ts-expect-error Vitest 在 Node 环境运行，生产构建不需要引入 Node 类型。
import { readFileSync } from "fs";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf-8"));
const packageLock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf-8"));
const cargoToml = readFileSync(new URL("../src-tauri/Cargo.toml", import.meta.url), "utf-8");
const cargoLock = readFileSync(new URL("../src-tauri/Cargo.lock", import.meta.url), "utf-8");
const tauriConfig = JSON.parse(
  readFileSync(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf-8"),
);
const buildBat = readFileSync(new URL("../build.bat", import.meta.url), "utf-8");
const portableBat = readFileSync(
  new URL("../scripts/build_portable.bat", import.meta.url),
  "utf-8",
);
const installerBat = readFileSync(
  new URL("../scripts/build_installer.bat", import.meta.url),
  "utf-8",
);
const makeRelease = readFileSync(
  new URL("../scripts/make_release.ps1", import.meta.url),
  "utf-8",
);
const auditRelease = readFileSync(
  new URL("../scripts/audit_release.ps1", import.meta.url),
  "utf-8",
);
const aboutContent = readFileSync(new URL("./aboutContent.ts", import.meta.url), "utf-8");
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf-8");
const development = readFileSync(
  new URL("../docs/DEVELOPMENT.md", import.meta.url),
  "utf-8",
);
const appVersion = readFileSync(new URL("./appVersion.ts", import.meta.url), "utf-8");
const appSidebar = readFileSync(
  new URL("./components/AppSidebar.vue", import.meta.url),
  "utf-8",
);

describe("FADT v0.3.0 release version", () => {
  it("keeps package, Tauri, Cargo and lockfiles on 0.3.0", () => {
    expect(packageJson.version).toBe("0.3.0");
    expect(packageLock.version).toBe("0.3.0");
    expect(packageLock.packages[""].version).toBe("0.3.0");
    expect(tauriConfig.version).toBe("0.3.0");
    expect(cargoToml).toContain('version = "0.3.0"');
    expect(cargoLock).toMatch(/name = "fadt"\r?\nversion = "0\.3\.0"/);
  });

  it("uses 0.3.0 in every build and audit entrypoint", () => {
    for (const source of [buildBat, portableBat, installerBat]) {
      expect(source).toContain("-Version 0.3.0");
      expect(source).not.toContain("-Version 0.2.8");
    }
    expect(makeRelease).toContain('[string]$Version = "0.3.0"');
    expect(auditRelease).toContain('[string]$Version = "0.3.0"');
  });

  it("shows v0.3.0 in product copy and release documentation", () => {
    expect(aboutContent).toContain('version: "v0.3.0"');
    expect(aboutContent).toContain('description: "v0.3.0"');
    expect(readme).toContain("FADT-v0.3.0-win64-portable.zip");
    expect(readme).toContain("界面动效");
    expect(development).toContain("当前发布版本为 `0.3.0`");
    expect(appVersion).toContain('import packageJson from "../package.json"');
    expect(appSidebar).toContain("APP_VERSION");
    expect(appSidebar).not.toContain("<small>v0.3.0</small>");
  });
});
