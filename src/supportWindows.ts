export type SupportView = "main" | "help" | "about";

export interface SupportWindowConfig {
  label: string;
  title: string;
  url: string;
  width: number;
  height: number;
  minimizable: boolean;
  resizable: boolean;
  center: boolean;
}

export function getSupportWindowConfig(view: Exclude<SupportView, "main">): SupportWindowConfig {
  const configs: Record<Exclude<SupportView, "main">, SupportWindowConfig> = {
    help: {
      label: "help-manual",
      title: "使用手册",
      url: "/?view=help",
      width: 1120,
      height: 780,
      minimizable: true,
      resizable: true,
      center: true,
    },
    about: {
      label: "about",
      title: "关于",
      url: "/?view=about",
      width: 1120,
      height: 720,
      minimizable: true,
      resizable: true,
      center: true,
    },
  };
  return configs[view];
}

export function getSupportViewFromSearch(search: string): SupportView {
  const view = new URLSearchParams(search).get("view");
  if (view === "help" || view === "about") {
    return view;
  }
  return "main";
}
