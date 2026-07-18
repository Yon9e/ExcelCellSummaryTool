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
    version: "v0.2.2",
    description: "Excel 定向汇总、截图识字与图片规则定位",
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
        description: "v0.2.2",
        detail: "修复 Excel 填充色和边缘噪声导致标注蓝框漏检的问题",
      },
    ],
  };
}
