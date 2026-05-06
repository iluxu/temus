"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent } from "react";

const DEFAULT_TIKTOK_CLIENT_KEY = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY || "sbawmp8ejor8xbhaf1";
const TIKTOK_REDIRECT_URI = "https://adoptan.ai/web/callback/";
const SIGNED_IN_KEY = "adoptan.workspace.signed_in";
const TIKTOK_CONNECTED_KEY = "adoptan.workspace.tiktok_connected";
const TIKTOK_CLIENT_KEY_STORAGE = "adoptan.workspace.tiktok_client_key";
const TIKTOK_CODE_VERIFIER_STORAGE = "adoptan.workspace.tiktok_code_verifier";
const TIKTOK_STATE_STORAGE = "adoptan.workspace.tiktok_state";
const TIKTOK_REVIEW_API_BASE = "https://api.adoptan.ai/tiktok-review";

const TIKTOK_SCOPES = [
  "user.info.basic",
  "user.info.profile",
  "user.info.stats",
  "video.list",
  "video.upload",
  "video.publish"
] as const;

const fallbackCreator = {
  username: "luciamucciareplay",
  displayName: "luciamucciareplay",
  bio: "Replays Lucia a New York",
  openId: "-0002ZOz...fT5Spa",
  profileWebLink: "https://www.tiktok.com/@luciamucciareplay",
  followers: "5",
  likes: "255",
  videoCount: "0"
} as const;

type SelectedVideo = {
  name: string;
  size: string;
  type: string;
  url: string;
  file: File;
};

type CreatorProfile = {
  username: string;
  displayName: string;
  bio: string;
  openId: string;
  profileWebLink: string;
  followers: string;
  likes: string;
  videoCount: string;
};

type RecentVideo = {
  title: string;
  status: string;
  duplicate: string;
};

type CreatorInfo = {
  privacyOptions: string[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
};

type PublishResult = {
  mode: "draft" | "direct";
  publishId: string;
  status: {
    status: string;
    attempts?: number;
    failReason?: string;
    publicalyAvailablePostId?: string;
    timedOut?: boolean;
  };
};

function randomHex(bytes: number) {
  const array = new Uint8Array(bytes);
  window.crypto.getRandomValues(array);
  return Array.from(array, (item) => item.toString(16).padStart(2, "0")).join("");
}

async function sha256Base64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return window
    .btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function maskOpenId(value: unknown) {
  const raw = String(value || "");
  if (raw.length <= 12) {
    return raw;
  }

  return `${raw.slice(0, 8)}...${raw.slice(-6)}`;
}

export default function TikTokReviewApp() {
  const [signedIn, setSignedIn] = useState(false);
  const [connected, setConnected] = useState(false);
  const [clientKey, setClientKey] = useState(DEFAULT_TIKTOK_CLIENT_KEY);
  const [oauthNotice, setOauthNotice] = useState("");
  const [oauthRedirecting, setOauthRedirecting] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<SelectedVideo | null>(null);
  const [creator, setCreator] = useState<CreatorProfile>(fallbackCreator);
  const [recentVideos, setRecentVideos] = useState<RecentVideo[]>([]);
  const [creatorInfo, setCreatorInfo] = useState<CreatorInfo>({
    privacyOptions: ["FOLLOWER_OF_CREATOR", "MUTUAL_FOLLOW_FRIENDS", "SELF_ONLY"],
    commentDisabled: false,
    duetDisabled: true,
    stitchDisabled: true
  });
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [caption, setCaption] = useState("A creator-approved clip, packaged for the next post. #creatorworkflow");
  const [privacy, setPrivacy] = useState("");
  const [allowComments, setAllowComments] = useState(false);
  const [allowDuet, setAllowDuet] = useState(false);
  const [allowStitch, setAllowStitch] = useState(false);
  const [consent, setConsent] = useState(false);
  const [activeAction, setActiveAction] = useState<"draft" | "direct" | "">("");
  const [draftResult, setDraftResult] = useState<PublishResult | null>(null);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  const [publishError, setPublishError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resetFlow = params.get("reset") === "1";
    const connectedFromCallback = params.get("connected") === "1";
    const clientKeyFromUrl = params.get("tiktok_client_key")?.trim();

    if (resetFlow) {
      window.localStorage.removeItem(SIGNED_IN_KEY);
      window.localStorage.removeItem(TIKTOK_CONNECTED_KEY);
      window.sessionStorage.removeItem(TIKTOK_STATE_STORAGE);
      window.sessionStorage.removeItem(TIKTOK_CODE_VERIFIER_STORAGE);
      window.history.replaceState(null, "", "/app");
    }

    if (clientKeyFromUrl) {
      window.localStorage.setItem(TIKTOK_CLIENT_KEY_STORAGE, clientKeyFromUrl);
      setClientKey(clientKeyFromUrl);
    } else {
      setClientKey(window.localStorage.getItem(TIKTOK_CLIENT_KEY_STORAGE) || DEFAULT_TIKTOK_CLIENT_KEY);
    }

    if (!resetFlow && connectedFromCallback) {
      window.localStorage.setItem(SIGNED_IN_KEY, "1");
      window.localStorage.setItem(TIKTOK_CONNECTED_KEY, "1");
    }

    setSignedIn(!resetFlow && (connectedFromCallback || window.localStorage.getItem(SIGNED_IN_KEY) === "1"));
    setConnected(!resetFlow && (connectedFromCallback || window.localStorage.getItem(TIKTOK_CONNECTED_KEY) === "1"));
  }, []);

  useEffect(() => {
    return () => {
      if (selectedVideo?.url) {
        URL.revokeObjectURL(selectedVideo.url);
      }
    };
  }, [selectedVideo]);

  useEffect(() => {
    if (!connected) {
      return;
    }

    let cancelled = false;

    async function loadTikTokProfile() {
      setProfileError("");
      try {
        const response = await fetch(`${TIKTOK_REVIEW_API_BASE}/profile`, {
          headers: {
            Accept: "application/json"
          }
        });
        const payload = await response.json();
        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.message || payload?.error || "Unable to load TikTok profile.");
        }

        if (cancelled) {
          return;
        }

        const user = payload.user || {};
        const creatorInfoPayload = payload.creatorInfo || {};
        const privacyOptions = Array.isArray(creatorInfoPayload.privacy_level_options)
          ? creatorInfoPayload.privacy_level_options
          : creatorInfo.privacyOptions;

        setCreator({
          username: user.username || fallbackCreator.username,
          displayName: user.display_name || fallbackCreator.displayName,
          bio: user.bio_description || fallbackCreator.bio,
          openId: maskOpenId(user.open_id) || fallbackCreator.openId,
          profileWebLink:
            user.profile_deep_link ||
            (user.username ? `https://www.tiktok.com/@${user.username}` : fallbackCreator.profileWebLink),
          followers: String(user.follower_count ?? fallbackCreator.followers),
          likes: String(user.likes_count ?? fallbackCreator.likes),
          videoCount: String(user.video_count ?? fallbackCreator.videoCount)
        });
        setCreatorInfo({
          privacyOptions,
          commentDisabled: Boolean(creatorInfoPayload.comment_disabled),
          duetDisabled: Boolean(creatorInfoPayload.duet_disabled),
          stitchDisabled: Boolean(creatorInfoPayload.stitch_disabled)
        });
        setRecentVideos(
          Array.isArray(payload.videos)
            ? payload.videos.map((video: Record<string, unknown>) => ({
                title: String(video.title || video.video_description || video.id || "Untitled TikTok"),
                status: "public",
                duplicate: video.create_time ? `Posted at ${video.create_time}` : "Returned by video.list"
              }))
            : []
        );
        setAllowComments(!creatorInfoPayload.comment_disabled);
        setAllowDuet(!creatorInfoPayload.duet_disabled);
        setAllowStitch(!creatorInfoPayload.stitch_disabled);
        setPrivacy(privacyOptions.includes("SELF_ONLY") ? "SELF_ONLY" : privacyOptions[0] || "");
        setProfileLoaded(true);
      } catch (error) {
        if (!cancelled) {
          setProfileError(error instanceof Error ? error.message : "TikTok profile load failed.");
        }
      }
    }

    loadTikTokProfile();

    return () => {
      cancelled = true;
    };
  }, [connected]);

  async function buildTikTokAuthUrl() {
    if (!clientKey) {
      return null;
    }

    const state = randomHex(16);
    const codeVerifier = randomHex(32);
    const codeChallenge = await sha256Base64Url(codeVerifier);
    window.sessionStorage.setItem(TIKTOK_STATE_STORAGE, state);
    window.sessionStorage.setItem(TIKTOK_CODE_VERIFIER_STORAGE, codeVerifier);

    const params = new URLSearchParams({
      client_key: clientKey,
      response_type: "code",
      scope: TIKTOK_SCOPES.join(","),
      redirect_uri: TIKTOK_REDIRECT_URI,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256"
    });

    return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
  }

  const canSubmit = Boolean(connected && selectedVideo && privacy && consent && !activeAction);
  const events = [
    connected ? "oauth.connected" : null,
    profileLoaded ? "profile.loaded / user.info.basic + user.info.profile + user.info.stats" : null,
    profileLoaded ? "video_list.loaded / video.list" : null,
    profileLoaded ? "creator_info.loaded / privacy and interaction options" : null,
    selectedVideo ? `asset.selected / ${selectedVideo.name}` : null,
    activeAction === "draft" ? "draft_upload.started / real API upload in progress" : null,
    draftResult ? `draft_upload.completed / ${draftResult.status.status} / ${draftResult.publishId}` : null,
    activeAction === "direct" ? "publish.started / real API upload in progress" : null,
    publishResult ? `publish.completed / ${publishResult.status.status} / ${publishResult.publishId}` : null
  ].filter(Boolean);

  function signIn() {
    window.localStorage.setItem(SIGNED_IN_KEY, "1");
    setSignedIn(true);
  }

  async function connectTikTok() {
    const authUrl = await buildTikTokAuthUrl();

    if (!authUrl) {
      setOauthNotice(
        "TikTok OAuth is not configured on this build yet. Add the TikTok Developer Portal Client key before recording the login flow."
      );
      return;
    }

    setOauthRedirecting(true);
    setOauthNotice("Opening TikTok authorization on tiktok.com with the selected scopes...");
    window.setTimeout(() => window.location.assign(authUrl), 450);
  }

  function handleVideoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const url = URL.createObjectURL(file);
    setSelectedVideo({
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type || "video/mp4",
      url,
      file
    });
    setDraftResult(null);
    setPublishResult(null);
    setPublishError("");
  }

  async function sendVideoToTikTok(mode: "draft" | "direct") {
    if (!selectedVideo || !canSubmit) {
      return;
    }

    setActiveAction(mode);
    setPublishError("");
    if (mode === "draft") {
      setDraftResult(null);
    } else {
      setPublishResult(null);
    }

    try {
      const params = new URLSearchParams({
        mode,
        title: caption,
        privacy_level: privacy,
        disable_comment: String(!allowComments),
        disable_duet: String(!allowDuet),
        disable_stitch: String(!allowStitch)
      });
      const response = await fetch(`${TIKTOK_REVIEW_API_BASE}/publish?${params.toString()}`, {
        method: "POST",
        headers: {
          "Content-Type": selectedVideo.type || "video/mp4"
        },
        body: selectedVideo.file
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || payload?.error || "TikTok upload failed.");
      }

      if (mode === "draft") {
        setDraftResult(payload);
      } else {
        setPublishResult(payload);
      }
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : "TikTok upload failed.");
    } finally {
      setActiveAction("");
    }
  }

  function disconnect() {
    window.localStorage.removeItem(TIKTOK_CONNECTED_KEY);
    setConnected(false);
    setDraftResult(null);
    setPublishResult(null);
    setPublishError("");
    setProfileLoaded(false);
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
            <div className="oauth-route-card">
              <span>Next screen</span>
              <strong>tiktok.com authorization</strong>
              <p>
                The creator sees TikTok's consent page before returning to
                {" "}
                <code>{TIKTOK_REDIRECT_URI}</code>.
              </p>
            </div>
            <div className="oauth-scope-list" aria-label="Requested TikTok scopes">
              {TIKTOK_SCOPES.map((scope) => (
                <span key={scope}>{scope}</span>
              ))}
            </div>
            <div className="workspace-cta-row">
              <button
                className="btn btn-primary"
                disabled={oauthRedirecting}
                type="button"
                onClick={connectTikTok}
              >
                {oauthRedirecting ? "Opening TikTok..." : "Continue to TikTok authorization"}
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
                  <h2>@{creator.username}</h2>
                </div>
                <span className={`workspace-pill ${profileLoaded ? "success" : "warning"}`}>
                  {profileLoaded ? "Live API" : "Loading"}
                </span>
              </div>
              <div className="app-demo-profile">
                <div className="app-demo-avatar">LR</div>
                <div>
                  <strong>{creator.displayName}</strong>
                  <p>{creator.bio}</p>
                </div>
              </div>
              {profileError ? <p className="workspace-note">{profileError}</p> : null}
              <ul className="workspace-metric-list">
                <li>
                  <span>Avatar, display name, masked open_id</span>
                  <strong>user.info.basic</strong>
                </li>
                <li>
                  <span>
                    Bio, profile link, verified
                    <br />
                    {creator.profileWebLink}
                  </span>
                  <strong>user.info.profile</strong>
                </li>
                <li>
                  <span>
                    {creator.followers} followers / {creator.likes} likes / {creator.videoCount} videos
                  </span>
                  <strong>user.info.stats</strong>
                </li>
                <li>
                  <span>Open ID</span>
                  <strong>{creator.openId}</strong>
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
                {recentVideos.length > 0 ? (
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
                ) : (
                  <div className="workspace-empty-state">
                    <strong>0 public videos returned</strong>
                    <p>
                      The sandbox account is private. video.list still succeeds and returns an empty
                      public-video list for duplicate checks.
                    </p>
                  </div>
                )}
              </section>

              <section className="app-demo-card">
                <div className="workspace-panel-head">
                  <div>
                    <p className="workspace-panel-kicker">Selected clip</p>
                    <h2>Prepare TikTok action</h2>
                  </div>
                  <span className={`workspace-pill ${profileLoaded ? "success" : "warning"}`}>
                    {profileLoaded ? "creator_info.loaded" : "loading creator_info"}
                  </span>
                </div>

                <div className="workspace-preview">
                  <div className="workspace-preview-media">
                    {selectedVideo ? (
                      <video controls muted playsInline src={selectedVideo.url} />
                    ) : (
                      <span>9:16 preview</span>
                    )}
                  </div>
                  <div className="workspace-preview-body">
                    <label className="app-demo-label">
                      Upload video file
                      <input accept="video/mp4,video/quicktime,video/*" type="file" onChange={handleVideoSelected} />
                    </label>
                    {selectedVideo ? (
                      <div className="workspace-upload-summary">
                        <strong>{selectedVideo.name}</strong>
                        <span>
                          {selectedVideo.type} · {selectedVideo.size}
                        </span>
                      </div>
                    ) : (
                      <p className="workspace-note">
                        Choose a vertical MP4/MOV clip before sending it to TikTok as a draft or direct post.
                      </p>
                    )}

                    <label className="app-demo-label">
                      Editable caption
                      <textarea value={caption} onChange={(event) => setCaption(event.target.value)} />
                    </label>

                    <label className="app-demo-label">
                      Privacy from creator_info
                      <select value={privacy} onChange={(event) => setPrivacy(event.target.value)}>
                        <option value="">Select privacy</option>
                        {creatorInfo.privacyOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="app-demo-checks">
                      <label>
                        <input
                          checked={allowComments}
                          disabled={creatorInfo.commentDisabled}
                          onChange={(event) => setAllowComments(event.target.checked)}
                          type="checkbox"
                        />
                        Allow comments
                      </label>
                      <label>
                        <input
                          checked={allowDuet}
                          disabled={creatorInfo.duetDisabled}
                          onChange={(event) => setAllowDuet(event.target.checked)}
                          type="checkbox"
                        />
                        Allow duet
                      </label>
                      <label>
                        <input
                          checked={allowStitch}
                          disabled={creatorInfo.stitchDisabled}
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

                    {publishError ? <p className="workspace-note error">{publishError}</p> : null}

                    <div className="workspace-cta-row">
                      <button
                        className="btn btn-outline"
                        disabled={!canSubmit}
                        type="button"
                        onClick={() => sendVideoToTikTok("draft")}
                      >
                        {activeAction === "draft" ? "Uploading draft..." : "Upload as TikTok draft"}
                      </button>
                      <button
                        className="btn btn-primary"
                        disabled={!canSubmit}
                        type="button"
                        onClick={() => sendVideoToTikTok("direct")}
                      >
                        {activeAction === "direct" ? "Publishing..." : "Confirm and publish to TikTok"}
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
                        <p>Returned by the Adoptan server after calling TikTok APIs.</p>
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
