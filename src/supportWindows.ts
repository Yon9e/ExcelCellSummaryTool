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

export function getSupportWindowConfig(view: Exclude<SupportView, "main">): SupportWindowConfig {
  const configs: Record<Exclude<SupportView, "main">, SupportWindowConfig> = {
    help: {
      label: "help-manual",
      title: "使用手册",
      url: "/?view=help",
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
      url: "/?view=regex",
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

export function getMainViewPath(currentUrl: string): string {
  const current = new URL(currentUrl, "https://financial-tool.local");
  return current.pathname || "/";
}
