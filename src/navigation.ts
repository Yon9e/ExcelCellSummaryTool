import {
  ClipboardCheck,
  Database,
  FileSpreadsheet,
  Info,
  ListChecks,
  Play,
  ScanText,
  Settings2,
  SlidersHorizontal,
} from "@lucide/vue";
import type { Component } from "vue";
import type { OcrTabKey, SummaryTabKey, WorkspaceKey } from "./types";

export interface NavigationItem<T extends string> {
  key: T;
  label: string;
  icon: Component;
}

export const workspacePages: NavigationItem<WorkspaceKey>[] = [
  { key: "summary", label: "汇总", icon: FileSpreadsheet },
  { key: "ocr", label: "截图识字", icon: ScanText },
  { key: "text-cleaner", label: "文本清洗", icon: ClipboardCheck },
  { key: "about", label: "关于", icon: Info },
];

export const summaryTabs: NavigationItem<SummaryTabKey>[] = [
  { key: "scheme", label: "方案管理", icon: Settings2 },
  { key: "source", label: "数据源配置", icon: Database },
  { key: "rules", label: "规则配置", icon: ListChecks },
  { key: "run", label: "执行与日志", icon: Play },
];

export const ocrTabs: NavigationItem<OcrTabKey>[] = [
  { key: "capture", label: "截图识字", icon: ScanText },
  { key: "settings", label: "Umi-OCR 设置", icon: SlidersHorizontal },
];
