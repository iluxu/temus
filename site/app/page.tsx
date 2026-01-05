"use client";

import { useState } from "react";
import { translations, Lang } from "./translations";

export default function Home() {
  const [lang, setLang] = useState<Lang>("fr");
  const t = translations[lang];

  const toggleLang = () => setLang(lang === "en" ? "fr" : "en");

  return (
    <>
      {/* Nav */}
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo">ADOPTAN.AI</div>
          <div className="nav-links">
            <a href="#features">{t.navProduct}</a>
            <a href="#pricing">{t.navPricing}</a>
            <a href="#contact">{t.navContact}</a>
            <button className="lang-btn" onClick={toggleLang}>
              {t.langSwitch}
            </button>
            <a className="btn btn-primary" href="#contact" style={{ padding: "10px 20px" }}>
              {t.ctaPrimary}
            </a>
          </div>
        </div>
      </nav>

      <div className="page">
        {/* Hero */}
        <section className="hero">
          <div className="hero-badge">{t.badge}</div>
          <h1>
            {t.heroTitle} <span>{t.heroTitleHighlight}</span>
          </h1>
          <p className="hero-lead">{t.heroLead}</p>
          <div className="hero-cta">
            <a className="btn btn-primary" href="#contact">
              {t.ctaPrimary}
            </a>
            <a className="btn btn-outline" href="#features">
              {t.ctaSecondary}
            </a>
          </div>

          {/* Stats */}
          <div className="stats">
            {t.stats.map((stat) => (
              <div className="stat" key={stat.label}>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Problem */}
        <section id="features" className="section">
          <div className="section-header">
            <h2>{t.problemTitle}</h2>
            <p>{t.problemLead}</p>
          </div>
          <div className="grid-4">
            {t.problems.map((problem) => (
              <div className="card" key={problem.title}>
                <div className="card-icon">{problem.icon}</div>
                <h3>{problem.title}</h3>
                <p>{problem.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Solution */}
        <section className="section value-section" style={{ margin: "0 -24px", padding: "100px 24px" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div className="section-header">
              <h2>{t.solutionTitle}</h2>
              <p>{t.solutionLead}</p>
            </div>
            <div className="grid-4">
              {t.solutions.map((solution) => (
                <div className="card" key={solution.title}>
                  <div className="card-icon">{solution.icon}</div>
                  <h3>{solution.title}</h3>
                  <p>{solution.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="section">
          <div className="section-header">
            <h2>{t.howTitle}</h2>
            <p>{t.howLead}</p>
          </div>
          <div className="steps">
            {t.steps.map((step) => (
              <div className="step" key={step.number}>
                <div className="step-number">{step.number}</div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What we track */}
        <section className="section">
          <div className="section-header">
            <h2>{t.trackTitle}</h2>
            <p>{t.trackLead}</p>
          </div>
          <div className="grid-3">
            {t.trackItems.map((item) => (
              <div className="card" key={item.title}>
                <div className="card-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="section">
          <div className="section-header">
            <h2>{t.pricingTitle}</h2>
            <p>{t.pricingLead}</p>
          </div>
          <div className="pricing-grid">
            {t.plans.map((plan) => (
              <div className={`pricing-card ${plan.featured ? "featured" : ""}`} key={plan.name}>
                {plan.featured && <div className="pricing-badge">Popular</div>}
                <div className="pricing-name">{plan.name}</div>
                <div className="pricing-price">
                  {plan.price}
                  {plan.period && <span>{plan.period}</span>}
                </div>
                <p className="pricing-desc">{plan.description}</p>
                <ul className="pricing-features">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <a className={`btn ${plan.featured ? "btn-primary" : "btn-outline"}`} href="#contact">
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section id="contact" className="cta-section">
          <h2>{t.ctaTitle}</h2>
          <p>{t.ctaLead}</p>
          <a className="btn btn-primary" href="mailto:contact@adoptan.ai">
            {t.ctaButton}
          </a>
        </section>

        {/* Footer */}
        <footer className="footer">
          <div className="footer-inner">
            <div className="footer-logo">ADOPTAN.AI</div>
            <div className="footer-links">
              <a href="#features">{t.footerLinks[0]}</a>
              <a href="#pricing">{t.footerLinks[1]}</a>
              <a href="#contact">{t.footerLinks[2]}</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
