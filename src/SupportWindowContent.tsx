import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauriRuntime } from "./browserPreview";
import { getHelpManual } from "./helpManual";
import { regexManualSections } from "./regexManual";
import type { SupportView } from "./supportWindows";

export function SupportWindowContent({ view }: { view: Exclude<SupportView, "main"> }) {
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }
    const window = getCurrentWindow();
    void window.show().then(() => window.setFocus());
  }, []);

  const manual = getHelpManual();
  const filteredRegexSections = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return regexManualSections;
    }
    return regexManualSections
      .map((section) => ({
        ...section,
        recipes: section.recipes.filter((recipe) =>
          [section.title, section.description, recipe.title, recipe.find, recipe.replace, recipe.note]
            .join(" ")
            .toLowerCase()
            .includes(normalized),
        ),
      }))
      .filter((section) => section.recipes.length > 0);
  }, [query]);

  if (view === "regex") {
    return (
      <main className="support-window-shell regex-manual-shell">
        <header className="support-window-heading regex-heading">
          <div>
            <p className="eyebrow">剪贴板文本清洗</p>
            <h1>财务工作常用正则表达式</h1>
            <p>按任务查找可直接使用的查找与替换方案。本工具使用 JavaScript 正则语法。</p>
          </div>
          <label className="regex-search">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索日期、金额、公司名、OCR……" />
          </label>
        </header>
        <div className="regex-manual-layout">
          <nav className="regex-index" aria-label="正则教程目录">
            <strong>按任务查找</strong>
            {regexManualSections.map((section) => (
              <a key={section.id} href={`#${section.id}`}>{section.title}</a>
            ))}
          </nav>
          <div className="regex-sections">
            {filteredRegexSections.map((section) => (
              <section className="regex-section" id={section.id} key={section.id}>
                <header><h2>{section.title}</h2><p>{section.description}</p></header>
                <div className="regex-recipe-list">
                  {section.recipes.map((recipe) => (
                    <article className="regex-recipe" key={recipe.title}>
                      <h3>{recipe.title}</h3>
                      <div className="regex-code-grid">
                        <div><span>查找</span><code>{recipe.find}</code></div>
                        <div><span>替换</span><code>{recipe.replace || "（留空）"}</code></div>
                      </div>
                      <p>{recipe.note}</p>
                    </article>
                  ))}
                </div>
              </section>
            ))}
            {filteredRegexSections.length === 0 && <div className="regex-empty">没有找到匹配的正则方案。</div>}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="support-window-shell">
      <header className="support-window-heading">
        <p className="eyebrow">Excel 单元格定向汇总工具</p>
        <h1>{manual.title}</h1>
      </header>
      <div className="help-manual-body support-manual-body">
        {manual.sections.map((section, sectionIndex) => (
          <section className="help-section" key={section.title}>
            <div className="help-section-index">{sectionIndex + 1}</div>
            <div>
              <h4>{section.title}</h4>
              <ol>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
