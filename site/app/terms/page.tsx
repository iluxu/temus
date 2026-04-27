import type { Metadata } from "next";
import LegalDocument from "../components/LegalDocument";

export const metadata: Metadata = {
  title: "Terms of Service | adoptan.ai",
  description:
    "Terms of Service for adoptan.ai, including creator workflows, TikTok integrations, user content, acceptable use, fees, termination, disclaimers, and Belgian governing law."
};

const sections = [
  {
    title: "1. Acceptance of these Terms",
    paragraphs: [
      "These Terms of Service govern your access to and use of adoptan.ai, including the website, dashboard, creator workspace, integrations, sandbox demo, support services, and related features. By accessing or using adoptan.ai, you agree to these Terms.",
      "If you use adoptan.ai on behalf of a company, agency, creator team, or other organization, you represent that you have authority to bind that organization to these Terms. If you do not agree to these Terms, you must not use the service."
    ]
  },
  {
    title: "2. Eligibility and account responsibilities",
    paragraphs: [
      "You must be at least 18 years old to use adoptan.ai, or the age of legal majority in your jurisdiction if higher. You must provide accurate account information and keep your login credentials secure.",
      "You are responsible for all activity that occurs under your account, workspace, connected integrations, and API credentials. You must notify us promptly if you suspect unauthorized access or misuse of your account."
    ]
  },
  {
    title: "3. Description of the service",
    paragraphs: [
      "adoptan.ai is a creator operations workspace that helps creators and teams review short-form media, organize clips, prepare captions, configure publishing settings, connect third-party accounts, and complete user-approved publishing workflows.",
      "The service may include media processing, transcription, subtitle generation, AI-assisted caption suggestions, approval queues, audit logs, third-party OAuth connections, publishing status tracking, and workspace collaboration features. Specific features may vary by plan, customer, region, and third-party platform approval status."
    ]
  },
  {
    title: "4. TikTok-specific terms",
    paragraphs: [
      "If you connect a TikTok account to adoptan.ai, you authorize adoptan.ai to use the TikTok scopes and permissions you approve only for the workflows shown in the workspace. You also agree to TikTok's own terms, including TikTok's Terms of Service at https://www.tiktok.com/legal/page/row/terms-of-service/en and TikTok for Developers Terms at https://developers.tiktok.com/terms/.",
      "You must also comply with TikTok's Community Guidelines at https://www.tiktok.com/community-guidelines.",
      "You retain ownership of content you publish or prepare through adoptan.ai, subject to the rights you grant to TikTok and other third-party platforms under their own terms. You are solely responsible for ensuring that you have all rights, licenses, permissions, releases, and consents needed for the content, audio, likenesses, trademarks, captions, hashtags, and claims you submit.",
      "adoptan.ai does not guarantee that TikTok will accept, process, save as draft, publish, distribute, recommend, monetize, or keep any content available. TikTok may impose review, rate limits, privacy restrictions, account restrictions, visibility limits, processing delays, or other platform rules. We may block or disable a TikTok workflow if required by TikTok, by law, or by our platform safety standards."
    ]
  },
  {
    title: "5. User-approved publishing only",
    paragraphs: [
      "adoptan.ai is designed to support visible, reviewable creator workflows. The workspace should show the connected account, profile context, account statistics, recent public video context, selected media, editable caption, privacy setting, interaction settings, and status feedback before and after a TikTok upload or publishing action.",
      "For Content Posting API workflows, the user must expressly confirm the selected content and settings before adoptan.ai starts sending content materials to TikTok as a draft upload or direct post. You must not use adoptan.ai to mislead a user about which account is connected, what content will be uploaded, what caption will be used, or what privacy setting has been selected."
    ]
  },
  {
    title: "6. User content and license to operate the service",
    paragraphs: [
      "You retain ownership of the videos, images, audio, transcripts, captions, notes, workflows, and other materials you submit to adoptan.ai, subject to rights owned by others and to the platform terms that apply when you publish content elsewhere.",
      "You grant adoptan.ai a limited, worldwide, non-exclusive, royalty-free license to host, copy, process, transcode, analyze, display, transmit, and otherwise use your content only as needed to provide, secure, support, and improve the service, including generating previews, captions, subtitles, publish packages, logs, and backups."
    ]
  },
  {
    title: "7. AI-assisted outputs",
    paragraphs: [
      "Some features may use AI or automated processing to generate transcripts, subtitles, hooks, captions, descriptions, scoring, summaries, or recommendations. These outputs may be inaccurate, incomplete, offensive, unsuitable for a brand, or inconsistent with platform policies.",
      "You are responsible for reviewing and approving all AI-assisted outputs before publishing or relying on them. adoptan.ai does not guarantee performance on any social platform, including reach, views, follower growth, recommendations, monetization, or compliance with platform rules."
    ]
  },
  {
    title: "8. Acceptable use",
    paragraphs: [
      "You must use adoptan.ai lawfully and responsibly. You may not use the service to create, process, publish, or distribute content or workflows that violate applicable law, infringe rights, exploit minors, harass people, promote violence, deceive users, manipulate platform systems, or violate third-party platform policies."
    ],
    bullets: [
      "Do not upload or publish content unless you have the required rights and permissions.",
      "Do not use adoptan.ai for spam, fake engagement, platform manipulation, credential harvesting, malware, scraping that violates terms, or unauthorized automation.",
      "Do not bypass rate limits, security controls, account restrictions, review steps, or platform consent requirements.",
      "Do not use adoptan.ai to impersonate another person, misrepresent affiliation, or hide material commercial relationships.",
      "Do not submit sensitive personal data, health data, payment card data, government identifiers, or children's data unless a signed agreement expressly permits it and you have a lawful basis."
    ]
  },
  {
    title: "9. Third-party services and integrations",
    paragraphs: [
      "adoptan.ai may integrate with third-party services such as TikTok, Twitch, cloud storage, AI providers, analytics tools, payment processors, or communication tools. Your use of those services is governed by their own terms and privacy policies.",
      "Third-party integrations may change, break, be rate-limited, be suspended, or require additional approval. We are not responsible for third-party services, but we may modify adoptan.ai to maintain compatibility, security, or compliance."
    ]
  },
  {
    title: "10. Fees, trials, and billing",
    paragraphs: [
      "The service is currently provided free of charge. We will provide reasonable advance notice before introducing fees or paid plans.",
      "adoptan.ai may currently offer free, beta, pilot, or custom access. We may introduce or change paid plans with notice. If you purchase a paid plan, you agree to the pricing, billing cycle, payment method, taxes, renewal, cancellation, and refund terms presented at checkout or in the applicable order form.",
      "Unless otherwise stated in a signed agreement, fees are non-refundable except where required by law. We may suspend access for unpaid fees, payment disputes, abuse, or legal risk."
    ]
  },
  {
    title: "11. Intellectual property",
    paragraphs: [
      "adoptan.ai and its licensors own the service, software, design, workflows, documentation, trademarks, logos, and underlying technology. These Terms do not transfer any ownership rights in adoptan.ai to you.",
      "You may not copy, modify, reverse engineer, resell, sublicense, or create derivative works from the service except as allowed by law or expressly permitted in writing. Feedback you provide may be used by adoptan.ai without restriction or compensation."
    ]
  },
  {
    title: "12. Confidentiality and security",
    paragraphs: [
      "You must keep non-public product, technical, pricing, security, and business information about adoptan.ai confidential unless we authorize disclosure. We will handle your non-public workspace information according to our Privacy Policy and any applicable signed agreement.",
      "You are responsible for securing your accounts, connected platform permissions, devices, and team access. You must not share OAuth tokens, API credentials, passwords, or other sensitive access credentials with unauthorized parties."
    ]
  },
  {
    title: "13. Suspension and termination",
    paragraphs: [
      "You may stop using adoptan.ai at any time and may request account deletion subject to legal, security, billing, and backup retention limits. You may disconnect third-party integrations, including TikTok, from the workspace or from the third-party platform settings.",
      "We may suspend or terminate access if you breach these Terms, create security or legal risk, infringe rights, misuse platform permissions, fail to pay fees, or use the service in a way that could harm adoptan.ai, users, third-party platforms, or the public. After termination, your right to use the service ends, but provisions that by their nature should survive will continue to apply."
    ]
  },
  {
    title: "14. Disclaimers",
    paragraphs: [
      "To the maximum extent permitted by law, adoptan.ai is provided on an as-is and as-available basis. We disclaim all warranties, whether express, implied, statutory, or otherwise, including warranties of merchantability, fitness for a particular purpose, title, non-infringement, availability, accuracy, and uninterrupted operation.",
      "We do not guarantee that the service will be error-free, secure, available at all times, compatible with every third-party API, or successful in producing any specific business, social media, or audience outcome."
    ]
  },
  {
    title: "15. Limitation of liability",
    paragraphs: [
      "To the maximum extent permitted by law, adoptan.ai and its owners, employees, contractors, affiliates, and suppliers will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for loss of profits, revenue, goodwill, content, data, opportunities, or platform access.",
      "To the maximum extent permitted by law, our total liability for all claims related to the service will not exceed the greater of the amount you paid to adoptan.ai for the service in the three months before the event giving rise to the claim or one hundred euros. Some jurisdictions do not allow certain limitations, so some limitations may not apply to you."
    ]
  },
  {
    title: "16. Indemnification",
    paragraphs: [
      "You agree to defend, indemnify, and hold harmless adoptan.ai and its owners, employees, contractors, affiliates, and suppliers from claims, damages, losses, liabilities, costs, and expenses arising from your content, your use of the service, your connected integrations, your breach of these Terms, your violation of law, your violation of third-party platform terms, or your infringement of another party's rights."
    ]
  },
  {
    title: "17. Changes to the service or Terms",
    paragraphs: [
      "We may update the service and these Terms from time to time. If changes are material, we will provide reasonable notice through the website, dashboard, email, or another appropriate method. The updated Terms will indicate the latest update date.",
      "If you continue using adoptan.ai after changes take effect, you accept the updated Terms. If you do not agree, you must stop using the service and may request deletion or export of your data where available and required by law."
    ]
  },
  {
    title: "18. Governing law and disputes",
    paragraphs: [
      "These Terms are governed by the laws of Belgium, without regard to conflict of law rules. Subject to any mandatory consumer protection rules that may apply, disputes relating to these Terms or the service will be submitted to the competent courts of Brussels, Belgium.",
      "Before filing a claim, both parties agree to try to resolve the dispute informally by contacting the other party and allowing a reasonable time for response, unless urgent injunctive relief is needed."
    ]
  },
  {
    title: "19. Contact",
    paragraphs: [
      "For legal notices or questions about these Terms, contact legal@adoptan.ai. For privacy requests, contact privacy@adoptan.ai.",
      "These Terms are intended to provide clear operational rules for the service, including TikTok-connected creator workflows. They are not legal advice and may be updated after review by legal counsel."
    ]
  }
] as const;

export default function TermsPage() {
  return (
    <LegalDocument
      eyebrow="Terms"
      title="Terms of Service"
      lastUpdated="April 27, 2026"
      intro="These Terms govern access to adoptan.ai, including creator workspaces, TikTok-connected publishing workflows, user content, AI-assisted processing, and platform compliance obligations."
      sections={[...sections]}
    />
  );
}
