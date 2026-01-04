import { CopyButton } from "./components/CopyButton";

const valueProps = [
  {
    title: "One-line installs",
    description:
      "Install skills with codex-skill install <name>, restart Codex, and you are live."
  },
  {
    title: "Registry + MCP ready",
    description:
      "Ship a static index.json + .skill artifacts, or add an MCP server for live discovery."
  },
  {
    title: "Cross-platform",
    description:
      "Works the same on macOS, Linux, and Windows thanks to npm-based installs."
  },
  {
    title: "Open standard",
    description:
      "Skills follow the open agent skills specification, so they stay portable."
  }
];

const steps = [
  {
    tag: "01",
    title: "Write a SKILL.md",
    description:
      "Define when the skill should trigger, the workflow, and any scripts or references."
  },
  {
    tag: "02",
    title: "Package it",
    description:
      "Bundle the skill folder into a .skill artifact with validation."
  },
  {
    tag: "03",
    title: "Publish",
    description:
      "Update the registry index and host the artifact for public installs."
  },
  {
    tag: "04",
    title: "Install + run",
    description:
      "codex-skill install <name> and restart Codex to activate it."
  }
];

const skills = [
  {
    name: "codex-theme",
    label: "Design & UI",
    detail:
      "Generate, apply, and export themes for Next.js + Tailwind + shadcn/ui workflows.",
    bullets: ["Curated themes + variants", "Tailwind tokens + presets", "Diffs + checklists"]
  },
  {
    name: "rag-docs-api",
    label: "Docs & RAG",
    detail:
      "Query or ingest docs for RunMesh-compatible RAG APIs with citations and sources.",
    bullets: ["/api/status + /api/ask", "Playwright ingest workflows", "Citation-first answers"]
  },
  {
    name: "polymarket-sentinel",
    label: "Market Intel",
    detail:
      "Read-only analyst skill for monitoring Polymarket orderbooks and alerts.",
    bullets: ["Orderbook snapshots", "Alerting + reports", "Market watchlists"]
  }
];

const installCmd = `npm install -g codex-skill
codex-skill list
codex-skill install rag-docs-api
# Restart Codex to load new skills`;

const listOutput = `codex-theme (0.1.1-alpha.0) — Theme installation + Tailwind tokens
rag-docs-api (0.1.2-alpha.0) — Query or ingest docs for RunMesh RAG APIs
polymarket-sentinel (0.1.0-alpha.0) — Read-only Polymarket analyst`;

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
          <div className="badge">codex-skill · skills registry</div>
          <h1>Ship installable Codex skills in one command.</h1>
          <p className="lead">
            codex-skill is a lightweight CLI and registry workflow that lets you
            package, publish, and install Codex skills for teams or the public.
          </p>
          <div className="hero-actions">
            <a className="btn primary" href="#install">
              Install the CLI
            </a>
            <a className="btn ghost" href="#skills">
              Browse skills
            </a>
          </div>
          <div className="hero-meta">
            <span>npm install -g codex-skill</span>
            <span>Static registry + .skill artifacts</span>
            <span>Optional MCP server for discovery</span>
          </div>
        </header>

        <section id="why" className="section">
          <div className="section-title">
            <h2>Why codex-skill exists</h2>
            <p>
              Turn internal playbooks into shareable skills that install the same
              way everywhere. No bespoke onboarding or manual copy-paste.
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
            <h2>How it works</h2>
            <p>A tight loop from instructions to installs, built for speed.</p>
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
            <h2>Registry flow</h2>
            <p>Everything you need to distribute skills to the public.</p>
          </div>
          <div className="stack-row">
            <div className="chip">SKILL.md + scripts</div>
            <div className="arrow">→</div>
            <div className="chip">Package .skill</div>
            <div className="arrow">→</div>
            <div className="chip">Registry index.json</div>
            <div className="arrow">→</div>
            <div className="chip">Artifact hosting</div>
            <div className="arrow">→</div>
            <div className="chip">MCP server (optional)</div>
            <div className="arrow">→</div>
            <div className="chip">codex-skill install</div>
          </div>
        </section>

        <section id="skills" className="section">
          <div className="section-title">
            <h2>Featured skills</h2>
            <p>Public skills you can install today from the registry.</p>
          </div>
          <div className="grid-3">
            {skills.map((skill) => (
              <article className="card price" key={skill.name}>
                <div className="price-head">
                  <h3>{skill.name}</h3>
                  <span>{skill.label}</span>
                </div>
                <p>{skill.detail}</p>
                <ul>
                  {skill.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
                <a className="btn ghost" href="#install">
                  Install this skill
                </a>
              </article>
            ))}
          </div>
        </section>

        <section id="install" className="section">
          <div className="section-title">
            <h2>Install &amp; try</h2>
            <p>Install the CLI, list the registry, and pull a skill in seconds.</p>
          </div>
          <div className="terminal-grid">
            <div className="card code-block">
              <div className="code-head">
                <span>Install + list</span>
                <CopyButton text={installCmd} />
              </div>
              <pre>
                <code>{installCmd}</code>
              </pre>
            </div>
            <div className="card code-block">
              <div className="code-head">
                <span>What you see</span>
                <CopyButton text={listOutput} />
              </div>
              <pre>
                <code>{listOutput}</code>
              </pre>
            </div>
          </div>
        </section>

        <section id="cta" className="section cta">
          <div>
            <h2>Ready to publish your own skill?</h2>
            <p>
              Package a skill, add it to the registry, and share it in one link.
            </p>
          </div>
          <a className="btn primary" href="mailto:hello@temus.ai">
            Submit a skill
          </a>
        </section>

        <footer className="footer">
          <div>
            <strong>codex-skill</strong>
            <p>Registry-first installs for Codex skills.</p>
          </div>
          <div className="footer-links">
            <a href="#why">Why</a>
            <a href="#skills">Skills</a>
            <a href="#install">Install</a>
          </div>
        </footer>
      </main>
    </div>
  );
}
