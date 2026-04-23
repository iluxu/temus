import type { Metadata } from "next";
import LegalDocument from "../components/LegalDocument";

export const metadata: Metadata = {
  title: "Privacy Policy | adoptan.ai",
  description:
    "Privacy Policy for adoptan.ai, the desktop and web workspace for monitoring signals and user-approved publishing workflows."
};

const sections = [
  {
    title: "1. Scope",
    paragraphs: [
      "This Privacy Policy explains how adoptan.ai collects, uses, stores, and protects information when you visit our website, request a demo, or use the adoptan.ai product and related integrations.",
      "adoptan.ai is a desktop and web workspace designed to monitor external signals, organize workflows, and support user-approved actions, including optional third-party publishing integrations."
    ]
  },
  {
    title: "2. Information we collect",
    paragraphs: [
      "We may collect contact details such as your name, email address, company name, and any information you provide when you contact us or request a demo.",
      "When you use the product, we may collect workspace configuration data, monitored source references, operational logs, usage analytics, and integration metadata required to provide the service."
    ],
    bullets: [
      "Contact and account information",
      "Workspace, watchlist, and workflow configuration",
      "Operational logs and diagnostics",
      "Integration authorization metadata and tokens when you explicitly connect a third-party service"
    ]
  },
  {
    title: "3. How we use information",
    paragraphs: [
      "We use information to operate the service, secure the platform, respond to requests, improve the product, and support authorized workflows chosen by the user.",
      "We do not use third-party publishing integrations to post content without a user-triggered workflow and the authorization required by the relevant platform."
    ]
  },
  {
    title: "4. Third-party integrations",
    paragraphs: [
      "If you connect a third-party platform, adoptan.ai will process the minimum data and authorization artifacts needed to support the workflow you explicitly enable.",
      "Publishing or sync actions are limited by the permissions granted by the connected user and by the privacy or interaction settings returned by the third-party platform."
    ]
  },
  {
    title: "5. Sharing and subprocessors",
    paragraphs: [
      "We may use infrastructure, hosting, analytics, email, and support providers to operate the service. We do not sell personal information.",
      "We may disclose information when required by law, to protect our rights, or as part of a business transaction such as a merger or asset sale."
    ]
  },
  {
    title: "6. Retention and security",
    paragraphs: [
      "We retain information for as long as needed to provide the service, comply with legal obligations, resolve disputes, and enforce agreements.",
      "We apply reasonable technical and organizational safeguards, but no internet service can guarantee absolute security."
    ]
  },
  {
    title: "7. Your choices",
    paragraphs: [
      "You can contact us to request access, correction, or deletion of your information, subject to applicable law and legitimate operational needs.",
      "You can also disconnect third-party integrations at any time, which may stop the related workflows from functioning."
    ]
  },
  {
    title: "8. Contact",
    paragraphs: [
      "For privacy requests or questions, contact us at contact@adoptan.ai.",
      "If we materially change this Privacy Policy, we will update the date at the top of this page."
    ]
  }
] as const;

export default function PrivacyPage() {
  return (
    <LegalDocument
      eyebrow="Privacy"
      title="Privacy Policy"
      lastUpdated="April 23, 2026"
      intro="This page explains what data adoptan.ai processes, why we process it, and how we handle user-authorized integrations."
      sections={[...sections]}
    />
  );
}
