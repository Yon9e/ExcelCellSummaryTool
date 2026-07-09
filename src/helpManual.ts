export interface HelpManualSection {
  title: string;
  items: string[];
}

export interface HelpManual {
  title: string;
  sections: HelpManualSection[];
}

export function getHelpManual(): HelpManual {
  return {
    title: "使用手册",
    sections: [
      {
        title: "准备工作",
        items: [
          "把需要汇总的 Excel 文件放在同一个目标文件夹内；本工具只扫描目标目录本层，不递归扫描子文件夹。",
          "支持 .xlsx、.xlsm、.xltx、.xltm 文件，并会自动跳过 Excel 临时文件。",
          "如果单元格是公式，请先在 Excel 中打开并保存源工作簿；本工具读取已保存的公式缓存值，不重新计算公式。",
        ],
      },
      {
        title: "数据源配置",
        items: [
          "在“目标文件夹”选择待扫描的 Excel 文件夹。",
          "在“输出文件”选择汇总结果保存位置，建议使用 .xlsx 后缀。",
          "关键词为空时处理全部符合条件的 Excel 文件；选择“包含关键词”或“排除关键词”可筛选文件名。",
        ],
      },
      {
        title: "规则配置",
        items: [
          "输出列名会成为汇总结果中的列标题。",
          "Sheet 模式 exact 表示精确匹配 Sheet 名；contains 表示 Sheet 名包含关键词；index 表示按 1 起始序号定位 Sheet。",
          "单元格填写需要读取的位置，例如 A1、B7、AA20。",
          "遇到 Sheet 关键词命中多个 Sheet 时，在弹窗中选择实际要读取的 Sheet 后继续。",
        ],
      },
      {
        title: "操作步骤",
        items: [
          "进入“数据源配置”，选择目标文件夹、输出文件和文件名筛选方式。",
          "进入“规则配置”，逐行填写输出列名、Sheet 定位方式、Sheet 值和单元格。",
          "进入“执行与日志”，点击“开始汇总”，等待进度到 100%。",
          "汇总完成后可选择立即打开输出文件，或稍后从输出路径手动打开。",
        ],
      },
      {
        title: "常见提示",
        items: [
          "如果提示输出文件被占用，请关闭已打开的汇总结果文件后重试。",
          "如果日志提示未找到 Sheet，请检查 Sheet 模式和 Sheet 值是否与源文件一致。",
          "如果读取结果为空，请确认单元格地址是否正确，以及公式源工作簿是否已经保存缓存值。",
        ],
      },
    ],
  };
}
