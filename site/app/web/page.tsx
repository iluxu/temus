import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "adoptan.ai Web Workspace",
  description:
    "Web workspace for creator-controlled TikTok connection, content review, publishing, exports, and event feedback."
};

const flowSteps = [
  {
    step: "01",
    title: "Connect the TikTok account",
    description:
      "The creator signs in with TikTok and returns to adoptan.ai with the connected account attached to the workspace."
  },
  {
    step: "02",
    title: "Review account context",
    description:
      "The operator verifies the connected account, profile context, recent post history, and key stats before publishing."
  },
  {
    step: "03",
    title: "Approve the clip",
    description:
      "The team selects an approved short-form asset, checks for duplicates, and validates the publishing queue."
  },
  {
    step: "04",
    title: "Choose publish settings",
    description:
      "The creator edits the caption, reviews privacy options, and controls comments, duet, and stitch before the publish step."
  },
  {
    step: "05",
    title: "Publish and monitor events",
    description:
      "The workspace tracks upload, publish, export, and webhook events so every action is visible in one place."
  }
] as const;

const capabilities = [
  {
    name: "Account connection",
    body: "Creators connect their TikTok account inside adoptan.ai and return to a workspace already scoped to the right identity."
  },
  {
    name: "Publishing queue",
    body: "Approved clips move through a queue with duplicate checks, publish readiness, and audit visibility for the team."
  },
  {
    name: "Manual review controls",
    body: "Captions, privacy settings, and interaction toggles stay visible and adjustable before the creator confirms the post."
  },
  {
    name: "Export and reporting",
    body: "The workspace keeps exports and publishing feedback accessible for operators who need a history of what happened."
  },
  {
    name: "Webhook timeline",
    body: "Operational events appear in the workspace log so the team can confirm sync and publish states without guessing."
  },
  {
    name: "Operator-first workflow",
    body: "The product is built for teams that want a visible, reviewable workflow instead of a blind automated posting tool."
  }
] as const;

const controls = [
  {
    name: "Connected account visibility",
    body: "The workspace always shows which TikTok account is connected so the operator can confirm the target before posting."
  },
  {
    name: "Recent post history",
    body: "Recent TikTok posts stay visible in the review surface to reduce accidental duplicates and keep context close to the decision."
  },
  {
    name: "Publish settings review",
    body: "Privacy and interaction options stay visible in the publish panel before the creator confirms the action."
  },
  {
    name: "Event feedback",
    body: "Publishing and sync events are written back into the workspace timeline so the operator can confirm the outcome."
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
            <a href="#workspace">Workspace</a>
            <a href="#capabilities">Capabilities</a>
            <a href="#controls">Controls</a>
          </div>
        </div>
      </header>

      <main className="review-page">
        <section className="review-hero">
          <div className="review-kicker">Web creator workspace</div>
          <h1>Review content, control publishing, and track every event from one interface</h1>
          <p className="review-lead">
            adoptan.ai gives operators and creators a single web workspace for account connection,
            clip review, publishing decisions, exports, and event feedback.
          </p>
          <div className="review-badges">
            <span>Connected accounts</span>
            <span>Publishing queue</span>
            <span>Manual review</span>
            <span>Exports</span>
            <span>Webhook timeline</span>
          </div>
        </section>

        <section id="flow" className="review-section">
          <div className="review-section-head">
            <h2>How the workflow moves</h2>
            <p>
              The operator starts in the workspace, validates the account and clip context, then
              confirms the publishing action with full visibility on the outcome.
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

        <section id="workspace" className="review-section">
          <div className="review-section-head">
            <h2>Inside the adoptan.ai workspace</h2>
            <p>
              The web app keeps the publish controls, the account context, the recent post history,
              and the event log in the same screen.
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
                    <p className="review-panel-kicker">Connected account</p>
                    <h3>Account access and session state</h3>
                  </div>
                  <span className="review-pill success">Ready</span>
                </div>
                <div className="review-cta-row">
                  <button className="btn btn-primary" type="button">
                    Connect TikTok
                  </button>
                  <span className="review-note">
                    The creator connects the account, returns to the workspace, and the operator can
                    continue from the same screen.
                  </span>
                </div>
              </section>

              <section className="review-grid">
                <article className="review-panel">
                  <div className="review-panel-head">
                    <div>
                      <p className="review-panel-kicker">Profile context</p>
                      <h3>@adoptan_demo</h3>
                    </div>
                    <span className="review-pill">Connected</span>
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
                </article>

                <article className="review-panel">
                  <div className="review-panel-head">
                    <div>
                      <p className="review-panel-kicker">Recent posts</p>
                      <h3>Duplicate check before publish</h3>
                    </div>
                    <span className="review-pill">Latest sync</span>
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
                      <p className="review-preview-title">Publish settings</p>
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
                    </div>
                  </div>
                  <div className="review-cta-row">
                    <button className="btn btn-primary" type="button">
                      Publish with TikTok
                    </button>
                    <button className="btn btn-outline" type="button">
                      Share approved asset
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
                        <p>Creator confirmed the post and the upload session opened.</p>
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
                        <p>The export bundle is ready for the operator to download.</p>
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

        <section id="capabilities" className="review-section">
          <div className="review-section-head">
            <h2>Core capabilities</h2>
            <p>
              The product is designed around a visible workflow: connect, review, decide, publish,
              and track the outcome.
            </p>
          </div>
          <div className="review-card-grid">
            {capabilities.map((capability) => (
              <article className="review-card" key={capability.name}>
                <h3>{capability.name}</h3>
                <p>{capability.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="controls" className="review-section">
          <div className="review-section-head">
            <h2>Operator controls and safeguards</h2>
            <p>
              The workspace keeps the key account, publishing, and event controls visible so the
              workflow stays reviewable by humans.
            </p>
          </div>
          <div className="review-card-grid">
            {controls.map((control) => (
              <article className="review-card" key={control.name}>
                <h3>{control.name}</h3>
                <p>{control.body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
