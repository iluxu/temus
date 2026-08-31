"use client";

import { useEffect, useState } from "react";

const TIKTOK_REVIEW_API_BASE = "https://api.adoptan.ai/tiktok-review";
const TIKTOK_REDIRECT_URI = "https://adoptan.ai/web/callback/";
const SIGNED_IN_KEY = "adoptan.workspace.signed_in";
const TIKTOK_CONNECTED_KEY = "adoptan.workspace.tiktok_connected";
const TIKTOK_CODE_VERIFIER_STORAGE = "adoptan.workspace.tiktok_code_verifier";
const TIKTOK_STATE_STORAGE = "adoptan.workspace.tiktok_state";
const TIKTOK_ACCOUNT_STORAGE = "adoptan.workspace.tiktok_account";
const DEFAULT_TIKTOK_ACCOUNT_ID = "luciamucciareplay";

type CallbackPayload = {
  codePresent: boolean;
  state: string | null;
  stateValid: boolean | null;
  scopes: string | null;
  error: string | null;
  errorDescription: string | null;
  exchangeStatus: "idle" | "exchanging" | "completed" | "failed";
  exchangeMessage: string | null;
};

export default function TikTokCallbackPage() {
  const [accountId, setAccountId] = useState(DEFAULT_TIKTOK_ACCOUNT_ID);
  const [payload, setPayload] = useState<CallbackPayload>({
    codePresent: false,
    state: null,
    stateValid: null,
    scopes: null,
    error: null,
    errorDescription: null,
    exchangeStatus: "idle",
    exchangeMessage: null
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const hasCode = Boolean(code);
    const state = params.get("state");
    const expectedState = window.sessionStorage.getItem(TIKTOK_STATE_STORAGE);
    const codeVerifier = window.sessionStorage.getItem(TIKTOK_CODE_VERIFIER_STORAGE);
    const selectedAccountId =
      String(window.sessionStorage.getItem(TIKTOK_ACCOUNT_STORAGE) || DEFAULT_TIKTOK_ACCOUNT_ID)
        .trim()
        .toLowerCase()
        .replace(/^@+/, "") || DEFAULT_TIKTOK_ACCOUNT_ID;
    setAccountId(selectedAccountId);
    const stateValid = expectedState ? expectedState === state : null;

    setPayload({
      codePresent: hasCode,
      state,
      stateValid,
      scopes: params.get("scopes") || params.get("scope"),
      error: params.get("error"),
      errorDescription: params.get("error_description"),
      exchangeStatus: hasCode ? "exchanging" : "idle",
      exchangeMessage: hasCode ? "Exchanging the TikTok authorization code on the Adoptan server." : null
    });

    if (!hasCode || params.get("error")) {
      return;
    }

    if (stateValid === false) {
      setPayload((current) => ({
        ...current,
        exchangeStatus: "failed",
        exchangeMessage: "OAuth state mismatch. Return to the workspace and start TikTok authorization again."
      }));
      return;
    }

    if (!codeVerifier) {
      setPayload((current) => ({
        ...current,
        exchangeStatus: "failed",
        exchangeMessage: "Missing PKCE verifier. Return to the workspace and start TikTok authorization again in the same browser tab."
      }));
      return;
    }

    fetch(`${TIKTOK_REVIEW_API_BASE}/oauth/exchange`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        code,
        codeVerifier,
        redirectUri: TIKTOK_REDIRECT_URI,
        accountId: selectedAccountId
      })
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok || !body?.ok) {
          throw new Error(body?.message || body?.error || "TikTok token exchange failed.");
        }
        window.localStorage.setItem(SIGNED_IN_KEY, "1");
        window.localStorage.setItem(TIKTOK_CONNECTED_KEY, "1");
        setPayload((current) => ({
          ...current,
          exchangeStatus: "completed",
          exchangeMessage: "Server token exchange completed. The workspace can now load creator_info."
        }));
      })
      .catch((error) => {
        setPayload((current) => ({
          ...current,
          exchangeStatus: "failed",
          exchangeMessage: error instanceof Error ? error.message : "TikTok token exchange failed."
        }));
      });
  }, []);

  const hasCode = payload.codePresent;
  const hasError = Boolean(payload.error);
  const connectionComplete = payload.exchangeStatus === "completed";
  const connectionFailed = hasError || payload.exchangeStatus === "failed";

  return (
    <main className="callback-page">
      <div className="callback-card">
        <div className="callback-kicker">adoptan.ai / TikTok Login Kit</div>
        <h1>
          {connectionFailed
            ? "TikTok connection failed"
            : connectionComplete
              ? "TikTok account connected"
              : hasCode
                ? "Connecting TikTok account"
                : "Waiting for TikTok callback"}
        </h1>
        <p className="callback-lead">
          {connectionFailed
            ? "TikTok returned an error to the web callback. The user can return to the workspace and retry the connection."
            : connectionComplete
              ? "TikTok redirected back to adoptan.ai and the server token exchange completed. The workspace can now show the connected account and publishing controls."
              : hasCode
                ? "TikTok redirected back to adoptan.ai after consent. Adoptan is exchanging the authorization code before enabling the workspace."
              : "This page is the redirect target used after TikTok authorization for the adoptan.ai web workflow."}
        </p>

        <div className="callback-grid">
          <div className="callback-field">
            <span>Status</span>
            <strong>{connectionFailed ? "error" : connectionComplete ? "connected" : hasCode ? "exchanging" : "idle"}</strong>
          </div>
          <div className="callback-field">
            <span>Authorization result</span>
            <strong>{hasCode ? "approved" : "pending"}</strong>
          </div>
          <div className="callback-field">
            <span>Security check</span>
            <strong>{payload.stateValid === null ? "pending" : payload.stateValid ? "valid" : "mismatch"}</strong>
          </div>
          <div className="callback-field">
            <span>Workspace access</span>
            <strong>{connectionComplete ? "enabled" : "locked"}</strong>
          </div>
          <div className="callback-field">
            <span>Scopes returned</span>
            <strong>{payload.scopes || "not returned"}</strong>
          </div>
          <div className="callback-field">
            <span>Next action</span>
            <strong>{connectionComplete ? "continue" : hasCode ? "wait" : "authorize"}</strong>
          </div>
        </div>

        <div className="callback-panel">
          <p className="callback-panel-title">Connection summary</p>
          <p>
            {payload.exchangeMessage ||
              (hasError
              ? payload.errorDescription || payload.error || "The TikTok connection was not completed."
              : hasCode
                ? "TikTok consent completed. Waiting for server token exchange before continuing."
                : "Waiting for TikTok to return the authorization result.")}
          </p>
        </div>

        <div className="callback-actions">
          <a
            aria-disabled={!connectionComplete}
            className={`btn btn-primary${connectionComplete ? "" : " disabled"}`}
            href={
              connectionComplete
                ? `/app?connected=1&account=${encodeURIComponent(accountId)}`
                : "#"
            }
          >
            {connectionComplete ? "Continue to workspace" : "Waiting for server exchange"}
          </a>
          <a className="btn btn-outline" href="/">
            Back to adoptan.ai
          </a>
        </div>
      </div>
    </main>
  );
}
