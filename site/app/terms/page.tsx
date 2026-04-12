import type { Metadata } from "next";
import LegalDocument from "../components/LegalDocument";

export const metadata: Metadata = {
  title: "Terms of Service | adoptan.ai",
  description:
    "Terms of Service for adoptan.ai, the desktop and web workspace for signal monitoring and user-approved workflows."
};

const sections = [
  {
    title: "1. Acceptance of terms",
    paragraphs: [
      "By accessing the adoptan.ai website or using the adoptan.ai product, you agree to these Terms of Service.",
      "If you use adoptan.ai on behalf of a company or organization, you represent that you have the authority to bind that entity to these terms."
    ]
  },
  {
    title: "2. Service description",
    paragraphs: [
      "adoptan.ai provides a desktop and web workspace to monitor external signals, organize reviews and approvals, and support user-approved actions and publishing workflows.",
      "Specific features, limits, and integrations may change over time as the product evolves."
    ]
  },
  {
    title: "3. Accounts and access",
    paragraphs: [
      "You are responsible for maintaining the confidentiality of your account and for all activity that occurs through your credentials.",
      "You must provide accurate information and use the service in compliance with applicable law and platform policies."
    ]
  },
  {
    title: "4. User content and permissions",
    paragraphs: [
      "You retain responsibility for the sources, text, media, and workflow instructions you configure in adoptan.ai.",
      "If you connect a third-party service, you authorize adoptan.ai to use the permissions you grant only for the workflows you explicitly enable."
    ]
  },
  {
    title: "5. Acceptable use",
    paragraphs: [
      "You may not use adoptan.ai to violate the rights of others, break applicable law, interfere with the service, bypass rate limits, or misuse third-party platform permissions.",
      "You may not use adoptan.ai to publish or transmit content in a way that violates the terms of the connected platform."
    ]
  },
  {
    title: "6. Fees and subscriptions",
    paragraphs: [
      "Paid plans, if offered, are billed under the pricing and payment terms presented to you at the time of purchase.",
      "Unless otherwise stated, subscriptions renew automatically until cancelled."
    ]
  },
  {
    title: "7. Availability and changes",
    paragraphs: [
      "We may modify, suspend, or discontinue features at any time, including integrations that depend on third-party APIs or approvals.",
      "We aim to provide a reliable service, but we do not guarantee uninterrupted availability."
    ]
  },
  {
    title: "8. Disclaimer and limitation of liability",
    paragraphs: [
      "adoptan.ai is provided on an as-is and as-available basis to the maximum extent permitted by law.",
      "To the fullest extent permitted by law, adoptan.ai will not be liable for indirect, incidental, special, consequential, or punitive damages, or for loss of profits, data, or business opportunities."
    ]
  },
  {
    title: "9. Contact",
    paragraphs: [
      "For legal or commercial questions, contact us at contact@adoptan.ai.",
      "We may update these Terms of Service from time to time, and the latest version will always be published on this page."
    ]
  }
] as const;

export default function TermsPage() {
  return (
    <LegalDocument
      eyebrow="Terms"
      title="Terms of Service"
      lastUpdated="April 12, 2026"
      intro="These terms describe the conditions under which adoptan.ai can be accessed and used, including user-authorized integrations and publishing workflows."
      sections={[...sections]}
    />
  );
}
