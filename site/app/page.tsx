"use client";

import { useState } from "react";
import { translations, Lang } from "./translations";

export default function Home() {
  const [lang, setLang] = useState<Lang>("en");
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

        {/* Features */}
        <section id="features" className="section">
          <div className="section-header">
            <h2>{t.featuresTitle}</h2>
            <p>{t.featuresLead}</p>
          </div>
          <div className="grid-4">
            {t.features.map((feature) => (
              <div className="card" key={feature.title}>
                <div className="card-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
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

        {/* Value prop */}
        <section className="section value-section" style={{ margin: "0 -24px", padding: "100px 24px" }}>
          <div className="value-grid" style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div className="value-content">
              <h2>{t.valueTitle}</h2>
              <p>{t.valueLead}</p>
              <ul className="value-list">
                {t.valuePoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
            <div className="value-visual">
              <div style={{
                background: "linear-gradient(135deg, #f0f0ff 0%, #e8f8ff 100%)",
                borderRadius: "12px",
                padding: "24px",
                fontFamily: "monospace",
                fontSize: "0.85rem",
                lineHeight: "1.8"
              }}>
                <div style={{ color: "#666", marginBottom: "8px" }}>// Agent activity log</div>
                <div><span style={{ color: "#635bff" }}>→</span> claude-agent connected via SSO</div>
                <div><span style={{ color: "#635bff" }}>→</span> Query: "summarize Q4 report"</div>
                <div><span style={{ color: "#00d4ff" }}>✓</span> Response delivered (124ms)</div>
                <div><span style={{ color: "#635bff" }}>→</span> Data access: sales_data.csv</div>
                <div><span style={{ color: "#00d4ff" }}>✓</span> Audit log saved</div>
              </div>
            </div>
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
              <a href="#contact">{t.footerLinks[3]}</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
