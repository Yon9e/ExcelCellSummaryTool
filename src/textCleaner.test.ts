import { describe, expect, it } from "vitest";
import { cleanClipboardText, defaultTextCleaningOptions } from "./textCleaner";

describe("剪贴板文本清洗", () => {
  it("将常见 HTML 表格转换为可粘贴到 Excel 的制表符文本", () => {
    const result = cleanClipboardText(
      "<table><tr><td>科目</td><td>金额</td></tr><tr><td>货币资金</td><td>1,200</td></tr></table>",
      { ...defaultTextCleaningOptions, cleanHtml: true },
    );

    expect(result).toEqual({ value: "科目\t金额\n货币资金\t1,200" });
  });

  it("清洗 Excel CF_HTML 时忽略剪贴板格式头并只保留片段", () => {
    const result = cleanClipboardText(
      [
        "Version:1.0",
        "StartHTML:0000000105",
        "EndHTML:0000000240",
        "StartFragment:0000000137",
        "EndFragment:0000000208",
        "<html><body><!--StartFragment-->",
        "<table><tr><td>科目</td><td>金额</td></tr></table>",
        "<!--EndFragment--></body></html>",
      ].join("\r\n"),
      { ...defaultTextCleaningOptions, cleanHtml: true },
    );

    expect(result).toEqual({ value: "科目\t金额" });
  });

  it("去除空格时保留 Excel 单元格分隔符和换行", () => {
    const result = cleanClipboardText(
      " 货币 资金\t 1 200 \n 管理 费用 ",
      { ...defaultTextCleaningOptions, removeSpaces: true },
    );

    expect(result).toEqual({ value: "货币资金\t1200\n管理费用" });
  });

  it("可在全角和半角符号之间标准化", () => {
    const fullwidth = cleanClipboardText("A 1, (金额)", {
      ...defaultTextCleaningOptions,
      symbolWidth: "fullwidth",
    });
    const halfwidth = cleanClipboardText("Ａ　１，（金额）", {
      ...defaultTextCleaningOptions,
      symbolWidth: "halfwidth",
    });

    expect(fullwidth).toEqual({ value: "A 1， （金额）" });
    expect(halfwidth).toEqual({ value: "Ａ　１,(金额)" });
  });

  it("为每个非空 Excel 单元格增加前置撇号且不会重复添加", () => {
    const result = cleanClipboardText("001\tA01\n'已是文本\t", {
      ...defaultTextCleaningOptions,
      prefixApostrophe: true,
    });

    expect(result).toEqual({ value: "'001\t'A01\n'已是文本\t" });
  });

  it("支持 JavaScript 正则替换和清晰的错误反馈", () => {
    const converted = cleanClipboardText("20301231\n20310105", {
      ...defaultTextCleaningOptions,
      customRegex: {
        enabled: true,
        pattern: "^(\\d{4})(\\d{2})(\\d{2})$",
        replacement: "$1-$2-$3",
        flags: "gm",
      },
    });
    const invalid = cleanClipboardText("文本", {
      ...defaultTextCleaningOptions,
      customRegex: {
        enabled: true,
        pattern: "[",
        replacement: "",
        flags: "g",
      },
    });

    expect(converted).toEqual({ value: "2030-12-31\n2031-01-05" });
    expect(invalid.value).toBe("文本");
    expect(invalid.error).toContain("正则表达式无效");
  });

  it("正则替换内容支持制表符与换行转义", () => {
    const result = cleanClipboardText("1001-货币资金", {
      ...defaultTextCleaningOptions,
      customRegex: {
        enabled: true,
        pattern: "^(\\d+)-(.+)$",
        replacement: "$1\\t$2\\n复核",
        flags: "g",
      },
    });

    expect(result).toEqual({ value: "1001\t货币资金\n复核" });
  });

  it("按 UTF-8 字节偏移提取不含 Fragment 标记的中文 CF_HTML", () => {
    const html = "<html><body><table><tr><td>科目</td><td>金额</td></tr></table></body></html>";
    const headerTemplate = [
      "Version:1.0",
      "StartHTML:0000000000",
      "EndHTML:0000000000",
      "StartFragment:0000000000",
      "EndFragment:0000000000",
      "",
    ].join("\r\n");
    const start = new TextEncoder().encode(headerTemplate).length;
    const end = start + new TextEncoder().encode(html).length;
    const header = headerTemplate
      .replace("StartHTML:0000000000", `StartHTML:${String(start).padStart(10, "0")}`)
      .replace("EndHTML:0000000000", `EndHTML:${String(end).padStart(10, "0")}`);

    const result = cleanClipboardText(`${header}${html}`, {
      ...defaultTextCleaningOptions,
      cleanHtml: true,
    });

    expect(result).toEqual({ value: "科目\t金额" });
  });
});
