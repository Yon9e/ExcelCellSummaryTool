export interface AboutCard {
  title: string;
  description: string;
  detail?: string;
}

export interface AboutContent {
  title: string;
  version: string;
  description: string;
  cards: AboutCard[];
}

export function getAboutContent(): AboutContent {
  return {
    title: "Excel 单元格定向汇总工具",
    version: "v0.1.0",
    description: "批量读取 Excel 指定 Sheet 与单元格并汇总输出",
    cards: [
      { title: "主作者", description: "Yon9e", detail: "个人发布与维护" },
      {
        title: "开源仓库",
        description: "github.com/Yon9e/ExcelCellSummaryTool",
        detail: "MIT License",
      },
      {
        title: "意见反馈",
        description: "可在 GitHub Issues 报告问题或提出建议",
        detail: "请尽量附带截图、示例文件结构和复现步骤",
      },
      {
        title: "更新记录",
        description: "v0.1.0",
        detail: "桌面版、规则配置、Sheet 冲突选择、完成后打开输出文件、独立帮助窗口",
      },
    ],
  };
}
