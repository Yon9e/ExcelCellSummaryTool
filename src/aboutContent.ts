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
    title: "Financial Tool 财务工具箱",
    version: "v0.2.6",
    description: "Excel 定向汇总、截图识字与图片规则定位",
    cards: [
      { title: "主作者", description: "Yon9e", detail: "个人发布与维护" },
      {
        title: "开源仓库",
        description: "github.com/Yon9e/ExcelCellSummaryTool",
        detail: "GNU GPL v3.0",
      },
      {
        title: "意见反馈",
        description: "可在 GitHub Issues 报告问题或提出建议",
        detail: "请尽量附带截图、示例文件结构和复现步骤",
      },
      {
        title: "更新记录",
        description: "v0.2.6",
        detail: "统一文件选择、优化桌面启动与发布体验",
      },
    ],
  };
}
