import type { Metadata } from "next";
import { CopyButton } from "../components/CopyButton";

export const metadata: Metadata = {
  title: "adoptan.ai Web App Review",
  description:
    "Web app review page for adoptan.ai's TikTok integration, including Login Kit, Content Posting API, Share Kit, Data Portability API, Webhooks, and the selected scopes."
};

const reviewText =
  "adoptan.ai is a web workspace for reviewing short-form content and running user-approved TikTok publishing workflows. Login Kit is used so the creator signs in and connects the TikTok account. user.info.basic, user.info.profile, and user.info.stats show the connected creator identity inside the workspace. video.list helps the creator review recent TikTok posts and avoid duplicate publishing. For a selected clip, the creator edits the caption, reviews privacy and interaction settings, and explicitly chooses to publish. Content Posting API uses video.upload and video.publish only after that confirmation. Share Kit is offered as a manual share path for approved assets. Data Portability API is used for user-requested exports of connected TikTok data. Webhooks notify the workspace about publish and sync events.";

const flowSteps = [
  {
    step: "01",
    title: "Connect TikTok with Login Kit",
    description:
      "The creator signs in with TikTok, authorizes the workspace, and lands back in adoptan.ai with the connected account ready."
  },
  {
    step: "02",
    title: "Load creator context",
    description:
      "The app displays user.info.basic, user.info.profile, and user.info.stats so the creator can verify the right account before publishing."
  },
  {
    step: "03",
    title: "Review recent posts and select a clip",
    description:
      "video.list is used to show recent TikTok posts while the creator selects the next approved clip inside the workspace."
  },
  {
    step: "04",
    title: "Edit caption and choose settings",
    description:
      "The creator edits the caption, checks privacy options, and enables comments, duet, or stitch only if those settings are available."
  },
  {
    step: "05",
    title: "Publish, share, export, and sync",
    description:
      "Content Posting API handles upload and publish, Share Kit provides a manual share path, Data Portability API supports exports, and Webhooks report publish events back to the workspace."
  }
] as const;

const products = [
  {
    name: "Login Kit",
    body: "Used when the creator clicks Connect TikTok. The user signs in, authorizes the app, and returns to adoptan.ai with the chosen TikTok account attached to the workspace."
  },
  {
    name: "Content Posting API",
    body: "Used only after the creator has selected a clip, edited the caption, reviewed available privacy settings, and explicitly confirmed the publish action."
  },
  {
    name: "Share Kit",
    body: "Used as a manual share path for approved assets when the creator wants to share instead of directly publishing through the posting workflow."
  },
  {
    name: "Data Portability API",
    body: "Used for user-requested exports of connected TikTok data so the creator can keep a local or team copy of the information shown in the workspace."
  },
  {
    name: "Webhooks",
    body: "Used to notify adoptan.ai about publish and sync events, so the workspace timeline and approval log stay current without manual refresh."
  }
] as const;

const scopes = [
  {
    name: "user.info.basic",
    body: "Displays the connected TikTok user identifier needed to confirm the correct account."
  },
  {
    name: "user.info.profile",
    body: "Displays profile details such as nickname and bio context inside the review screen."
  },
  {
    name: "user.info.stats",
    body: "Displays follower and content stats so the creator can confirm the account context before posting."
  },
  {
    name: "video.list",
    body: "Shows recent TikTok videos to help the creator review what is already published."
  },
  {
    name: "video.publish",
    body: "Used for direct posting after the creator confirms the publish step."
  },
  {
    name: "video.upload",
    body: "Used during the upload workflow before the final publish action is confirmed."
  }
] as const;

const webhookEvents = [
  "publish.started",
  "publish.completed",
  "publish.failed",
  "account.synced"
] as const;

export default function WebReviewPage() {
  return (
    <>
      <header className="review-nav">
        <div className="review-nav-inner">
          <a className="nav-logo" href="/">
            adoptan.ai
          </a>
          <div className="review-nav-links">
            <a href="#flow">Flow</a>
            <a href="#products">Products</a>
            <a href="#scopes">Scopes</a>
            <a href="#copy">Review Copy</a>
          </div>
        </div>
      </header>

      <main className="review-page">
        <section className="review-hero">
          <div className="review-kicker">TikTok App Review Demo</div>
          <h1>Creator-controlled publishing from a real web workspace</h1>
          <p className="review-lead">
            This page shows the exact web surface that adoptan.ai presents for TikTok connection,
            profile review, content selection, publishing, exports, and event feedback.
          </p>
          <div className="review-badges">
            <span>Login Kit</span>
            <span>Content Posting API</span>
            <span>Share Kit</span>
            <span>Data Portability API</span>
            <span>Webhooks</span>
          </div>
        </section>

        <section id="flow" className="review-section">
          <div className="review-section-head">
            <h2>End-to-end flow shown in the web app</h2>
            <p>
              The review video should follow these same steps on <strong>https://adoptan.ai/web/</strong>.
            </p>
          </div>
          <div className="review-flow">
            {flowSteps.map((step) => (
              <article className="review-flow-card" key={step.step}>
                <div className="review-flow-step">{step.step}</div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="review-section">
          <div className="review-section-head">
            <h2>What the creator sees inside adoptan.ai</h2>
            <p>
              The interface below maps directly to the products and scopes selected in the TikTok
              review form.
            </p>
          </div>

          <div className="review-shell">
            <aside className="review-sidebar">
              <div className="review-sidebar-label">Workspace</div>
              <div className="review-sidebar-title">Creator Ops</div>
              <ul className="review-sidebar-list">
                <li className="active">TikTok publishing</li>
                <li>Clip approvals</li>
                <li>Publishing queue</li>
                <li>Exports</li>
                <li>Webhook timeline</li>
              </ul>
            </aside>

            <div className="review-main">
              <section className="review-panel">
                <div className="review-panel-head">
                  <div>
                    <p className="review-panel-kicker">Step 1</p>
                    <h3>Connect TikTok</h3>
                  </div>
                  <span className="review-pill success">Login Kit active</span>
                </div>
                <div className="review-cta-row">
                  <button className="btn btn-primary" type="button">
                    Connect TikTok
                  </button>
                  <span className="review-note">Redirects the creator through TikTok Login Kit and back to adoptan.ai/web.</span>
                </div>
              </section>

              <section className="review-grid">
                <article className="review-panel">
                  <div className="review-panel-head">
                    <div>
                      <p className="review-panel-kicker">Connected creator</p>
                      <h3>@adoptan_demo</h3>
                    </div>
                    <span className="review-pill">user.info.basic</span>
                  </div>
                  <ul className="review-metric-list">
                    <li>
                      <span>Display name</span>
                      <strong>Adoptan Demo</strong>
                    </li>
                    <li>
                      <span>Bio</span>
                      <strong>Short-form creator workflow sandbox</strong>
                    </li>
                    <li>
                      <span>Followers</span>
                      <strong>12.4K</strong>
                    </li>
                    <li>
                      <span>Videos</span>
                      <strong>184</strong>
                    </li>
                  </ul>
                  <div className="review-inline-tags">
                    <span>user.info.profile</span>
                    <span>user.info.stats</span>
                  </div>
                </article>

                <article className="review-panel">
                  <div className="review-panel-head">
                    <div>
                      <p className="review-panel-kicker">Recent TikTok posts</p>
                      <h3>Duplicate check before publish</h3>
                    </div>
                    <span className="review-pill">video.list</span>
                  </div>
                  <ul className="review-video-list">
                    <li>
                      <span>Spring campaign recap</span>
                      <strong>Published 2h ago</strong>
                    </li>
                    <li>
                      <span>Founder clip with captions</span>
                      <strong>Published yesterday</strong>
                    </li>
                    <li>
                      <span>Product teaser variation B</span>
                      <strong>Draft approved</strong>
                    </li>
                  </ul>
                </article>
              </section>

              <section className="review-grid review-grid-wide">
                <article className="review-panel">
                  <div className="review-panel-head">
                    <div>
                      <p className="review-panel-kicker">Selected clip</p>
                      <h3>Weekly highlights - approved clip</h3>
                    </div>
                    <span className="review-pill warning">Ready to publish</span>
                  </div>
                  <div className="review-preview">
                    <div className="review-preview-media">
                      <span>9:16 preview</span>
                    </div>
                    <div className="review-preview-body">
                      <p className="review-preview-title">Caption</p>
                      <div className="review-input">
                        Three product moments from this week. Full recap in bio. #adoptan #creatorworkflow
                      </div>
                      <p className="review-preview-title">Publish settings from creator_info</p>
                      <div className="review-setting-grid">
                        <div className="review-setting">
                          <span>Privacy</span>
                          <strong>PUBLIC_TO_EVERYONE</strong>
                        </div>
                        <div className="review-setting">
                          <span>Comments</span>
                          <strong>Allowed</strong>
                        </div>
                        <div className="review-setting">
                          <span>Duet</span>
                          <strong>Allowed</strong>
                        </div>
                        <div className="review-setting">
                          <span>Stitch</span>
                          <strong>Disabled</strong>
                        </div>
                      </div>
                      <div className="review-inline-tags">
                        <span>video.upload</span>
                        <span>video.publish</span>
                      </div>
                    </div>
                  </div>
                  <div className="review-cta-row">
                    <button className="btn btn-primary" type="button">
                      Publish with TikTok
                    </button>
                    <button className="btn btn-outline" type="button">
                      Share via Share Kit
                    </button>
                  </div>
                </article>

                <article className="review-panel">
                  <div className="review-panel-head">
                    <div>
                      <p className="review-panel-kicker">Activity log</p>
                      <h3>Publish, export, and sync feedback</h3>
                    </div>
                    <span className="review-pill success">Webhook events live</span>
                  </div>
                  <div className="review-status-stack">
                    <div className="review-status-item">
                      <span className="review-status-dot success" />
                      <div>
                        <strong>publish.started</strong>
                        <p>Creator confirmed the post and upload session opened.</p>
                      </div>
                    </div>
                    <div className="review-status-item">
                      <span className="review-status-dot success" />
                      <div>
                        <strong>publish.completed</strong>
                        <p>The workspace received the publish result and updated the timeline.</p>
                      </div>
                    </div>
                    <div className="review-status-item">
                      <span className="review-status-dot" />
                      <div>
                        <strong>data.export.ready</strong>
                        <p>Requested TikTok account data export prepared for download.</p>
                      </div>
                    </div>
                  </div>
                  <div className="review-inline-tags">
                    {webhookEvents.map((event) => (
                      <span key={event}>{event}</span>
                    ))}
                  </div>
                </article>
              </section>
            </div>
          </div>
        </section>

        <section id="products" className="review-section">
          <div className="review-section-head">
            <h2>How each TikTok product is used</h2>
            <p>Keep this aligned with the products selected in the developer portal.</p>
          </div>
          <div className="review-card-grid">
            {products.map((product) => (
              <article className="review-card" key={product.name}>
                <h3>{product.name}</h3>
                <p>{product.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="scopes" className="review-section">
          <div className="review-section-head">
            <h2>How each scope is used</h2>
            <p>
              If a scope is not demonstrated in the UI or in the video, remove it before submitting
              the review.
            </p>
          </div>
          <div className="review-card-grid review-card-grid-tight">
            {scopes.map((scope) => (
              <article className="review-card" key={scope.name}>
                <h3>{scope.name}</h3>
                <p>{scope.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="copy" className="review-section">
          <div className="review-section-head">
            <h2>App Review copy ready to paste</h2>
            <p>This is written to fit the 1000-character field while covering every selected product and scope.</p>
          </div>
          <article className="review-copy-card">
            <div className="review-copy-head">
              <div>
                <h3>Explain how each product and scope works</h3>
                <p>{reviewText.length} / 1000 characters</p>
              </div>
              <CopyButton text={reviewText} />
            </div>
            <pre className="review-copy-block">{reviewText}</pre>
          </article>
        </section>
      </main>
    </>
  );
}
