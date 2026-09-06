"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./factory.module.css";

const API = "/api/factory";

/* ------------------------------------------------------------------ types */

type Account = {
  id: string;
  connected: boolean;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  followers?: number | null;
  videos?: number | null;
  error?: string;
};

type Clip = {
  id: string;
  clipId: string;
  viralRenderId: string;
  accountId: string;
  role: string;
  hook: string;
  caption: string;
  hashtags: string[];
  title: string;
  why: string;
  radarScore: number | null;
  chatHeat: { score: number; messages: number; chatters: number } | null;
  transcript: string;
  durationSec: number | null;
  framing?: string;
  status: string;
  previewUrl: string;
  posterUrl: string;
  postUrl: string;
  error: string;
  renderError: string;
};

type RunEvent = {
  at: string;
  stage: string;
  kind?: string;
  message?: string;
  clipId?: string;
  postUrl?: string;
};

type Run = {
  id: string;
  prompt: string;
  accountId: string;
  live: boolean;
  status: string;
  answer: string;
  notes: string;
  error: string;
  clips: Clip[];
  events: RunEvent[];
};

const SUGGESTIONS = [
  "Trouve 3 extraits où Bambi perturbe le live et publie-les",
  "Trouve 3 moments où Lucia a un avis tranché",
  "Trouve 3 extraits drôles sur l'argent et les restos"
];

/* ------------------------------------------------------------------ outils */

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Le score du radar est réel : on ne le convertit pas en pourcentage de viralité. */
function scoreBadge(score: number | null) {
  if (typeof score !== "number") return null;
  if (score >= 76) return { label: "Fort potentiel", tone: "hot" as const };
  if (score >= 72) return { label: "Bon candidat", tone: "warm" as const };
  return { label: "Candidat", tone: "cool" as const };
}

const ROLE_LABEL: Record<string, string> = {
  accroche: "Accroche",
  substance: "Substance",
  partage: "Partage"
};

/* -------------------------------------------------------------- composant */

export default function FactoryConsole() {
  const [prompt, setPrompt] = useState(SUGGESTIONS[0]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [run, setRun] = useState<Run | null>(null);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [backend, setBackend] = useState<"unknown" | "up" | "down">("unknown");
  const [live, setLive] = useState(false);
  const [fatal, setFatal] = useState("");

  const streamRef = useRef<EventSource | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);
  const startedAt = useRef<number>(0);
  const [elapsed, setElapsed] = useState(0);

  /* ------------------------------------------------------------- amorçage */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`${API}/accounts`, { cache: "no-store" });
        if (!response.ok) throw new Error(String(response.status));
        const payload = await response.json();
        if (cancelled) return;
        setAccounts(payload.accounts || []);
        setLive(Boolean(payload.live));
        setBackend("up");
        const first = (payload.accounts || []).find((item: Account) => item.connected);
        if (first) setAccountId(first.id);
      } catch {
        if (!cancelled) setBackend("down");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Chronomètre visible : on montre le temps réel, pas une animation décorative. */
  useEffect(() => {
    if (!busy && !publishing) return;
    const timer = setInterval(() => setElapsed((Date.now() - startedAt.current) / 1000), 100);
    return () => clearInterval(timer);
  }, [busy, publishing]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [events.length]);

  useEffect(() => () => streamRef.current?.close(), []);

  /* --------------------------------------------------------------- actions */

  const refreshRun = useCallback(async (runId: string) => {
    const response = await fetch(`${API}/runs/${runId}`, { cache: "no-store" });
    if (!response.ok) return null;
    const payload = await response.json();
    setRun(payload.run);
    return payload.run as Run;
  }, []);

  const listen = useCallback(
    (runId: string) => {
      streamRef.current?.close();
      const source = new EventSource(`${API}/runs/${runId}/events`);
      streamRef.current = source;
      source.onmessage = (message) => {
        let event: RunEvent;
        try {
          event = JSON.parse(message.data);
        } catch {
          return;
        }
        setEvents((current) => [...current.slice(-120), event]);
        if (["pret", "erreur", "fin", "proposition"].includes(event.stage)) {
          refreshRun(runId).then((updated) => {
            if (!updated) return;
            if (updated.status === "ready" || updated.status === "failed") setBusy(false);
            if (updated.status === "done") setPublishing(false);
          });
        }
        if (event.stage === "clip" && event.postUrl) refreshRun(runId);
      };
      source.onerror = () => {
        /* le flux se reconnecte seul ; l'état vient aussi du polling */
      };
    },
    [refreshRun]
  );

  const launch = useCallback(async () => {
    const text = prompt.trim();
    if (!text || busy) return;
    setFatal("");
    setEvents([]);
    setRun(null);
    setBusy(true);
    startedAt.current = Date.now();
    setElapsed(0);

    try {
      const response = await fetch(`${API}/runs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: text, count: 3, accountId })
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || payload.error || "échec");
      setRun(payload.run);
      listen(payload.run.id);
    } catch (error) {
      setBusy(false);
      setFatal(String((error as Error)?.message || error));
    }
  }, [prompt, busy, accountId, listen]);

  const publishAll = useCallback(async () => {
    if (!run || publishing) return;
    setPublishing(true);
    startedAt.current = Date.now();
    setElapsed(0);
    try {
      const response = await fetch(`${API}/runs/${run.id}/publish`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || payload.error || "échec");
    } catch (error) {
      setPublishing(false);
      setFatal(String((error as Error)?.message || error));
    }
  }, [run, publishing]);

  /* ----------------------------------------------------------------- vues */

  const ready = run?.status === "ready" || run?.status === "done";
  const clips = run?.clips || [];
  const published = clips.filter((clip) => clip.status === "publié");
  const account = accounts.find((item) => item.id === (run?.accountId || accountId));

  const phase = useMemo(() => {
    if (!run) return busy ? "Démarrage" : "";
    if (run.status === "worker") return "Le worker cherche";
    if (run.status === "montage") return "Montage vertical";
    if (run.status === "publishing") return "Publication";
    if (run.status === "done") return "Terminé";
    if (run.status === "failed") return "Échec";
    return "Prêt";
  }, [run, busy]);

  return (
    <div className={styles.shell}>
      <div className={styles.ambient} aria-hidden />

      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span aria-hidden>✦</span>
          <div>
            <strong>Sentinelle</strong>
            <small>Factory</small>
          </div>
        </div>

        <div className={styles.accountBar}>
          {backend === "down" ? (
            <span className={styles.badgeDown}>Moteur non joignable</span>
          ) : (
            <>
              <span className={live ? styles.badgeLive : styles.badgeRehearsal}>
                {live ? "Publication réelle" : "Répétition"}
              </span>
              <label className={styles.accountPicker}>
                <span className={styles.srOnly}>Compte de destination</span>
                <select
                  value={accountId}
                  onChange={(event) => setAccountId(event.target.value)}
                  disabled={busy || publishing}
                >
                  {accounts.map((item) => (
                    <option key={item.id} value={item.id} disabled={!item.connected}>
                      @{item.id}
                      {item.connected ? "" : " — non connecté"}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
      </header>

      <main className={styles.main}>
        {/* ------------------------------------------------------- prompt */}
        <section className={styles.promptZone} aria-label="Demande">
          {!run ? (
            <p className={styles.lede}>
              Dis ce que tu veux publier. Un worker cherche dans la bibliothèque, choisit,
              écrit l&apos;accroche, monte en vertical. Tu regardes, tu publies.
            </p>
          ) : null}

          <form
            className={styles.promptBox}
            onSubmit={(event) => {
              event.preventDefault();
              launch();
            }}
          >
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  launch();
                }
              }}
              rows={2}
              maxLength={400}
              placeholder="Trouve 3 extraits…"
              disabled={busy || backend === "down"}
              aria-label="Ta demande"
            />
            <button
              type="submit"
              className={styles.launch}
              disabled={busy || backend === "down" || !prompt.trim()}
            >
              {busy ? <i className={styles.spinner} aria-hidden /> : "Lancer"}
            </button>
          </form>

          {!run && backend !== "down" ? (
            <div className={styles.suggestions}>
              {SUGGESTIONS.map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => setPrompt(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}

          {backend === "down" ? (
            <p className={styles.downNote}>
              Le moteur local ne répond pas. Lance-le sur la machine qui porte le pipeline :
              <code>node src/sentinelle-factory-server.js</code> depuis
              <code>/home/ubuntu/luciamuccia</code>, puis recharge.
            </p>
          ) : null}

          {fatal ? <p className={styles.fatal}>{fatal}</p> : null}
        </section>

        {/* --------------------------------------------------- travail live */}
        {run || busy ? (
          <section className={styles.workZone} aria-label="Travail en cours">
            <header className={styles.workHead}>
              <span className={styles.phase}>
                {busy || publishing ? <i className={styles.pulse} aria-hidden /> : null}
                {phase}
              </span>
              {busy || publishing ? (
                <span className={styles.timer}>{elapsed.toFixed(1)} s</span>
              ) : null}
            </header>
            <div className={styles.feed} ref={feedRef}>
              {events.map((event, index) => (
                <p
                  key={`${event.at}-${index}`}
                  className={
                    event.kind === "erreur"
                      ? styles.feedError
                      : event.kind === "outil"
                        ? styles.feedTool
                        : undefined
                  }
                >
                  <span>{event.at.slice(11, 19)}</span>
                  {event.message}
                </p>
              ))}
              {!events.length ? <p className={styles.feedTool}>…</p> : null}
            </div>
          </section>
        ) : null}

        {/* --------------------------------------------------- proposition */}
        {run?.answer ? (
          <section className={styles.bubbleZone} aria-live="polite">
            <div className={styles.bubble}>
              <span className={styles.bubbleMark} aria-hidden>
                ✦
              </span>
              <div>
                <p>{run.answer}</p>
                {run.notes ? <small>{run.notes}</small> : null}
              </div>
            </div>
          </section>
        ) : null}

        {clips.length ? (
          <section className={styles.clips} aria-label="Clips proposés">
            {clips.map((clip) => {
              const badge = scoreBadge(clip.radarScore);
              return (
                <article
                  key={clip.id}
                  className={
                    clip.status === "publié"
                      ? `${styles.card} ${styles.cardPublished}`
                      : clip.renderError
                        ? `${styles.card} ${styles.cardFailed}`
                        : styles.card
                  }
                >
                  <div className={styles.frame}>
                    {clip.previewUrl ? (
                      <video
                        src={`${API}${clip.previewUrl}`}
                        poster={clip.posterUrl ? `${API}${clip.posterUrl}` : undefined}
                        muted
                        loop
                        playsInline
                        autoPlay
                        preload="metadata"
                        aria-label={`Aperçu : ${clip.hook}`}
                      />
                    ) : (
                      <div className={styles.framePending}>
                        <i className={styles.spinner} aria-hidden />
                        <span>{clip.renderError ? "Montage impossible" : "Montage…"}</span>
                      </div>
                    )}
                    <span className={styles.role}>{ROLE_LABEL[clip.role] || clip.role}</span>
                    {badge ? (
                      <span className={`${styles.badge} ${styles[`badge_${badge.tone}`]}`}>
                        {badge.tone === "hot" ? "🔥 " : ""}
                        {badge.label} · {clip.radarScore}
                      </span>
                    ) : null}
                  </div>

                  <div className={styles.cardBody}>
                    <h2>{clip.hook}</h2>
                    <p className={styles.caption}>{clip.caption}</p>
                    <p className={styles.tags}>{clip.hashtags.join(" ")}</p>

                    <dl className={styles.meta}>
                      <div>
                        <dt>Compte</dt>
                        <dd>@{clip.accountId}</dd>
                      </div>
                      <div>
                        <dt>Durée</dt>
                        <dd>{clip.durationSec ? `${clip.durationSec.toFixed(0)} s` : "—"}</dd>
                      </div>
                      <div>
                        <dt>Cadrage</dt>
                        <dd>{clip.framing === "face" ? "plein cadre" : clip.framing || "—"}</dd>
                      </div>
                      <div>
                        <dt>Chat</dt>
                        <dd>{clip.chatHeat ? clip.chatHeat.score : "—"}</dd>
                      </div>
                    </dl>

                    {clip.why ? <p className={styles.why}>{clip.why}</p> : null}

                    <footer className={styles.cardFoot}>
                      {clip.status === "publié" && clip.postUrl ? (
                        <a href={clip.postUrl} target="_blank" rel="noopener noreferrer">
                          Voir sur TikTok ↗
                        </a>
                      ) : (
                        <span className={styles.status}>{clip.error || clip.renderError || clip.status}</span>
                      )}
                    </footer>
                  </div>
                </article>
              );
            })}
          </section>
        ) : null}

        {ready && clips.length ? (
          <section className={styles.publishZone}>
            <button
              type="button"
              className={styles.publish}
              onClick={publishAll}
              disabled={publishing || published.length === clips.length}
            >
              {published.length === clips.length
                ? `${published.length} clips en ligne`
                : publishing
                  ? "Envoi en cours…"
                  : `Publier la sélection (${clips.length})`}
            </button>
            <p className={styles.publishNote}>
              {live ? (
                <>
                  Publication directe sur <b>@{account?.id || accountId}</b>. Public, commentaires
                  ouverts, duo et stitch fermés.
                </>
              ) : (
                <>
                  Le moteur tourne en <b>répétition</b> : le bouton parcourt toute la chaîne mais
                  n&apos;envoie rien à TikTok. Relance-le avec <code>--live</code> pour publier.
                </>
              )}
            </p>
          </section>
        ) : null}
      </main>
    </div>
  );
}
