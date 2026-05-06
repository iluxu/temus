"use client";

import { useEffect, useState } from "react";

type CallbackPayload = {
  codePresent: boolean;
  state: string | null;
  stateValid: boolean | null;
  scopes: string | null;
  error: string | null;
  errorDescription: string | null;
};

export default function TikTokCallbackPage() {
  const [payload, setPayload] = useState<CallbackPayload>({
    codePresent: false,
    state: null,
    stateValid: null,
    scopes: null,
    error: null,
    errorDescription: null
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const hasCode = Boolean(code);
    const state = params.get("state");
    const expectedState = window.sessionStorage.getItem("adoptan.workspace.tiktok_state");
    if (hasCode) {
      window.localStorage.setItem("adoptan.workspace.signed_in", "1");
      window.localStorage.setItem("adoptan.workspace.tiktok_connected", "1");
    }

    setPayload({
      codePresent: hasCode,
      state,
      stateValid: expectedState ? expectedState === state : null,
      scopes: params.get("scopes") || params.get("scope"),
      error: params.get("error"),
      errorDescription: params.get("error_description")
    });
  }, []);

  const hasCode = payload.codePresent;
  const hasError = Boolean(payload.error);

  return (
    <main className="callback-page">
      <div className="callback-card">
        <div className="callback-kicker">adoptan.ai / TikTok Login Kit</div>
        <h1>{hasError ? "TikTok connection failed" : hasCode ? "TikTok account connected" : "Waiting for TikTok callback"}</h1>
        <p className="callback-lead">
          {hasError
            ? "TikTok returned an error to the web callback. The user can return to the workspace and retry the connection."
            : hasCode
              ? "TikTok redirected back to adoptan.ai after the user approved the requested scopes. The workspace can now show the connected account and publishing controls."
              : "This page is the redirect target used after TikTok authorization for the adoptan.ai web workflow."}
        </p>

        <div className="callback-grid">
          <div className="callback-field">
            <span>Status</span>
            <strong>{hasError ? "error" : hasCode ? "connected" : "idle"}</strong>
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
            <strong>{hasCode ? "enabled" : "locked"}</strong>
          </div>
          <div className="callback-field">
            <span>Scopes returned</span>
            <strong>{payload.scopes || "not returned"}</strong>
          </div>
          <div className="callback-field">
            <span>Next action</span>
            <strong>{hasCode ? "continue" : "authorize"}</strong>
          </div>
        </div>

        <div className="callback-panel">
          <p className="callback-panel-title">Connection summary</p>
          <p>
            {hasError
              ? payload.errorDescription || payload.error || "The TikTok connection was not completed."
            : hasCode
              ? "TikTok consent completed. The user can continue to the workspace to inspect creator_info settings and confirm publishing."
                : "Waiting for TikTok to return the authorization result."}
          </p>
        </div>

        <div className="callback-actions">
          <a className="btn btn-primary" href="/app?connected=1">
            Continue to workspace
          </a>
          <a className="btn btn-outline" href="/">
            Back to adoptan.ai
          </a>
        </div>
      </div>
    </main>
  );
}
