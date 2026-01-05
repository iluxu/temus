"use client";

import { useState } from "react";
import { translations, Lang } from "./translations";

export default function Home() {
  const [lang, setLang] = useState<Lang>("en");
  const t = translations[lang];

  const toggleLang = () => setLang(lang === "en" ? "fr" : "en");

  return (
    <div className="canvas">
      <div className="backdrop">
        <span className="glow glow-violet" />
        <span className="glow glow-ice" />
        <span className="glow glow-ink" />
        <div className="grid" />
      </div>

      <main className="page">
        {/* Language Toggle */}
        <button className="lang-toggle" onClick={toggleLang}>
          {t.langSwitch}
        </button>

        {/* Hero */}
        <header className="hero">
          <div className="badge">{t.badge}</div>
          <h1>{t.heroTitle}</h1>
          <p className="lead">{t.heroLead}</p>
          <div className="hero-actions">
            <a className="btn primary" href="#contact">
              {t.ctaPrimary}
            </a>
            <a className="btn ghost" href="#pricing">
              {t.ctaSecondary}
            </a>
          </div>
          <div className="hero-meta">
            {t.heroMeta.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </header>

        {/* Problem */}
        <section id="problem" className="section">
          <div className="section-title">
            <h2>{t.problemTitle}</h2>
            <p>{t.problemLead}</p>
          </div>
          <div className="grid-4">
            {t.problems.map((item) => (
              <article className="card problem-card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Solution */}
        <section id="solution" className="section">
          <div className="section-title">
            <h2>{t.solutionTitle}</h2>
            <p>{t.solutionLead}</p>
          </div>
          <div className="grid-4">
            {t.solutions.map((item) => (
              <article className="card solution-card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="section">
          <div className="section-title">
            <h2>{t.howTitle}</h2>
            <p>{t.howLead}</p>
          </div>
          <div className="grid-4">
            {t.steps.map((step) => (
              <article className="card step" key={step.title}>
                <div className="step-index">{step.tag}</div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="section">
          <div className="section-title">
            <h2>{t.pricingTitle}</h2>
            <p>{t.pricingLead}</p>
          </div>
          <div className="grid-3">
            {t.plans.map((plan) => (
              <article className={`card price ${plan.popular ? "popular" : ""}`} key={plan.name}>
                {plan.popular && <div className="popular-badge">Popular</div>}
                <div className="price-head">
                  <h3>{plan.name}</h3>
                  <span className="price-amount">{plan.price}</span>
                </div>
                <p>{plan.description}</p>
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <a className={`btn ${plan.popular ? "primary" : "ghost"}`} href="#contact">
                  {plan.cta}
                </a>
              </article>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section id="contact" className="section cta">
          <div>
            <h2>{t.ctaTitle}</h2>
            <p>{t.ctaLead}</p>
          </div>
          <div className="cta-actions">
            <a className="btn primary" href="mailto:contact@adoptan.ai">
              {t.ctaButton}
            </a>
            <a className="btn ghost" href="mailto:sales@adoptan.ai">
              {t.ctaSecondaryButton}
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer">
          <div>
            <strong>ADOPTAN.AI</strong>
            <p>{t.footerTagline}</p>
          </div>
          <div className="footer-links">
            <a href="#solution">{t.footerLinks[0]}</a>
            <a href="#pricing">{t.footerLinks[1]}</a>
            <a href="#how">{t.footerLinks[2]}</a>
            <a href="#contact">{t.footerLinks[3]}</a>
          </div>
        </footer>
      </main>
    </div>
  );
}
