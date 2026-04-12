"use client";

import { useEffect, useState } from "react";

type CallbackPayload = {
  code: string | null;
  state: string | null;
  error: string | null;
  errorDescription: string | null;
};

export default function TikTokCallbackPage() {
  const [payload, setPayload] = useState<CallbackPayload>({
    code: null,
    state: null,
    error: null,
    errorDescription: null
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPayload({
      code: params.get("code"),
      state: params.get("state"),
      error: params.get("error"),
      errorDescription: params.get("error_description")
    });
  }, []);

  const hasCode = Boolean(payload.code);
  const hasError = Boolean(payload.error);

  return (
    <main className="callback-page">
      <div className="callback-card">
        <div className="callback-kicker">adoptan.ai / TikTok Login Kit</div>
        <h1>{hasError ? "TikTok connection failed" : hasCode ? "TikTok account connected" : "Waiting for TikTok callback"}</h1>
        <p className="callback-lead">
          {hasError
            ? "TikTok returned an error to the web callback. The operator should review the error details below."
            : hasCode
              ? "TikTok redirected back to the web callback with an authorization code. The next step is exchanging it server-side."
              : "This page is the redirect target used after TikTok authorization for the adoptan.ai web workflow."}
        </p>

        <div className="callback-grid">
          <div className="callback-field">
            <span>Status</span>
            <strong>{hasError ? "error" : hasCode ? "code_received" : "idle"}</strong>
          </div>
          <div className="callback-field">
            <span>Code present</span>
            <strong>{hasCode ? "yes" : "no"}</strong>
          </div>
          <div className="callback-field">
            <span>State present</span>
            <strong>{payload.state ? "yes" : "no"}</strong>
          </div>
        </div>

        <div className="callback-panel">
          <p className="callback-panel-title">Returned parameters</p>
          <pre className="callback-pre">
{JSON.stringify(
  {
    code: payload.code ? `${payload.code.slice(0, 12)}...` : null,
    state: payload.state,
    error: payload.error,
    error_description: payload.errorDescription
  },
  null,
  2
)}
          </pre>
        </div>

        <div className="callback-actions">
          <a className="btn btn-primary" href="/web/">
            Back to web workspace
          </a>
          <a className="btn btn-outline" href="/">
            Back to adoptan.ai
          </a>
        </div>
      </div>
    </main>
  );
}
