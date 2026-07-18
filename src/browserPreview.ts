export const browserPreviewMessage =
  "当前为浏览器预览模式：可查看界面与页面交互，Excel、文件选择、OCR 和系统剪贴板功能仅在桌面版可用。";

export function isTauriRuntime(runtime: unknown = typeof window === "undefined" ? undefined : window): boolean {
  return typeof runtime === "object" && runtime !== null && "__TAURI_INTERNALS__" in runtime;
}
