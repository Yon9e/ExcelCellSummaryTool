import type { WorkspaceKey } from "./types";

export type SupportView = "main" | "help" | "regex";

export interface SupportWindowConfig {
  label: string;
  title: string;
  url: string;
  width: number;
  height: number;
  visible: boolean;
  minimizable: boolean;
  resizable: boolean;
  center: boolean;
  backgroundColor: string;
}

export function getSupportWindowConfig(
  view: Exclude<SupportView, "main">,
  returnWorkspace: WorkspaceKey = "summary",
): SupportWindowConfig {
  const url = `/?${new URLSearchParams({ view, return: returnWorkspace }).toString()}`;
  const configs: Record<Exclude<SupportView, "main">, SupportWindowConfig> = {
    help: {
      label: "help-manual",
      title: "使用手册",
      url,
      width: 1120,
      height: 780,
      visible: false,
      minimizable: true,
      resizable: true,
      center: true,
      backgroundColor: "#0e1b2d",
    },
    regex: {
      label: "regex-manual",
      title: "正则表达式教程",
      url,
      width: 1180,
      height: 820,
      visible: false,
      minimizable: true,
      resizable: true,
      center: true,
      backgroundColor: "#0e1b2d",
    },
  };
  return configs[view];
}

export function getSupportViewFromSearch(search: string): SupportView {
  const view = new URLSearchParams(search).get("view");
  if (view === "help" || view === "regex") {
    return view;
  }
  return "main";
}

export function isWorkspaceKey(value: unknown): value is WorkspaceKey {
  return value === "summary" || value === "ocr" || value === "text-cleaner" || value === "about";
}

export function getWorkspaceFromSearch(search: string): WorkspaceKey {
  const workspace = new URLSearchParams(search).get("workspace");
  return isWorkspaceKey(workspace) ? workspace : "summary";
}

export function getSupportReturnWorkspaceFromSearch(search: string): WorkspaceKey {
  const workspace = new URLSearchParams(search).get("return");
  return isWorkspaceKey(workspace) ? workspace : "summary";
}

export function getMainViewPath(currentUrl: string): string {
  const current = new URL(currentUrl, "https://financial-tool.local");
  const workspace = getSupportReturnWorkspaceFromSearch(current.search);
  return workspace === "summary" ? "/" : `/?workspace=${workspace}`;
}
