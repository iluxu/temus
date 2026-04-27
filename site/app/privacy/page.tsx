import type { Metadata } from "next";
import LegalDocument from "../components/LegalDocument";

export const metadata: Metadata = {
  title: "Privacy Policy | adoptan.ai",
  description:
    "Privacy Policy for adoptan.ai, including TikTok Login Kit, Content Posting API data handling, retention, deletion, GDPR, CCPA, and security practices."
};

const sections = [
  {
    title: "1. Who we are and scope",
    paragraphs: [
      "This Privacy Policy explains how adoptan.ai collects, uses, stores, shares, and protects personal data when you visit adoptan.ai, create an account, request a demo, use the creator workspace, or connect third-party integrations such as TikTok.",
      "adoptan.ai is a web and desktop creator operations workspace. The service helps creators and teams review short-form media, prepare captions and publishing settings, connect creator accounts, and complete user-approved publishing workflows. This policy applies to the website, dashboard, sandbox demo, support communications, and related product workflows.",
      "For the purposes of applicable privacy laws, the operator of adoptan.ai is the controller of account, billing, support, security, and workspace data processed to provide the service. When a customer uploads or imports content about other people, the customer is responsible for ensuring they have the rights and notices required to process that content."
    ]
  },
  {
    title: "2. Information you provide directly",
    paragraphs: [
      "We collect information you choose to provide when you create an account, request access, complete onboarding, contact support, configure a workspace, or use product features."
    ],
    bullets: [
      "Account details such as name, email address, organization name, role, password hash or authentication provider identifier, and workspace membership.",
      "Support and commercial information such as demo requests, messages, feedback, billing contact details, plan information, and communications with our team.",
      "Workspace configuration such as connected channels, publishing preferences, content approval states, captions, hashtags, media metadata, review notes, workflow settings, and audit history.",
      "Content you upload or select for processing, including video files, thumbnails, transcripts, subtitles, captions, generated drafts, and related metadata."
    ]
  },
  {
    title: "3. Information collected automatically",
    paragraphs: [
      "When you access the website or product, we may collect technical and usage information needed to operate, secure, debug, and improve the service.",
      "This information may be collected through server logs, cookies, local storage, analytics tools, security tools, and product telemetry. We use this data to understand reliability, detect abuse, investigate incidents, and improve the user experience."
    ],
    bullets: [
      "Device and browser information such as IP address, user agent, operating system, browser type, language, time zone, and approximate location derived from IP address.",
      "Usage information such as pages viewed, workspace actions, button clicks, feature usage, referrer URLs, session timestamps, and error events.",
      "Security and diagnostic information such as authentication attempts, API request logs, rate-limit events, webhook delivery state, publish job status, and system health logs.",
      "Cookie and local storage information used for authentication, preferences, analytics, security, and session continuity."
    ]
  },
  {
    title: "4. TikTok data we collect when you connect TikTok",
    paragraphs: [
      "TikTok connection is optional. If you choose to connect a TikTok account, TikTok may redirect you to adoptan.ai after you authorize the requested scopes. We only request TikTok scopes that are needed for the product features shown in the workspace and in the TikTok app review demo.",
      "Depending on the TikTok products and scopes enabled for your account and approved for our app, we may receive and process the following TikTok-related data."
    ],
    bullets: [
      "OAuth authorization data, including access tokens, refresh tokens, token expiration times, scopes granted, open_id, and union_id when returned by TikTok.",
      "Basic profile information, including open_id, creator username, nickname or display name, avatar URL, and other fields returned by TikTok for `user.info.basic`.",
      "Additional profile information returned by TikTok for `user.info.profile`, such as bio description, profile web link, profile deep link, and verification status when available.",
      "TikTok statistical data returned for `user.info.stats`, such as follower count, following count, likes count, and video count when available.",
      "Public video list information returned for `video.list`, such as video identifiers, titles or descriptions, cover images, public URLs, timestamps, and public engagement metadata when available.",
      "Creator publishing information returned by the Content Posting API creator_info endpoint, including creator nickname, creator avatar, privacy level options, maximum video duration, comment availability, duet availability, stitch availability, and whether the creator can currently post.",
      "Publishing workflow data, including selected video metadata, caption/title, chosen privacy setting, comment/duet/stitch settings, commercial content choices when applicable, draft upload state, direct post state, publish_id, upload status, processing status, completion or failure state, and timestamps.",
      "Post references returned by TikTok or stored by the workspace, such as a TikTok post URL, post identifier, status polling results, or webhook events when available."
    ]
  },
  {
    title: "5. How we use TikTok data",
    paragraphs: [
      "We use TikTok data only to provide the TikTok integration that the connected user chooses to use. We do not use TikTok data to post content without user action, to build unrelated advertising profiles, or to sell TikTok user data.",
      "In practical terms, we use TikTok data to authenticate the connected account, display the connected creator identity, profile details, account statistics, and recent public videos in the workspace, retrieve current publishing options from TikTok, show the user which account will receive the content, prepare a selected video for draft upload or direct post, submit the content only after explicit user confirmation, and show upload or publish status back in the workspace.",
      "If AI-assisted captioning, transcription, or repackaging is enabled for a workspace, we may process user-selected media, transcripts, and draft captions to generate editable suggestions. These suggestions remain subject to user review and approval before any TikTok publishing action is started."
    ],
    bullets: [
      "To connect and maintain the user's TikTok session.",
      "To display TikTok account context, including the connected creator nickname and avatar.",
      "To display profile, statistics, and recent public video context so the creator can verify the account and avoid duplicate publishing.",
      "To retrieve current privacy and interaction settings from TikTok before rendering the publish page.",
      "To upload a user-selected video as a TikTok draft or publish it directly only after an explicit confirmation step.",
      "To poll or receive status updates so the user can understand whether a TikTok publish job is pending, complete, or failed.",
      "To disconnect the TikTok account and stop related workflows when the user requests it."
    ]
  },
  {
    title: "6. Legal bases for processing",
    paragraphs: [
      "If you are located in the European Economic Area, the United Kingdom, Switzerland, or another jurisdiction with similar rules, we rely on different legal bases depending on the processing activity.",
      "We process account, workspace, and integration data to perform our contract with you and provide the service you requested. We process security logs and product diagnostics based on our legitimate interests in keeping the service reliable and safe. We process certain cookies, marketing communications, and optional integrations based on your consent where required by law. We may also process data to comply with legal obligations."
    ]
  },
  {
    title: "7. User control and explicit publishing consent",
    paragraphs: [
      "adoptan.ai is designed as a reviewable creator workflow, not a blind automated posting tool. The workspace displays the connected TikTok account, the selected content, editable caption fields, privacy options, interaction controls, and publish status before and after a posting action.",
      "For Content Posting API workflows, we retrieve the latest creator_info from TikTok before rendering publishing controls. The user must confirm the selected video, caption, privacy setting, and interaction settings before we start sending content materials to TikTok. If TikTok reports that the creator cannot post or that a setting is unavailable, the workspace should block or adjust the workflow accordingly."
    ]
  },
  {
    title: "8. How we share information",
    paragraphs: [
      "We do not sell personal data. We do not share TikTok user data with third parties for advertising, independent profiling, or independent use. We share information only when needed to provide the service, comply with law, protect rights and safety, or complete a business transaction subject to appropriate safeguards.",
      "When you connect TikTok, data is exchanged with TikTok according to the permissions you grant and TikTok's own terms and privacy policies. When you ask us to process media or generate captions, selected content may be processed by infrastructure and AI providers acting as subprocessors under our instructions."
    ],
    bullets: [
      "Hosting, storage, CDN, and infrastructure providers used to run the website, dashboard, databases, media storage, and job workers.",
      "Authentication, email, customer support, analytics, logging, monitoring, and security providers used to operate and protect the service.",
      "AI, transcription, captioning, or media processing providers, but only for features enabled by the user or workspace and only for the data needed to produce the requested output.",
      "Payment processors if paid plans are offered and you choose to subscribe.",
      "Professional advisors, authorities, or counterparties where required by law, to enforce agreements, investigate abuse, or complete a merger, acquisition, financing, or sale of assets."
    ]
  },
  {
    title: "9. Subprocessors and international transfers",
    paragraphs: [
      "We may use service providers located in the European Union, the United States, and other countries. These countries may have data protection laws that differ from the laws where you live.",
      "Where required, we use appropriate transfer safeguards such as Standard Contractual Clauses, data processing agreements, security commitments, and vendor due diligence. A current subprocessor list can be requested by contacting privacy [at] adoptan.ai. Replace [at] with @ when emailing us."
    ]
  },
  {
    title: "10. Data retention",
    paragraphs: [
      "We keep personal data only for as long as reasonably necessary for the purposes described in this Privacy Policy, unless a longer retention period is required by law, needed to resolve disputes, or needed to enforce agreements.",
      "Account records are retained while your account is active. Workspace data, media processing records, captions, transcripts, audit logs, and publish events are retained according to your plan settings, operational needs, and legal requirements. Security logs are typically retained for a limited period unless needed for investigation.",
      "TikTok access and refresh tokens are stored only while your TikTok account remains connected or while necessary to complete a user-requested workflow. When you disconnect TikTok or request deletion, we delete or revoke tokens where technically available, stop future TikTok workflows, and remove related connection records from active systems within a reasonable period. Backup copies may persist for a limited backup retention window before being overwritten."
    ]
  },
  {
    title: "11. How to disconnect TikTok and delete TikTok data",
    paragraphs: [
      "You can disconnect TikTok from the adoptan.ai workspace when the disconnect control is available. Disconnecting removes the active connection from adoptan.ai and prevents new TikTok workflows from using that account.",
      "You may also revoke adoptan.ai's access from your TikTok account settings at tiktok.com/settings or any equivalent TikTok authorization management page made available by TikTok. Revoking access on TikTok may immediately stop our ability to refresh tokens or complete pending TikTok actions.",
      "To request deletion of TikTok connection records or related personal data, contact privacy [at] adoptan.ai. Replace [at] with @ when emailing us. We may need to retain limited records where required for security, legal compliance, dispute resolution, or audit purposes."
    ]
  },
  {
    title: "12. Security",
    paragraphs: [
      "We use technical and organizational safeguards designed to protect personal data. These measures include TLS encryption in transit, access controls, limited internal access, logging, backups, infrastructure monitoring, and secure handling of credentials and OAuth tokens.",
      "TikTok tokens and other sensitive integration credentials are treated as confidential authorization artifacts. We restrict access to personnel and systems that need them to provide the service. No method of transmission or storage is perfectly secure, so we cannot guarantee absolute security, but we work to keep risk proportionate to the nature of the data."
    ]
  },
  {
    title: "13. Breach notification",
    paragraphs: [
      "If we become aware of a security incident that affects personal data, we will investigate, take appropriate steps to contain and remediate the issue, and notify affected users or regulators where required by applicable law.",
      "For GDPR-covered incidents that create a legally reportable personal data breach, we aim to notify the competent supervisory authority within 72 hours after becoming aware of the breach, unless the breach is unlikely to result in a risk to individuals' rights and freedoms."
    ]
  },
  {
    title: "14. Your privacy rights",
    paragraphs: [
      "Depending on where you live, you may have rights to access, correct, delete, export, restrict, or object to the processing of your personal data. You may also have the right to withdraw consent where processing is based on consent.",
      "To exercise these rights, contact privacy [at] adoptan.ai. Replace [at] with @ when emailing us. We may need to verify your identity before responding. We will respond within the time required by applicable law."
    ]
  },
  {
    title: "15. GDPR, UK GDPR, and Belgian users",
    paragraphs: [
      "If GDPR or UK GDPR applies to you, you may have the right to lodge a complaint with your local data protection authority. If you are in Belgium, you may contact the Belgian Data Protection Authority, also known as the Autorite de protection des donnees or Gegevensbeschermingsautoriteit. We encourage you to contact us first so we can try to resolve the issue directly.",
      "Where we process personal data on behalf of a customer as a processor, our processing is governed by the applicable customer agreement and data processing terms. Customers are responsible for their own lawful basis, notices, and instructions for personal data they upload or import into the workspace."
    ]
  },
  {
    title: "16. CCPA and CPRA notice",
    paragraphs: [
      "If you are a California resident, you may have rights under the California Consumer Privacy Act as amended by the California Privacy Rights Act. These rights may include the right to know, access, correct, delete, and opt out of certain sharing of personal information.",
      "We do not sell personal information, and we do not share personal information for cross-context behavioral advertising as those terms are commonly used under California law. We also do not use TikTok user data for independent advertising purposes."
    ]
  },
  {
    title: "17. Children's privacy",
    paragraphs: [
      "adoptan.ai is not directed to children under 13. We do not knowingly collect personal data from children under 13. In jurisdictions where a higher age threshold applies, such as 16 for certain EEA contexts unless local law allows otherwise, users must meet the applicable age requirement or have valid parental authorization.",
      "If you believe a child has provided personal data to us, contact privacy [at] adoptan.ai so we can take appropriate steps."
    ]
  },
  {
    title: "18. Cookies and tracking choices",
    paragraphs: [
      "We may use cookies and similar technologies for authentication, session management, preferences, analytics, security, and product diagnostics. Some cookies are necessary for the service to work. Others may be optional depending on your region and our cookie controls.",
      "You can control cookies through your browser settings. Blocking certain cookies may affect login, workspace persistence, or security features."
    ]
  },
  {
    title: "19. Changes to this policy",
    paragraphs: [
      "We may update this Privacy Policy from time to time. When we make material changes, we will update the date on this page and, where appropriate, provide additional notice through the website, dashboard, or email.",
      "Continued use of adoptan.ai after a policy update means the updated policy applies to future processing, subject to any additional consent required by law."
    ]
  },
  {
    title: "20. Contact",
    paragraphs: [
      "For privacy requests, data deletion requests, TikTok data questions, or security concerns, contact privacy [at] adoptan.ai. Replace [at] with @ when emailing us.",
      "For general legal notices, contact legal [at] adoptan.ai. This Privacy Policy is provided for transparency and operational compliance. It is not legal advice, and adoptan.ai may update it after review by legal counsel."
    ]
  }
] as const;

export default function PrivacyPage() {
  return (
    <LegalDocument
      eyebrow="Privacy"
      title="Privacy Policy"
      lastUpdated="April 27, 2026"
      intro="This policy explains what adoptan.ai processes, including TikTok Login Kit and Content Posting API data, how the data is used, how long it is kept, and how users can disconnect or request deletion."
      sections={[...sections]}
    />
  );
}
