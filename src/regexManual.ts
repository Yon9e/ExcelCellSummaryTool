export interface RegexRecipe {
  title: string;
  find: string;
  replace: string;
  note: string;
}

export interface RegexManualSection {
  id: string;
  title: string;
  description: string;
  recipes: RegexRecipe[];
}

export const regexManualSections: RegexManualSection[] = [
  {
    id: "whitespace",
    title: "空格、换行与粘贴清洗",
    description: "先处理复制、粘贴和表格内容中的空白字符。",
    recipes: [
      { title: "去除行首行尾空格", find: "^\\s+|\\s+$", replace: "", note: "开启多行标记 m，可逐行处理。" },
      { title: "多个空格合并为一个", find: "[ \\t]+", replace: " ", note: "不会误删换行。" },
      { title: "删除空行", find: "^\\s*\\r?\\n", replace: "", note: "开启全部 g 与多行 m。" },
    ],
  },
  {
    id: "company",
    title: "公司、单位与名称提取",
    description: "处理公司后缀、简称说明、单位标签和名称字段。",
    recipes: [
      { title: "删除括号内简称", find: "（.*?）|\\(.*?\\)", replace: "", note: "懒惰匹配避免跨越多组括号。" },
      { title: "删除常见公司后缀", find: "(?:股份)?有限公司$", replace: "", note: "仅处理文本结尾。" },
      { title: "提取单位名称字段", find: "^单位名称[：:]\\s*(.+)$", replace: "$1", note: "开启多行 m 可批量处理。" },
    ],
  },
  {
    id: "date",
    title: "日期、期间与格式统一",
    description: "统一常见日期格式；正则只校验格式，不校验日期是否合法。",
    recipes: [
      { title: "八位日期转横线日期", find: "^(\\d{4})(\\d{2})(\\d{2})$", replace: "$1-$2-$3", note: "示例：20301231 → 2030-12-31。" },
      { title: "中文日期转横线日期", find: "(\\d{4})年(\\d{1,2})月(\\d{1,2})日", replace: "$1-$2-$3", note: "适合 OCR 结果。" },
    ],
  },
  {
    id: "amount",
    title: "金额、百分比与负数",
    description: "清理货币符号、千分位和财务括号负数。",
    recipes: [
      { title: "删除货币符号和千分位", find: "[￥¥,]", replace: "", note: "开启全部 g。" },
      { title: "括号负数转负号", find: "^\\((.+)\\)$", replace: "-$1", note: "示例：(1,234.56) → -1,234.56。" },
      { title: "整行提取百分比数值", find: "^.*?([+-]?\\d+(?:\\.\\d+)?)%.*$", replace: "$1", note: "整行仅保留百分号前的数值。" },
    ],
  },
  {
    id: "account",
    title: "科目、账号与业务编号",
    description: "处理科目编码、账号和业务编号；保留前导零时建议配合“添加前置撇号”。",
    recipes: [
      { title: "删除科目编码", find: "^\\d+\\s*", replace: "", note: "开启多行 m。" },
      { title: "删除账号空格和横线", find: "[\\s-]+", replace: "", note: "适合连续账号，不要用于需要保留换行的整表。" },
      { title: "提取编号标签后的内容", find: "^(?:合同编号|凭证号|发票号码)[：:]\\s*(.+)$", replace: "$1", note: "开启多行 m。" },
    ],
  },
  {
    id: "ocr",
    title: "OCR 文字纠错",
    description: "修复中文、数字和常用符号之间的错误空格与页码文字。",
    recipes: [
      { title: "删除汉字之间空格", find: "(?<=[\\u4e00-\\u9fff])\\s+(?=[\\u4e00-\\u9fff])", replace: "", note: "保留英文单词间空格。" },
      { title: "合并数字之间空格", find: "(?<=\\d)\\s+(?=\\d)", replace: "", note: "确认空格不是合法千分位后再使用。" },
      { title: "删除页码文字", find: "第\\s*\\d+\\s*页", replace: "", note: "开启全部 g。" },
    ],
  },
  {
    id: "groups",
    title: "字段拆分与重组",
    description: "用捕获组保留需要的内容，再通过 $1、$2、$3 重组字段。",
    recipes: [
      { title: "拆分一级与明细科目", find: "^([^-_]+)[-_](.+)$", replace: "$1\\t$2", note: "替换内容中的 \\t 会转换为制表符，可直接粘贴为两列。" },
      { title: "账号脱敏", find: "^(\\d{4})\\d+(\\d{4})$", replace: "$1********$2", note: "固定显示八个星号。" },
    ],
  },
  {
    id: "safety",
    title: "语法提示与安全使用",
    description: "先在少量数据上验证，再处理完整剪贴板内容。",
    recipes: [
      { title: "完整八位数字", find: "^\\d{8}$", replace: "$&", note: "^ 和 $ 限定整行；多行数据请开启 m。" },
      { title: "避免贪婪删除", find: "（.*?）", replace: "", note: "优先使用 .*?，避免一次删除多组括号间内容。" },
    ],
  },
];
