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
    title: "FADT · Financial Audit Data Toolkit",
    version: "v0.3.0",
    description: "面向财务与审计人员的一体化数据处理工具",
    cards: [
      { title: "主作者", description: "Yon9e", detail: "个人发布与维护" },
      {
        title: "开源仓库",
        description: "github.com/Yon9e/FADT",
        detail: "GNU GPL v3.0",
      },
      {
        title: "意见反馈",
        description: "可在 GitHub Issues 报告问题或提出建议",
        detail: "请尽量附带截图、示例文件结构和复现步骤",
      },
      {
        title: "更新记录",
        description: "v0.3.0",
        detail: "采用 RAW A+C 工作台界面，新增响应式布局与自适应动效设置",
      },
    ],
  };
}
