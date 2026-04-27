"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const DEFAULT_TIKTOK_CLIENT_KEY = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY || "";
const TIKTOK_REDIRECT_URI = "https://adoptan.ai/web/callback/";
const SIGNED_IN_KEY = "adoptan.workspace.signed_in";
const TIKTOK_CONNECTED_KEY = "adoptan.workspace.tiktok_connected";
const TIKTOK_CLIENT_KEY_STORAGE = "adoptan.workspace.tiktok_client_key";

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
  const [clientKey, setClientKey] = useState(DEFAULT_TIKTOK_CLIENT_KEY);
  const [oauthNotice, setOauthNotice] = useState("");
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
    const clientKeyFromUrl = params.get("tiktok_client_key")?.trim();

    if (clientKeyFromUrl) {
      window.localStorage.setItem(TIKTOK_CLIENT_KEY_STORAGE, clientKeyFromUrl);
      setClientKey(clientKeyFromUrl);
    } else {
      setClientKey(window.localStorage.getItem(TIKTOK_CLIENT_KEY_STORAGE) || DEFAULT_TIKTOK_CLIENT_KEY);
    }

    if (connectedFromCallback) {
      window.localStorage.setItem(SIGNED_IN_KEY, "1");
      window.localStorage.setItem(TIKTOK_CONNECTED_KEY, "1");
    }

    setSignedIn(connectedFromCallback || window.localStorage.getItem(SIGNED_IN_KEY) === "1");
    setConnected(connectedFromCallback || window.localStorage.getItem(TIKTOK_CONNECTED_KEY) === "1");
  }, []);

  function buildTikTokAuthUrl() {
    if (!clientKey) {
      return null;
    }

    const state = `adoptan_workspace_${Date.now()}`;
    const params = new URLSearchParams({
      client_key: clientKey,
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
    window.localStorage.setItem(SIGNED_IN_KEY, "1");
    setSignedIn(true);
  }

  function connectDemo() {
    window.localStorage.setItem(SIGNED_IN_KEY, "1");
    window.localStorage.setItem(TIKTOK_CONNECTED_KEY, "1");
    setSignedIn(true);
    setConnected(true);
    setOauthNotice("");
  }

  function connectTikTok() {
    const authUrl = buildTikTokAuthUrl();

    if (!authUrl) {
      setOauthNotice(
        "TikTok OAuth is not configured on this build yet. Add the TikTok Developer Portal Client key before recording the real login, or use the demo connection to show the product flow."
      );
      return;
    }

    setOauthNotice("");
    window.location.assign(authUrl);
  }

  function disconnect() {
    window.localStorage.removeItem(TIKTOK_CONNECTED_KEY);
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
      <header className="workspace-nav">
        <div className="workspace-nav-inner">
          <Link className="nav-logo" href="/">
            adoptan.ai
          </Link>
          <div className="workspace-nav-links">
            <Link href="/">Home</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
          </div>
        </div>
      </header>

      <main className="app-demo-page">
        <section className="app-demo-hero">
          <div>
            <div className="workspace-kicker">Creator workspace</div>
            <h1>Prepare and publish creator clips from one workspace</h1>
            <p className="workspace-lead">
              Connect TikTok, verify the creator account, check recent posts, prepare a short-form
              clip, choose draft upload or direct post, and track every status update.
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
              <p className="workspace-panel-kicker">Step 1</p>
              <h2>Sign in to adoptan.ai</h2>
              <p>Open the creator workspace before connecting publishing channels.</p>
            </div>
            <label>
              Email
              <input readOnly value="creator@adoptan.ai" />
            </label>
            <label>
              Password
              <input readOnly type="password" value="workspace-demo-password" />
            </label>
            <button className="btn btn-primary" type="button" onClick={signIn}>
              Sign in to workspace
            </button>
          </section>
        ) : !connected ? (
          <section className="app-demo-card">
            <div className="workspace-panel-head">
              <div>
                <p className="workspace-panel-kicker">Step 2</p>
                <h2>Connect TikTok</h2>
              </div>
              <span className="workspace-pill warning">OAuth connection</span>
            </div>
            <p>
              Login Kit opens TikTok authorization, asks for the selected account permissions, then
              returns the creator to the Adoptan workspace.
            </p>
            <div className="workspace-cta-row">
              <button className="btn btn-primary" type="button" onClick={connectTikTok}>
                Connect TikTok
              </button>
              <button className="btn btn-outline" type="button" onClick={connectDemo}>
                Use demo connection
              </button>
            </div>
            {oauthNotice ? <p className="workspace-note">{oauthNotice}</p> : null}
          </section>
        ) : (
          <section className="app-demo-workspace">
            <aside className="app-demo-card">
              <div className="workspace-panel-head">
                <div>
                  <p className="workspace-panel-kicker">Connected creator</p>
                  <h2>@adoptan_demo</h2>
                </div>
                <span className="workspace-pill success">Connected</span>
              </div>
              <div className="app-demo-profile">
                <div className="app-demo-avatar">AD</div>
                <div>
                  <strong>Adoptan Demo</strong>
                  <p>Creator account</p>
                </div>
              </div>
              <ul className="workspace-metric-list">
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
                <div className="workspace-panel-head">
                  <div>
                    <p className="workspace-panel-kicker">Recent public videos</p>
                    <h2>Duplicate check</h2>
                  </div>
                  <span className="workspace-pill">video.list</span>
                </div>
                <ul className="workspace-video-list">
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
                <div className="workspace-panel-head">
                  <div>
                    <p className="workspace-panel-kicker">Selected clip</p>
                    <h2>Prepare TikTok action</h2>
                  </div>
                  <span className="workspace-pill success">creator_info.loaded</span>
                </div>

                <div className="workspace-preview">
                  <div className="workspace-preview-media">
                    <span>9:16 preview</span>
                  </div>
                  <div className="workspace-preview-body">
                    <label className="app-demo-label">
                      Editable caption
                      <textarea defaultValue="A creator-approved clip, packaged for the next post. #creatorworkflow" />
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
                      I confirm the selected content, caption, visibility, interaction settings, and
                      TikTok music usage requirements before upload.
                    </label>

                    <div className="workspace-cta-row">
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
                <div className="workspace-panel-head">
                  <div>
                    <p className="workspace-panel-kicker">Activity log</p>
                    <h2>Status feedback</h2>
                  </div>
                  <span className="workspace-pill success">Visible to user</span>
                </div>
                <div className="workspace-status-stack">
                  {events.map((event) => (
                    <div className="workspace-status-item" key={event}>
                      <span className="workspace-status-dot success" />
                      <div>
                        <strong>{event}</strong>
                        <p>Shown in the workspace for clear status visibility.</p>
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
