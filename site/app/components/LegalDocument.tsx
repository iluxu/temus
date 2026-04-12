import Link from "next/link";

type LegalSection = {
  title: string;
  paragraphs: ReadonlyArray<string>;
  bullets?: ReadonlyArray<string>;
};

type LegalDocumentProps = {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  intro: string;
  sections: ReadonlyArray<LegalSection>;
};

export default function LegalDocument({
  eyebrow,
  title,
  lastUpdated,
  intro,
  sections
}: LegalDocumentProps) {
  return (
    <>
      <header className="legal-header">
        <Link className="legal-home" href="/">
          adoptan.ai
        </Link>
        <Link className="btn btn-outline" href="/">
          Back to home
        </Link>
      </header>

      <main className="legal-shell">
        <p className="legal-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="legal-meta">Last updated: {lastUpdated}</p>
        <p className="legal-intro">{intro}</p>

        {sections.map((section) => (
          <section className="legal-section" key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.bullets ? (
              <ul className="legal-list">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </main>
    </>
  );
}
