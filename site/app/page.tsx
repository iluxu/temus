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

const publishSteps = [
  {
    title: "Author the skill",
    description:
      "Create a SKILL.md with clear triggers. Add scripts/, references/, and assets/ when needed."
  },
  {
    title: "Package the artifact",
    description:
      "Bundle the folder into a .skill file and record the version in a manifest."
  },
  {
    title: "Publish to the registry",
    description:
      "Host the artifact and update index.json so codex-skill can install it."
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

const roadmap = [
  {
    phase: "Now",
    title: "Stable public registry",
    detail: "Npm installs, Windows support, and a curated starter set."
  },
  {
    phase: "Next",
    title: "Skill bundles",
    detail: "Batch installs, dependency metadata, and signed artifacts."
  },
  {
    phase: "Later",
    title: "Marketplace",
    detail: "Ratings, discoverability, and paid skill distribution."
  }
];

const faqs = [
  {
    question: "Where do installed skills live?",
    answer:
      "By default they install to ~/.codex/skills or $CODEX_HOME/skills. Repo-level .codex/skills overrides are supported."
  },
  {
    question: "Can I host a private registry?",
    answer:
      "Yes. Host index.json and .skill artifacts anywhere private, then pass --registry or set REGISTRY_URL."
  },
  {
    question: "Do I need an MCP server?",
    answer:
      "No. MCP is optional for live discovery. The static registry works on its own."
  },
  {
    question: "How do users activate a new skill?",
    answer:
      "Install it, then restart Codex so the skill metadata is loaded."
  }
];

const resources = [
  {
    name: "codex-skill CLI",
    url: "https://github.com/iluxu/codex-skill",
    description: "The npm CLI that lists and installs skills."
  },
  {
    name: "codex-skills-registry",
    url: "https://github.com/iluxu/codex-skills-registry",
    description: "Static registry index and published skill artifacts."
  },
  {
    name: "codex-skills-mcp",
    url: "https://github.com/iluxu/codex-skills-mcp",
    description: "Optional MCP server for live skill discovery."
  }
];

const installCmd = `npm install -g codex-skill
codex-skill list
codex-skill install rag-docs-api
# Restart Codex to load new skills`;

const listOutput = `codex-theme (0.1.1-alpha.0) — Theme installation + Tailwind tokens
rag-docs-api (0.1.2-alpha.0) — Query or ingest docs for RunMesh RAG APIs
polymarket-sentinel (0.1.0-alpha.0) — Read-only Polymarket analyst`;

const skillSkeleton = `---
name: my-skill
description: "Do X when Codex needs Y"
---

# Workflow

1) Inspect inputs
2) Run scripts if needed
3) Return outputs`;

const registryLayout = `codex-skills-registry/
  index.json
  skills/my-skill/manifest.json
  artifacts/my-skill/0.1.0.skill`;

const registryEntry = `{
  "name": "my-skill",
  "latest": "0.1.0",
  "manifest": "skills/my-skill/manifest.json",
  "artifact": { "url": "artifacts/my-skill/0.1.0.skill" }
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

        <section id="publish" className="section">
          <div className="section-title">
            <h2>Publish a skill</h2>
            <p>From idea to public install in a few simple steps.</p>
          </div>
          <div className="grid-3">
            {publishSteps.map((step) => (
              <article className="card" key={step.title}>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
          <div className="terminal-grid">
            <div className="card code-block">
              <div className="code-head">
                <span>SKILL.md template</span>
                <CopyButton text={skillSkeleton} />
              </div>
              <pre>
                <code>{skillSkeleton}</code>
              </pre>
            </div>
            <div className="card code-block">
              <div className="code-head">
                <span>Registry layout</span>
                <CopyButton text={registryLayout} />
              </div>
              <pre>
                <code>{registryLayout}</code>
              </pre>
            </div>
            <div className="card code-block">
              <div className="code-head">
                <span>Index entry</span>
                <CopyButton text={registryEntry} />
              </div>
              <pre>
                <code>{registryEntry}</code>
              </pre>
            </div>
          </div>
        </section>

        <section id="roadmap" className="section">
          <div className="section-title">
            <h2>Roadmap</h2>
            <p>Where codex-skill is heading next.</p>
          </div>
          <div className="grid-3">
            {roadmap.map((item) => (
              <article className="card" key={item.title}>
                <div className="step-index">{item.phase}</div>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="faq" className="section">
          <div className="section-title">
            <h2>FAQ</h2>
            <p>Quick answers for teams shipping skills at scale.</p>
          </div>
          <div className="faq-list">
            {faqs.map((item) => (
              <details className="faq-item" key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="resources" className="section">
          <div className="section-title">
            <h2>Resources</h2>
            <p>Start from the repos that power the registry.</p>
          </div>
          <div className="grid-3">
            {resources.map((item) => (
              <a
                className="card link-card"
                href={item.url}
                key={item.name}
                target="_blank"
                rel="noreferrer"
              >
                <div className="link-meta">
                  <span>Repository</span>
                  <span className="arrow">↗</span>
                </div>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
              </a>
            ))}
          </div>
        </section>

        <section id="cta" className="section cta">
          <div>
            <h2>Ready to publish your own skill?</h2>
            <p>
              Package a skill, add it to the registry, and share it in one link.
            </p>
          </div>
          <div className="cta-actions">
            <a className="btn primary" href="mailto:trotskiapp@gmail.com">
              Submit a skill
            </a>
            <a className="btn ghost" href="https://github.com/iluxu/codex-skill">
              View the CLI
            </a>
          </div>
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
            <a href="#publish">Publish</a>
          </div>
        </footer>
      </main>
    </div>
  );
}
