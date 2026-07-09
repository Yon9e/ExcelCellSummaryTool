import { FileSpreadsheet, Github, MessageSquare, ScrollText, UserRound } from "lucide-react";
import { getAboutContent } from "./aboutContent";

const aboutIconByTitle = {
  主作者: UserRound,
  开源仓库: Github,
  意见反馈: MessageSquare,
  更新记录: ScrollText,
};

export function AboutPage() {
  const about = getAboutContent();

  return (
    <div className="about-page">
      <section className="about-hero in-panel">
        <div className="about-app-mark">
          <FileSpreadsheet size={54} />
        </div>
        <h1>{about.title}</h1>
        <div className="version-pill">{about.version}</div>
        <p>{about.description}</p>
      </section>
      <section className="about-grid">
        {about.cards.map((card) => {
          const Icon = aboutIconByTitle[card.title as keyof typeof aboutIconByTitle] ?? ScrollText;
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
    </div>
  );
}
