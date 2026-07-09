import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getHelpManual } from "./helpManual";
import type { SupportView } from "./supportWindows";

export function SupportWindowContent({ view }: { view: Exclude<SupportView, "main"> }) {
  useEffect(() => {
    const window = getCurrentWindow();
    void window.show().then(() => window.setFocus());
  }, []);

  const manual = getHelpManual();
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
