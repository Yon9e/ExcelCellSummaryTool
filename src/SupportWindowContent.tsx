import { FileSpreadsheet, Github, MessageSquare, ScrollText, UserRound } from "lucide-react";
import { getAboutContent } from "./aboutContent";
import { getHelpManual } from "./helpManual";
import type { SupportView } from "./supportWindows";

const aboutIconByTitle = {
  主作者: UserRound,
  开源仓库: Github,
  意见反馈: MessageSquare,
  更新记录: ScrollText,
};

export function SupportWindowContent({ view }: { view: Exclude<SupportView, "main"> }) {
  if (view === "about") {
    const about = getAboutContent();
    return (
      <main className="support-window-shell">
        <section className="about-hero">
          <div className="about-app-mark">
            <FileSpreadsheet size={54} />
          </div>
          <h1>{about.title}</h1>
          <div className="version-pill">{about.version}</div>
          <p>{about.description}</p>
        </section>
        <section className="about-grid">
          {about.cards.map((card) => {
            const Icon = aboutIconByTitle[card.title as keyof typeof aboutIconByTitle] ?? InfoIcon;
            return (
              <article className="about-card" key={card.title}>
                <Icon size={30} />
                <h2>{card.title}</h2>
                <p>{card.description}</p>
                {card.detail && <span>{card.detail}</span>}
              </article>
            );
          })}
        </section>
      </main>
    );
  }

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

function InfoIcon(props: { size?: number }) {
  return <ScrollText {...props} />;
}
