"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const TIKTOK_CLIENT_KEY = "09en2l84fpipb7q7o5poytnea788ae";
const TIKTOK_REDIRECT_URI = "https://adoptan.ai/web/callback/";
const TIKTOK_SCOPES = [
  "user.info.basic",
  "user.info.profile",
  "user.info.stats",
  "video.list",
  "video.upload",
  "video.publish"
] as const;

const recentVideos = [
  { title: "Campaign recap", status: "Published 2h ago", duplicate: "No duplicate" },
  { title: "Creator highlight", status: "Published yesterday", duplicate: "Different clip" },
  { title: "Product teaser", status: "Published last week", duplicate: "Different caption" }
] as const;

export default function TikTokReviewApp() {
  const [signedIn, setSignedIn] = useState(false);
  const [connected, setConnected] = useState(false);
  const [privacy, setPrivacy] = useState("");
  const [allowComments, setAllowComments] = useState(false);
  const [allowDuet, setAllowDuet] = useState(false);
  const [allowStitch, setAllowStitch] = useState(false);
  const [consent, setConsent] = useState(false);
  const [draftUploaded, setDraftUploaded] = useState(false);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectedFromCallback = params.get("connected") === "1";

    if (connectedFromCallback) {
      window.localStorage.setItem("adoptan.review.signed_in", "1");
      window.localStorage.setItem("adoptan.review.tiktok_connected", "1");
    }

    setSignedIn(
      connectedFromCallback || window.localStorage.getItem("adoptan.review.signed_in") === "1"
    );
    setConnected(
      connectedFromCallback ||
        window.localStorage.getItem("adoptan.review.tiktok_connected") === "1"
    );
  }, []);

  function buildTikTokAuthUrl() {
    const state = `adoptan_review_${Date.now()}`;
    const params = new URLSearchParams({
      client_key: TIKTOK_CLIENT_KEY,
      response_type: "code",
      scope: TIKTOK_SCOPES.join(","),
      redirect_uri: TIKTOK_REDIRECT_URI,
      state
    });

    return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
  }

  const canSubmit = connected && privacy && consent;
  const events = [
    connected ? "oauth.connected" : null,
    connected ? "profile.loaded" : null,
    connected ? "video_list.loaded" : null,
    connected ? "creator_info.loaded" : null,
    draftUploaded ? "draft_upload.completed" : null,
    published ? "publish.started" : null,
    published ? "publish.completed" : null
  ].filter(Boolean);

  function signIn() {
    window.localStorage.setItem("adoptan.review.signed_in", "1");
    setSignedIn(true);
  }

  function connectMock() {
    window.localStorage.setItem("adoptan.review.signed_in", "1");
    window.localStorage.setItem("adoptan.review.tiktok_connected", "1");
    setSignedIn(true);
    setConnected(true);
  }

  function connectTikTok() {
    window.location.assign(buildTikTokAuthUrl());
  }

  function disconnect() {
    window.localStorage.removeItem("adoptan.review.tiktok_connected");
    setConnected(false);
    setDraftUploaded(false);
    setPublished(false);
    setConsent(false);
    setPrivacy("");
    setAllowComments(false);
    setAllowDuet(false);
    setAllowStitch(false);
  }

  return (
    <>
      <header className="review-nav">
        <div className="review-nav-inner">
          <Link className="nav-logo" href="/">
            adoptan.ai
          </Link>
          <div className="review-nav-links">
            <Link href="/">Review site</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
          </div>
        </div>
      </header>

      <main className="app-demo-page">
        <section className="app-demo-hero">
          <div>
            <div className="review-kicker">Sandbox mode</div>
            <h1>Clickable TikTok review flow</h1>
            <p className="review-lead">
              This workspace demonstrates Login Kit, user profile scopes, recent public videos,
              creator_info controls, draft upload, direct post, publish status, and disconnect.
            </p>
          </div>
          <div className="app-demo-scope-card">
            {TIKTOK_SCOPES.map((scope) => (
              <span key={scope}>{scope}</span>
            ))}
          </div>
        </section>

        {!signedIn ? (
          <section className="app-demo-card app-demo-login">
            <div>
              <p className="review-panel-kicker">Step 1</p>
              <h2>Sign in to adoptan.ai</h2>
              <p>
                This demo login is the user interaction interface shown to TikTok reviewers before
                the creator connects TikTok.
              </p>
            </div>
            <label>
              Email
              <input readOnly value="reviewer@adoptan.ai" />
            </label>
            <label>
              Password
              <input readOnly type="password" value="review-demo-password" />
            </label>
            <button className="btn btn-primary" type="button" onClick={signIn}>
              Sign in to review workspace
            </button>
          </section>
        ) : !connected ? (
          <section className="app-demo-card">
            <div className="review-panel-head">
              <div>
                <p className="review-panel-kicker">Step 2</p>
                <h2>Connect TikTok</h2>
              </div>
              <span className="review-pill warning">Sandbox OAuth</span>
            </div>
            <p>
              The primary button opens TikTok Login Kit with the exact scopes selected in the
              Developer Portal. After consent, TikTok redirects back to
              `https://adoptan.ai/web/callback/`.
            </p>
            <div className="review-cta-row">
              <button className="btn btn-primary" type="button" onClick={connectTikTok}>
                Connect TikTok
              </button>
              <button className="btn btn-outline" type="button" onClick={connectMock}>
                Use sandbox mock connection
              </button>
            </div>
            <p className="review-note">
              Use the mock connection only if TikTok sandbox is unavailable during recording. The
              UI still demonstrates every selected scope and user action.
            </p>
          </section>
        ) : (
          <section className="app-demo-workspace">
            <aside className="app-demo-card">
              <div className="review-panel-head">
                <div>
                  <p className="review-panel-kicker">Connected creator</p>
                  <h2>@adoptan_demo</h2>
                </div>
                <span className="review-pill success">Connected</span>
              </div>
              <div className="app-demo-profile">
                <div className="app-demo-avatar">AD</div>
                <div>
                  <strong>Adoptan Demo</strong>
                  <p>Creator workflow sandbox</p>
                </div>
              </div>
              <ul className="review-metric-list">
                <li>
                  <span>Avatar and display name</span>
                  <strong>user.info.basic</strong>
                </li>
                <li>
                  <span>Bio, profile link, verified</span>
                  <strong>user.info.profile</strong>
                </li>
                <li>
                  <span>12.4K followers / 184 videos</span>
                  <strong>user.info.stats</strong>
                </li>
              </ul>
              <button className="btn btn-outline" type="button" onClick={disconnect}>
                Disconnect TikTok
              </button>
            </aside>

            <div className="app-demo-stack">
              <section className="app-demo-card">
                <div className="review-panel-head">
                  <div>
                    <p className="review-panel-kicker">Recent public videos</p>
                    <h2>Duplicate check</h2>
                  </div>
                  <span className="review-pill">video.list</span>
                </div>
                <ul className="review-video-list">
                  {recentVideos.map((video) => (
                    <li key={video.title}>
                      <span>
                        {video.title}
                        <br />
                        {video.duplicate}
                      </span>
                      <strong>{video.status}</strong>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="app-demo-card">
                <div className="review-panel-head">
                  <div>
                    <p className="review-panel-kicker">Selected clip</p>
                    <h2>Review and choose TikTok action</h2>
                  </div>
                  <span className="review-pill success">creator_info.loaded</span>
                </div>

                <div className="review-preview">
                  <div className="review-preview-media">
                    <span>9:16 preview</span>
                  </div>
                  <div className="review-preview-body">
                    <label className="app-demo-label">
                      Editable caption
                      <textarea defaultValue="Creator-approved clip, ready for TikTok. #creatorworkflow" />
                    </label>

                    <label className="app-demo-label">
                      Privacy from creator_info
                      <select value={privacy} onChange={(event) => setPrivacy(event.target.value)}>
                        <option value="">Select privacy</option>
                        <option value="PUBLIC_TO_EVERYONE">PUBLIC_TO_EVERYONE</option>
                        <option value="MUTUAL_FOLLOW_FRIENDS">MUTUAL_FOLLOW_FRIENDS</option>
                        <option value="SELF_ONLY">SELF_ONLY</option>
                      </select>
                    </label>

                    <div className="app-demo-checks">
                      <label>
                        <input
                          checked={allowComments}
                          onChange={(event) => setAllowComments(event.target.checked)}
                          type="checkbox"
                        />
                        Allow comments
                      </label>
                      <label>
                        <input
                          checked={allowDuet}
                          onChange={(event) => setAllowDuet(event.target.checked)}
                          type="checkbox"
                        />
                        Allow duet
                      </label>
                      <label>
                        <input
                          checked={allowStitch}
                          onChange={(event) => setAllowStitch(event.target.checked)}
                          type="checkbox"
                        />
                        Allow stitch
                      </label>
                    </div>

                    <label className="app-demo-consent">
                      <input
                        checked={consent}
                        onChange={(event) => setConsent(event.target.checked)}
                        type="checkbox"
                      />
                      By posting, I agree to TikTok's Music Usage Confirmation and confirm the
                      selected content, caption, visibility, and interaction settings.
                    </label>

                    <div className="review-cta-row">
                      <button
                        className="btn btn-outline"
                        disabled={!canSubmit}
                        type="button"
                        onClick={() => setDraftUploaded(true)}
                      >
                        Upload as TikTok draft
                      </button>
                      <button
                        className="btn btn-primary"
                        disabled={!canSubmit}
                        type="button"
                        onClick={() => setPublished(true)}
                      >
                        Confirm and publish to TikTok
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="app-demo-card">
                <div className="review-panel-head">
                  <div>
                    <p className="review-panel-kicker">Activity log</p>
                    <h2>Status feedback</h2>
                  </div>
                  <span className="review-pill success">Visible to user</span>
                </div>
                <div className="review-status-stack">
                  {events.map((event) => (
                    <div className="review-status-item" key={event}>
                      <span className="review-status-dot success" />
                      <div>
                        <strong>{event}</strong>
                        <p>Shown in the workspace for reviewer visibility.</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
