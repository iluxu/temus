import Link from "next/link";

const flowSteps = [
  {
    step: "01",
    title: "Start in the web workspace",
    description:
      "The creator signs in to adoptan.ai and opens the TikTok publishing workspace on the same verified domain."
  },
  {
    step: "02",
    title: "Connect TikTok",
    description:
      "Login Kit redirects to TikTok, the user grants the requested scopes, and returns to adoptan.ai."
  },
  {
    step: "03",
    title: "Load profile and recent videos",
    description:
      "The workspace displays basic identity, profile fields, stats, and recent public videos from TikTok."
  },
  {
    step: "04",
    title: "Load creator_info and prepare video",
    description:
      "The creator previews the 9:16 clip, edits the caption, and checks privacy, comments, duet, stitch, and duration options from TikTok."
  },
  {
    step: "05",
    title: "Choose draft or direct post",
    description:
      "The user gives explicit consent, starts either draft upload or direct post, then sees status and disconnect controls."
  }
] as const;

const capabilities = [
  {
    name: "Login Kit profile context",
    body: "Creators connect TikTok through OAuth and the workspace demonstrates user.info.basic, user.info.profile, and user.info.stats."
  },
  {
    name: "Recent video check",
    body: "The workspace uses video.list to show recent public videos and help the creator avoid accidental duplicate posts."
  },
  {
    name: "creator_info-driven UI",
    body: "Privacy choices, duration limits, and comment/duet/stitch availability are loaded from TikTok instead of hardcoded."
  },
  {
    name: "Draft upload",
    body: "video.upload lets the creator send an approved video to TikTok as a draft for final editing in TikTok."
  },
  {
    name: "Direct post",
    body: "video.publish lets the creator publish directly only after confirming content, caption, privacy, and interaction settings."
  },
  {
    name: "Focused publishing workflow",
    body: "The web app uses Login Kit and Content Posting API for account connection, content settings, draft upload, and direct publishing."
  }
] as const;

const controls = [
  {
    name: "Connected account visibility",
    body: "The workspace always shows which TikTok account is connected so the user can confirm the target before posting."
  },
  {
    name: "Explicit consent",
    body: "Draft upload and direct post actions are separated from the settings editor and include a consent statement before upload starts."
  },
  {
    name: "TikTok policy settings",
    body: "Privacy, commercial content disclosure, comments, duet, and stitch are controlled before submission."
  },
  {
    name: "Disconnect path",
    body: "The user can disconnect TikTok from adoptan.ai and revoke access from TikTok settings."
  }
] as const;

const webhookEvents = [
  "oauth.connected",
  "profile.loaded",
  "video_list.loaded",
  "creator_info.loaded",
  "draft_upload.completed",
  "publish.started",
  "publish.completed"
] as const;

export default function WebWorkspaceHome() {
  return (
    <>
      <header className="workspace-nav">
        <div className="workspace-nav-inner">
          <Link className="nav-logo" href="/">
            adoptan.ai
          </Link>
          <div className="workspace-nav-links">
            <a href="#flow">Flow</a>
            <a href="#workspace">Workspace</a>
            <a href="#capabilities">Capabilities</a>
            <a href="#controls">Controls</a>
            <Link href="/app">Open app</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
          </div>
        </div>
      </header>

      <main className="workspace-page">
        <section className="workspace-hero">
          <div className="workspace-kicker">TikTok creator workspace</div>
          <h1>Connect TikTok, prepare the video, confirm upload or publish, and track every event</h1>
          <p className="workspace-lead">
            adoptan.ai gives creators a web workspace for TikTok Login Kit profile context, video
            list checks, Content Posting API draft upload, direct post, status tracking, and
            disconnect.
          </p>
          <div className="workspace-badges">
            <span>user.info.basic</span>
            <span>user.info.profile</span>
            <span>user.info.stats</span>
            <span>video.list</span>
            <span>video.upload</span>
            <span>video.publish</span>
            <span>Creator flow</span>
          </div>
        </section>

        <section id="flow" className="workspace-section">
          <div className="workspace-section-head">
            <h2>How the workflow moves</h2>
            <p>
              The creator starts in the web UI, authorizes TikTok, checks account and
              video context, confirms draft upload or direct post, then sees the outcome.
            </p>
          </div>
          <div className="workspace-flow">
            {flowSteps.map((step) => (
              <article className="workspace-flow-card" key={step.step}>
                <div className="workspace-flow-step">{step.step}</div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="workspace" className="workspace-section">
          <div className="workspace-section-head">
            <h2>Inside the adoptan.ai workspace</h2>
            <p>
              The web app keeps account context, recent TikTok videos, creator_info settings, video
              preview, consent, upload actions, and the event log in the same screen.
            </p>
          </div>

          <div className="workspace-shell">
            <aside className="workspace-sidebar">
              <div className="workspace-sidebar-label">Workspace</div>
              <div className="workspace-sidebar-title">TikTok Publishing</div>
              <ul className="workspace-sidebar-list">
                <li className="active">TikTok publishing</li>
                <li>Account connection</li>
                <li>Profile and stats</li>
                <li>Recent videos</li>
                <li>Video preview</li>
                <li>Publish status</li>
              </ul>
            </aside>

            <div className="workspace-main">
              <section className="workspace-panel">
                <div className="workspace-panel-head">
                  <div>
                    <p className="workspace-panel-kicker">Connected account</p>
                    <h3>TikTok authorization</h3>
                  </div>
                  <span className="workspace-pill success">Connection ready</span>
                </div>
                <div className="workspace-cta-row">
                  <Link className="btn btn-primary" href="/app">
                    Open creator workspace
                  </Link>
                  <span className="workspace-note">
                    Requested scopes shown in consent: user.info.basic, user.info.profile,
                    user.info.stats, video.list, video.upload, and video.publish.
                  </span>
                </div>
              </section>

              <section className="workspace-grid">
                <article className="workspace-panel">
                  <div className="workspace-panel-head">
                    <div>
                      <p className="workspace-panel-kicker">Profile context</p>
                      <h3>@adoptan_demo</h3>
                    </div>
                    <span className="workspace-pill">Connected</span>
                  </div>
                  <ul className="workspace-metric-list">
                    <li>
                      <span>Avatar and display name</span>
                      <strong>user.info.basic</strong>
                    </li>
                    <li>
                      <span>Bio and verified status</span>
                      <strong>user.info.profile</strong>
                    </li>
                    <li>
                      <span>Followers / likes / videos</span>
                      <strong>user.info.stats</strong>
                    </li>
                    <li>
                      <span>Connection state</span>
                      <strong>Active OAuth session</strong>
                    </li>
                  </ul>
                </article>

                <article className="workspace-panel">
                  <div className="workspace-panel-head">
                    <div>
                      <p className="workspace-panel-kicker">Recent public videos</p>
                      <h3>Duplicate check before upload</h3>
                    </div>
                    <span className="workspace-pill">video.list</span>
                  </div>
                  <ul className="workspace-video-list">
                    <li>
                      <span>Last public post</span>
                      <strong>Campaign recap - 2h ago</strong>
                    </li>
                    <li>
                      <span>Previous clip</span>
                      <strong>Creator highlight - yesterday</strong>
                    </li>
                    <li>
                      <span>Duplicate status</span>
                      <strong>No match found</strong>
                    </li>
                  </ul>
                </article>
              </section>

              <section className="workspace-grid workspace-grid-wide">
                <article className="workspace-panel">
                  <div className="workspace-panel-head">
                    <div>
                      <p className="workspace-panel-kicker">Selected clip</p>
                      <h3>Approved 9:16 creator clip</h3>
                    </div>
                    <span className="workspace-pill warning">Ready for TikTok</span>
                  </div>
                  <div className="workspace-preview">
                    <div className="workspace-preview-media">
                      <span>9:16 preview</span>
                    </div>
                    <div className="workspace-preview-body">
                      <p className="workspace-preview-title">Caption</p>
                      <div className="workspace-input">
                        This clip is ready after creator approval. Caption is editable before TikTok
                        upload starts. #creatorworkflow
                      </div>
                      <p className="workspace-preview-title">Publish settings from creator_info</p>
                      <div className="workspace-setting-grid">
                        <div className="workspace-setting">
                          <span>Privacy</span>
                          <strong>PUBLIC_TO_EVERYONE</strong>
                        </div>
                        <div className="workspace-setting">
                          <span>Comments</span>
                          <strong>Allowed</strong>
                        </div>
                        <div className="workspace-setting">
                          <span>Duet</span>
                          <strong>Allowed</strong>
                        </div>
                        <div className="workspace-setting">
                          <span>Stitch</span>
                          <strong>Disabled</strong>
                        </div>
                        <div className="workspace-setting">
                          <span>Commercial content</span>
                          <strong>Not selected</strong>
                        </div>
                        <div className="workspace-setting">
                          <span>Consent</span>
                          <strong>Required before upload</strong>
                        </div>
                        <div className="workspace-setting">
                          <span>Draft mode</span>
                          <strong>video.upload</strong>
                        </div>
                        <div className="workspace-setting">
                          <span>Direct mode</span>
                          <strong>video.publish</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="workspace-cta-row">
                    <button className="btn btn-outline" type="button">
                      Upload as TikTok draft
                    </button>
                    <button className="btn btn-primary" type="button">
                      Confirm and publish to TikTok
                    </button>
                    <button className="btn btn-outline" type="button">
                      Disconnect TikTok
                    </button>
                    <span className="workspace-note">
                      Before either draft upload or direct post, the user confirms the selected
                      content, caption, visibility, and TikTok music usage requirements.
                    </span>
                  </div>
                </article>

                <article className="workspace-panel">
                  <div className="workspace-panel-head">
                    <div>
                      <p className="workspace-panel-kicker">Activity log</p>
                      <h3>OAuth, upload, publish, and disconnect feedback</h3>
                    </div>
                    <span className="workspace-pill success">Status visible</span>
                  </div>
                  <div className="workspace-status-stack">
                    <div className="workspace-status-item">
                      <span className="workspace-status-dot success" />
                      <div>
                        <strong>oauth.connected</strong>
                        <p>TikTok returned the user to adoptan.ai after consent.</p>
                      </div>
                    </div>
                    <div className="workspace-status-item">
                      <span className="workspace-status-dot success" />
                      <div>
                        <strong>profile.loaded</strong>
                        <p>Basic profile, profile fields, and stats were loaded.</p>
                      </div>
                    </div>
                    <div className="workspace-status-item">
                      <span className="workspace-status-dot success" />
                      <div>
                        <strong>video_list.loaded</strong>
                        <p>Recent public TikTok videos were loaded for duplicate checks.</p>
                      </div>
                    </div>
                    <div className="workspace-status-item">
                      <span className="workspace-status-dot success" />
                      <div>
                        <strong>creator_info.loaded</strong>
                        <p>Privacy, duration, and interaction options were loaded before controls.</p>
                      </div>
                    </div>
                    <div className="workspace-status-item">
                      <span className="workspace-status-dot success" />
                      <div>
                        <strong>draft_upload.completed</strong>
                        <p>The approved clip was sent to TikTok as a draft after user confirmation.</p>
                      </div>
                    </div>
                    <div className="workspace-status-item">
                      <span className="workspace-status-dot success" />
                      <div>
                        <strong>publish.completed</strong>
                        <p>The workspace received the TikTok direct post status and updated the timeline.</p>
                      </div>
                    </div>
                  </div>
                  <div className="workspace-inline-tags">
                    {webhookEvents.map((event) => (
                      <span key={event}>{event}</span>
                    ))}
                  </div>
                </article>
              </section>
            </div>
          </div>
        </section>

        <section id="capabilities" className="workspace-section">
          <div className="workspace-section-head">
            <h2>Core capabilities</h2>
            <p>
              The product is designed around Login Kit and
              Content Posting API, with profile, stats, video list, draft upload, and direct post
              visible in the UI.
            </p>
          </div>
          <div className="workspace-card-grid">
            {capabilities.map((capability) => (
              <article className="workspace-card" key={capability.name}>
                <h3>{capability.name}</h3>
                <p>{capability.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="controls" className="workspace-section">
          <div className="workspace-section-head">
            <h2>Operator controls and safeguards</h2>
            <p>
              The workspace keeps account, publishing, consent, policy, and disconnect controls
              visible so the workflow stays controlled by humans.
            </p>
          </div>
          <div className="workspace-card-grid">
            {controls.map((control) => (
              <article className="workspace-card" key={control.name}>
                <h3>{control.name}</h3>
                <p>{control.body}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="workspace-footer">
          <div className="workspace-footer-copy">
            <div className="footer-logo">adoptan.ai</div>
            <p>
              Creator-facing web workspace for TikTok account connection, profile context, recent
              video checks, draft upload, direct post, status tracking, and disconnect.
            </p>
          </div>
          <div className="workspace-footer-links">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/web/callback">TikTok callback</Link>
          </div>
        </footer>
      </main>
    </>
  );
}
