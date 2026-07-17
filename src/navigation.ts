import {
  Database,
  FileSpreadsheet,
  ListChecks,
  Play,
  ScanText,
  Settings2,
} from "lucide-react";
import type { PageKey } from "./types";

export const pages: Array<{
  key: PageKey;
  label: string;
  icon: typeof Settings2;
}> = [
  { key: "scheme", label: "方案管理", icon: Settings2 },
  { key: "source", label: "数据源配置", icon: Database },
  { key: "rules", label: "规则配置", icon: ListChecks },
  { key: "ocr", label: "截图识字", icon: ScanText },
  { key: "run", label: "执行与日志", icon: Play },
  { key: "about", label: "关于", icon: FileSpreadsheet },
];
