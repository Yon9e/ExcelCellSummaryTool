import { describe, expect, it } from "vitest";
import { browserPreviewMessage, isTauriRuntime } from "./browserPreview";

describe("浏览器预览运行时判断", () => {
  it("未注入 Tauri 内部对象时视为浏览器预览", () => {
    expect(isTauriRuntime({})).toBe(false);
    expect(isTauriRuntime(undefined)).toBe(false);
  });

  it("注入 Tauri 内部对象时保留桌面版路径", () => {
    expect(isTauriRuntime({ __TAURI_INTERNALS__: {} })).toBe(true);
  });

  it("向预览用户说明原生功能边界", () => {
    expect(browserPreviewMessage).toContain("浏览器预览模式");
    expect(browserPreviewMessage).toContain("桌面版");
  });
});
