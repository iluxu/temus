import { CopyButton } from "./components/CopyButton";

const valueProps = [
  {
    title: "Public mais payant",
    description:
      "Un RAG accessible a tous, monete par cle API, quotas et plans. Tarif clair, usage mesurable."
  },
  {
    title: "Sources autorisees",
    description:
      "On ingere uniquement des contenus dont les licences sont claires. Partner first, zero zone grise."
  },
  {
    title: "Citations verifiables",
    description:
      "Chaque reponse renvoie vers les sources originales avec passages cites pour garder la confiance."
  },
  {
    title: "Stack Cloudflare",
    description:
      "Front Next.js sur Pages, chunks sur R2, API RAG deployee en edge pour la latence."
  }
];

const steps = [
  {
    tag: "01",
    title: "Cadrer les sources",
    description:
      "On choisit les docs publiques autorisees et on fixe les regles de mise a jour."
  },
  {
    tag: "02",
    title: "Ingestion + chunks",
    description:
      "Pipeline de crawl ou import direct. Chunks heberges sur R2 ou stockage client."
  },
  {
    tag: "03",
    title: "Index + RAG",
    description:
      "Indexation, embeddings, puis API /ask et /status exposee publiquement."
  },
  {
    tag: "04",
    title: "Monetiser",
    description:
      "API keys, plans, usage tracking et facturation. Le produit devient vendable."
  }
];

const pricing = [
  {
    name: "Starter",
    price: "€199 / mois",
    detail: "Pour lancer le RAG public et tester le marche.",
    bullets: ["1 source", "50k tokens/jour", "Quotas + citations"]
  },
  {
    name: "Growth",
    price: "€990 / mois",
    detail: "Pour scaler un produit avec trafic regulier.",
    bullets: ["5 sources", "500k tokens/jour", "Stats + alerting"]
  },
  {
    name: "Enterprise",
    price: "Sur devis",
    detail: "Pour partenaires et catalogues larges.",
    bullets: ["Sources illimitees", "SLA", "Pipeline custom"]
  }
];

const apiCurl = `curl -sS https://temus.ai/api/ask \\
  -H "content-type: application/json" \\
  -H "authorization: Bearer $TEMUS_API_KEY" \\
  --data '{"prompt":"Comment faire une migration EUI21 ?","limit":6,"sessionId":"demo"}'`;

const apiResponse = `{
  "response": "Voici les etapes cle...",
  "sources": [
    {
      "title": "Migration eUI 19.x to 21.x",
      "url": "https://euidev.ecdevops.eu/.../eui-19-to-21"
    }
  ]
}`;

export default function Home() {
  return (
    <div className="canvas">
      <div className="backdrop">
        <span className="glow glow-violet" />
        <span className="glow glow-ice" />
        <span className="glow glow-ink" />
        <div className="grid" />
      </div>

      <main className="page">
        <header className="hero">
          <div className="badge">TEMUS · RAG public payant</div>
          <h1>Le RAG public qui se vend comme un produit.</h1>
          <p className="lead">
            TEMUS transforme des docs autorisees en un service RAG public, payant et
            cite. On livre la pile technique, la mise en marche commerciale et un
            front premium en dark.
          </p>
          <div className="hero-actions">
            <a className="btn primary" href="#pricing">
              Rejoindre la beta payante
            </a>
            <a className="btn ghost" href="#api">
              Voir l&apos;API
            </a>
          </div>
          <div className="hero-meta">
            <span>Cloudflare Pages + R2</span>
            <span>API publique /ask + /status</span>
            <span>Skills Codex pour ingestion + theming</span>
          </div>
        </header>

        <section id="business" className="section">
          <div className="section-title">
            <h2>Un modele public, mais rentable</h2>
            <p>
              On vend un acces documente, trace et conforme. Tu lances un RAG que
              les gens peuvent acheter sans friction.
            </p>
          </div>
          <div className="grid-4">
            {valueProps.map((item) => (
              <article className="card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="flow" className="section">
          <div className="section-title">
            <h2>Comment on le construit</h2>
            <p>Un pipeline court, des sources propres, une API vendable.</p>
          </div>
          <div className="grid-4">
            {steps.map((step) => (
              <article className="card step" key={step.title}>
                <div className="step-index">{step.tag}</div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="stack" className="section">
          <div className="section-title">
            <h2>Architecture TEMUS</h2>
            <p>Une pile simple a deployer, faite pour Cloudflare Pages.</p>
          </div>
          <div className="stack-row">
            <div className="chip">Sources autorisees</div>
            <div className="arrow">→</div>
            <div className="chip">Crawler / Import</div>
            <div className="arrow">→</div>
            <div className="chip">Chunks R2</div>
            <div className="arrow">→</div>
            <div className="chip">Index + Embeddings</div>
            <div className="arrow">→</div>
            <div className="chip">API RAG</div>
            <div className="arrow">→</div>
            <div className="chip">Next.js + Pages</div>
          </div>
        </section>

        <section id="pricing" className="section">
          <div className="section-title">
            <h2>Offres publiques</h2>
            <p>On facture a l&apos;usage, mais avec des plans lisibles.</p>
          </div>
          <div className="grid-3">
            {pricing.map((plan) => (
              <article className="card price" key={plan.name}>
                <div className="price-head">
                  <h3>{plan.name}</h3>
                  <span>{plan.price}</span>
                </div>
                <p>{plan.detail}</p>
                <ul>
                  {plan.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
                <a className="btn ghost" href="#cta">
                  Parler pricing
                </a>
              </article>
            ))}
          </div>
        </section>

        <section id="api" className="section">
          <div className="section-title">
            <h2>API publique, citations incluses</h2>
            <p>Le RAG repond, mais il doit citer ses preuves.</p>
          </div>
          <div className="terminal-grid">
            <div className="card code-block">
              <div className="code-head">
                <span>Requete /ask</span>
                <CopyButton text={apiCurl} />
              </div>
              <pre>
                <code>{apiCurl}</code>
              </pre>
            </div>
            <div className="card code-block">
              <div className="code-head">
                <span>Reponse + sources</span>
                <CopyButton text={apiResponse} />
              </div>
              <pre>
                <code>{apiResponse}</code>
              </pre>
            </div>
          </div>
        </section>

        <section id="cta" className="section cta">
          <div>
            <h2>On le met en ligne sur Pages ?</h2>
            <p>
              Tu choisis les sources, on livre le RAG public, la facturation et un
              front midnight. Ensuite on scale.
            </p>
          </div>
          <a className="btn primary" href="mailto:hello@temus.ai">
            Lancer la beta
          </a>
        </section>

        <footer className="footer">
          <div>
            <strong>TEMUS</strong>
            <p>RAG public payant + skills Codex.</p>
          </div>
          <div className="footer-links">
            <a href="#business">Business</a>
            <a href="#flow">Pipeline</a>
            <a href="#api">API</a>
          </div>
        </footer>
      </main>
    </div>
  );
}
