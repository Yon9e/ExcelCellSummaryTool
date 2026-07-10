import { describe, expect, it } from "vitest";
// @ts-expect-error Vitest 在 Node 环境运行，项目生产构建不需要引入 Node 类型。
import { readFileSync } from "fs";

const buildScript = readFileSync(new URL("../build.bat", import.meta.url), "utf-8");

describe("发布脚本隐私检查", () => {
  it("使用脚本所在目录，不包含开发者本机绝对路径", () => {
    expect(buildScript).toContain("%~dp0");
    expect(buildScript).toContain("--remap-path-prefix=%CD%=.");
    expect(buildScript).toContain("--remap-path-prefix=%USERPROFILE%=~");
    expect(buildScript).toContain("scripts\\audit_release.ps1");
    expect(buildScript).not.toMatch(/[A-Z]:\\(?:Users|DevHub)\\/i);
  });
});
