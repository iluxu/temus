"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./demo.module.css";
import { replayData as D } from "./replay-data";

/* --------------------------------------------------------------- formatage */
/* Tout est formaté à la main depuis l'ISO UTC : le rendu ne dépend ni du
   fuseau ni de la locale du navigateur, donc le rejeu reste identique. */

const MONTHS = [
  "janv.", "févr.", "mars", "avril", "mai", "juin",
  "juill.", "août", "sept.", "oct.", "nov.", "déc."
];

function parts(iso: string) {
  const d = new Date(iso);
  return {
    day: d.getUTCDate(),
    month: MONTHS[d.getUTCMonth()],
    year: d.getUTCFullYear(),
    h: String(d.getUTCHours()).padStart(2, "0"),
    m: String(d.getUTCMinutes()).padStart(2, "0"),
    s: String(d.getUTCSeconds()).padStart(2, "0")
  };
}

const dateOf = (iso: string) => {
  const p = parts(iso);
  return `${p.day} ${p.month} ${p.year}`;
};
const clockOf = (iso: string) => {
  const p = parts(iso);
  return `${p.h}:${p.m}:${p.s}`;
};
const stampOf = (iso: string) => `${dateOf(iso)} · ${clockOf(iso)} UTC`;

function clockAt(baseIso: string, offsetSeconds: number) {
  return clockOf(new Date(new Date(baseIso).getTime() + offsetSeconds * 1000).toISOString());
}

function elapsed(fromIso: string, toIso: string) {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  const total = Math.round(ms / 1000);
  if (total < 60) return `${total} s`;
  const min = Math.floor(total / 60);
  const sec = total % 60;
  if (min < 60) return sec ? `${min} min ${sec} s` : `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${String(min % 60).padStart(2, "0")}`;
}

const mmss = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const hhmmss = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(
    s % 60
  ).padStart(2, "0")}`;
};

const num = (n: number) => n.toLocaleString("fr-FR").replace(/ | /g, " ");

/* ------------------------------------------------------------------ étapes */

type StageKind = "source" | "compare" | "vertical" | "proof";

type Step = {
  id: string;
  tab: string;
  kicker: string;
  title: string;
  lede: string;
  stage: StageKind;
  seconds: number;
};

const STEPS: Step[] = [
  {
    id: "live",
    tab: "Le live",
    kicker: "Étape 1 · La source",
    title: "Un live de Lucia, écouté en continu",
    lede:
      "Sentinelle transcrit le live par tranches de 10 secondes et lit le chat en parallèle. Voici le passage brut, tel qu'il est sorti du flux Twitch.",
    stage: "source",
    seconds: 25
  },
  {
    id: "moment",
    tab: "Le moment",
    kicker: "Étape 2 · La sélection",
    title: "Pourquoi ce passage et pas un autre",
    lede:
      "Le radar note la fenêtre, propose des points d'entrée et de sortie, et écrit sa justification éditoriale. Rien n'est coupé sans raison écrite.",
    stage: "source",
    seconds: 30
  },
  {
    id: "montage",
    tab: "Le montage",
    kicker: "Étape 3 · La transformation",
    title: "Du 16:9 au vertical sous-titré",
    lede:
      "Même passage, deux formats. À droite, le rendu réellement publié : cadrage vertical, fond flouté, accroche et sous-titres calés au mot.",
    stage: "compare",
    seconds: 35
  },
  {
    id: "validation",
    tab: "La validation",
    kicker: "Étape 4 · La décision humaine",
    title: "Caption, compte, file d'attente",
    lede:
      "Sentinelle prépare tout et s'arrête là. Un humain ouvre le bloc, lit, et approuve clip par clip. Le reçu enregistre qui a validé quoi, quand.",
    stage: "vertical",
    seconds: 30
  },
  {
    id: "publication",
    tab: "La publication",
    kicker: "Étape 5 · Le résultat",
    title: "Publié sur TikTok, puis mesuré",
    lede:
      "Ce clip est en ligne. L'API TikTok a confirmé la publication, puis relevé les compteurs à 5 minutes, 1 heure et 24 heures.",
    stage: "vertical",
    seconds: 30
  },
  {
    id: "preuves",
    tab: "Les preuves",
    kicker: "Étape 6 · Ce qui est prouvé",
    title: "Temps machine, temps humain, pilote",
    lede:
      "Toute la chaîne tient dans des journaux datés. Voici ce qu'ils disent, et ce qu'ils ne disent pas encore.",
    stage: "proof",
    seconds: 30
  }
];

const TOTAL_SECONDS = STEPS.reduce((a, s) => a + s.seconds, 0);

/* ------------------------------------------------------------- sous-blocs  */

function Fact({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className={styles.fact}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : null}
    </div>
  );
}

function Source({ children }: { children: React.ReactNode }) {
  return <p className={styles.source}>{children}</p>;
}

/** Courbe de chaleur du chat sur tout le live, un point par tranche de 10 s. */
function HeatCurve({ markStart, markEnd }: { markStart: number; markEnd: number }) {
  const pts = D.heat;
  const w = 1000;
  const h = 120;
  const maxT = pts[pts.length - 1].t + D.stream.chunkSeconds;
  const maxS = Math.max(...pts.map((p) => p.score));
  const x = (t: number) => (t / maxT) * w;
  const y = (s: number) => h - (s / maxS) * (h - 12) - 6;
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.score).toFixed(1)}`).join("");
  const area = `${line}L${w},${h}L0,${h}Z`;
  return (
    <figure className={styles.heat}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img"
        aria-label={`Chaleur du chat sur ${hhmmss(maxT)} de live. Pic à ${D.moment.chatHeat.score} sur la fenêtre retenue.`}>
        <rect className={styles.heatMark} x={x(markStart)} y="0" width={Math.max(3, x(markEnd) - x(markStart))} height={h} />
        <path className={styles.heatArea} d={area} />
        <path className={styles.heatLine} d={line} />
      </svg>
      <figcaption>
        <span>00:00:00</span>
        <span className={styles.heatPeak}>
          passage retenu · {hhmmss(markStart)}
        </span>
        <span>{hhmmss(maxT)}</span>
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------- composant  */

export default function DemoExperience() {
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [stepProgress, setStepProgress] = useState(0); // 0 → 1 dans l'étape
  const [muted, setMuted] = useState(true);
  const [compareMode, setCompareMode] = useState<"both" | "source" | "vertical">("both");
  const [videoTime, setVideoTime] = useState(0);
  const [installReady, setInstallReady] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);

  const sourceRef = useRef<HTMLVideoElement | null>(null);
  const verticalRef = useRef<HTMLVideoElement | null>(null);
  const installEvent = useRef<any>(null);
  const rafRef = useRef<number | null>(null);

  const step = STEPS[stepIndex];
  const stepStartSeconds = useMemo(
    () => STEPS.slice(0, stepIndex).reduce((a, s) => a + s.seconds, 0),
    [stepIndex]
  );

  const goTo = useCallback((index: number) => {
    setStepIndex(((index % STEPS.length) + STEPS.length) % STEPS.length);
    setStepProgress(0);
  }, []);

  const restart = useCallback(() => {
    setStepIndex(0);
    setStepProgress(0);
    setPlaying(true);
    for (const v of [sourceRef.current, verticalRef.current]) {
      if (v) v.currentTime = 0;
    }
  }, []);

  /* Horloge du rejeu : une seule boucle, indépendante des vidéos, pour que la
     progression des étapes soit la même à chaque passage. */
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;
      setStepProgress((p) => {
        const next = p + delta / step.seconds;
        if (next >= 1) {
          if (stepIndex < STEPS.length - 1) {
            setStepIndex(stepIndex + 1);
            return 0;
          }
          setPlaying(false);
          return 1;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, stepIndex, step.seconds]);

  /* Les vidéos suivent l'étape courante et l'état de lecture. */
  useEffect(() => {
    const wantsSource = step.stage === "source" || step.stage === "compare";
    const wantsVertical = step.stage === "vertical" || step.stage === "compare";
    const drive = (video: HTMLVideoElement | null, wanted: boolean) => {
      if (!video) return;
      if (wanted && playing) {
        const p = video.play();
        if (p && typeof p.catch === "function") p.catch(() => undefined);
      } else {
        video.pause();
      }
    };
    drive(sourceRef.current, wantsSource);
    drive(verticalRef.current, wantsVertical);
  }, [stepIndex, playing, step.stage]);

  /* Suivi du mot actif dans les sous-titres. */
  useEffect(() => {
    if (step.stage !== "compare" || !playing) return;
    let frame = 0;
    const read = () => {
      const v = verticalRef.current;
      if (v) setVideoTime(v.currentTime);
      frame = requestAnimationFrame(read);
    };
    frame = requestAnimationFrame(read);
    return () => cancelAnimationFrame(frame);
  }, [step.stage, playing]);

  /* Clavier : espace, flèches, home. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.key === " " || event.key === "k") {
        event.preventDefault();
        setPlaying((p) => !p);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(stepIndex + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(stepIndex - 1);
      } else if (event.key === "Home" || event.key === "r") {
        event.preventDefault();
        restart();
      } else if (event.key === "m") {
        setMuted((m) => !m);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, restart, stepIndex]);

  /* PWA : service worker dédié à la démo, installation. */
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sentinelle-demo-sw.js", { scope: "/sentinelle/demo" })
      .then((reg) => {
        setOfflineReady(Boolean(reg.active || reg.installing || reg.waiting));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      installEvent.current = event;
      setInstallReady(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const install = () => {
    const event = installEvent.current;
    if (!event) return;
    event.prompt();
    setInstallReady(false);
  };

  const globalProgress = (stepStartSeconds + stepProgress * step.seconds) / TOTAL_SECONDS;

  const hero = D.queue.find((q) => q.slug === "bambi-tilt")!;
  const heroPublication = D.publications.find((p) => p.itemId === hero.id)!;
  const heroLast = heroPublication.snapshots[heroPublication.snapshots.length - 1];

  const activeWordIndex = D.render.words.findIndex(
    (w) => videoTime >= w.start && videoTime < w.end
  );

  const totals = useMemo(() => {
    const day = D.publications
      .map((p) => p.snapshots.find((s) => s.delayMinutes === 1440))
      .filter(Boolean) as { views: number; likes: number; shares: number }[];
    return {
      posts: D.publications.length,
      views: day.reduce((a, s) => a + s.views, 0),
      likes: day.reduce((a, s) => a + s.likes, 0),
      seconds: D.queue.reduce((a, q) => a + q.durationSec, 0)
    };
  }, []);

  return (
    <div className={styles.shell}>
      <div className={styles.ambient} aria-hidden />

      {/* ------------------------------------------------------------ entête */}
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span aria-hidden>✦</span>
          <div>
            <strong>Sentinelle</strong>
            <small>Les lives deviennent des clips prêts à publier</small>
          </div>
        </div>
        <p className={styles.replayBadge}>
          <i aria-hidden />
          Replay de démo
          <span>cas réel du {dateOf(D.stream.startedAt)}</span>
        </p>
        <div className={styles.topActions}>
          {installReady ? (
            <button type="button" className={styles.ghostButton} onClick={install}>
              Installer
            </button>
          ) : null}
          <button
            type="button"
            className={styles.ghostButton}
            onClick={() => setMuted((m) => !m)}
            aria-pressed={!muted}
          >
            {muted ? "Son coupé" : "Son actif"}
          </button>
        </div>
      </header>

      {/* ------------------------------------------------------------ étapes */}
      <nav className={styles.rail} aria-label="Étapes du parcours">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={i === stepIndex ? styles.railActive : undefined}
            aria-current={i === stepIndex ? "step" : undefined}
            onClick={() => goTo(i)}
          >
            <b>{i + 1}</b>
            <span>{s.tab}</span>
            <i style={{ transform: `scaleX(${i < stepIndex ? 1 : i === stepIndex ? stepProgress : 0})` }} aria-hidden />
          </button>
        ))}
      </nav>

      <main className={styles.stageGrid}>
        {/* ------------------------------------------------------- média */}
        <section className={styles.stage} aria-label="Média principal">
          {step.stage === "proof" ? (
            <ProofBoard totals={totals} />
          ) : (
            <div
              className={
                step.stage === "compare"
                  ? `${styles.players} ${styles[`players_${compareMode}`]}`
                  : styles.players
              }
            >
              {(step.stage === "source" || step.stage === "compare") && (
                <figure className={`${styles.player} ${styles.playerSource}`}>
                  <div className={styles.playerHead}>
                    <span className={styles.tagRaw}>Extrait brut du live</span>
                    <small>1920 × 1080 · Twitch</small>
                  </div>
                  <video
                    ref={sourceRef}
                    className={styles.videoSource}
                    src="/sentinelle-demo/media/hero-source.mp4"
                    poster="/sentinelle-demo/media/poster-source.jpg"
                    muted={muted}
                    loop
                    playsInline
                    preload="auto"
                    aria-label="Extrait brut du live du 3 septembre 2026, 22 secondes"
                  />
                  {step.stage === "source" ? (
                    <figcaption className={styles.inOut}>
                      <span>VOD {hhmmss(D.moment.clipStartSeconds)}</span>
                      <em>
                        {stepIndex === 0
                          ? `tranche transcrite ${D.stream.chunkSeconds} s`
                          : `entrée ${hhmmss(D.moment.clipStartSeconds)} → sortie ${hhmmss(
                              D.moment.clipEndSeconds
                            )} · ${D.moment.clipDurationSeconds} s`}
                      </em>
                      <span>VOD {hhmmss(D.moment.clipEndSeconds)}</span>
                    </figcaption>
                  ) : null}
                </figure>
              )}

              {(step.stage === "vertical" || step.stage === "compare") && (
                <figure className={`${styles.player} ${styles.playerVertical}`}>
                  <div className={styles.playerHead}>
                    <span className={styles.tagRendered}>Montage publié</span>
                    <small>
                      {hero.width} × {hero.height} · {hero.durationSec.toFixed(1)} s
                    </small>
                  </div>
                  <video
                    ref={verticalRef}
                    className={styles.videoVertical}
                    src="/sentinelle-demo/media/hero-vertical.mp4"
                    poster="/sentinelle-demo/media/poster-bambi-tilt.jpg"
                    muted={muted}
                    loop
                    playsInline
                    preload="auto"
                    aria-label="Montage vertical sous-titré, 22 secondes"
                  />
                  {step.stage === "vertical" ? (
                    <figcaption className={styles.postedOn}>
                      Publié sur <b>@{hero.accountId}</b>
                    </figcaption>
                  ) : null}
                </figure>
              )}
            </div>
          )}

          {step.stage === "compare" ? (
            <div className={styles.compareTools}>
              <div className={styles.segmented} role="group" aria-label="Affichage de la comparaison">
                {(["both", "source", "vertical"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={compareMode === mode}
                    className={compareMode === mode ? styles.segmentedOn : undefined}
                    onClick={() => setCompareMode(mode)}
                  >
                    {mode === "both" ? "Les deux" : mode === "source" ? "Brut" : "Vertical"}
                  </button>
                ))}
              </div>
              <p className={styles.wordTrack} aria-live="off">
                {D.render.words.map((w, i) => (
                  <span key={`${w.start}-${i}`} className={i === activeWordIndex ? styles.wordOn : undefined}>
                    {w.text}{" "}
                  </span>
                ))}
              </p>
            </div>
          ) : null}
        </section>

        {/* ------------------------------------------------------ contexte */}
        <section className={styles.context} aria-label="Contexte de l'étape">
          <header className={styles.contextHead}>
            <span className={styles.kicker}>{step.kicker}</span>
            <h1>{step.title}</h1>
            <p>{step.lede}</p>
          </header>

          <div className={styles.contextBody}>
            {stepIndex === 0 ? <PanelLive /> : null}
            {stepIndex === 1 ? <PanelMoment /> : null}
            {stepIndex === 2 ? <PanelMontage /> : null}
            {stepIndex === 3 ? <PanelValidation /> : null}
            {stepIndex === 4 ? <PanelPublication hero={hero} publication={heroPublication} last={heroLast} /> : null}
            {stepIndex === 5 ? <PanelPilote totals={totals} /> : null}
          </div>
        </section>
      </main>

      {/* --------------------------------------------------------- transport */}
      <footer className={styles.transport}>
        <div className={styles.transportButtons}>
          <button type="button" onClick={restart} aria-label="Revenir au début" title="Revenir au début (R)">
            ⟲
          </button>
          <button type="button" onClick={() => goTo(stepIndex - 1)} aria-label="Étape précédente" title="Étape précédente (←)">
            ‹
          </button>
          <button
            type="button"
            className={styles.playButton}
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Mettre en pause" : "Lancer le rejeu"}
            title="Lecture / pause (espace)"
          >
            {playing ? "❚❚" : "▶"}
          </button>
          <button type="button" onClick={() => goTo(stepIndex + 1)} aria-label="Étape suivante" title="Étape suivante (→)">
            ›
          </button>
        </div>
        <div className={styles.transportBar}>
          <div className={styles.progressTrack}>
            <span style={{ transform: `scaleX(${globalProgress})` }} />
          </div>
          <div className={styles.transportMeta}>
            <span>
              {mmss(globalProgress * TOTAL_SECONDS)} / {mmss(TOTAL_SECONDS)}
            </span>
            <span className={styles.safety}>
              Démo hors ligne · aucune publication, aucun envoi
            </span>
            <span className={styles.kbd}>
              espace · ← → · R{offlineReady ? " · prêt hors connexion" : ""}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---------------------------------------------------------------- panneaux */

function PanelLive() {
  return (
    <>
      <div className={styles.facts}>
        <Fact label="Live" value={`${dateOf(D.stream.startedAt)} · ${clockOf(D.stream.startedAt)} UTC`} note={`flux ${D.stream.id}`} />
        <Fact label="Écoute" value={`${D.stream.processedChunks} tranches`} note={`${D.stream.chunkSeconds} s chacune, soit ${hhmmss(D.stream.processedChunks * D.stream.chunkSeconds)} de live`} />
        <Fact label="Transcription" value={D.stream.transcriptionModel} note={D.stream.transcriptionTransport} />
        <Fact label="Candidats retenus" value={num(D.stream.candidates)} note="sur cette session" />
      </div>

      <h2 className={styles.h2}>Le chat, mesuré en continu</h2>
      <HeatCurve markStart={D.moment.clipStartSeconds} markEnd={D.moment.clipEndSeconds} />
      <p className={styles.note}>
        Une valeur par tranche de {D.stream.chunkSeconds} s : volume de messages, participants uniques,
        questions, mots-clés de la chaîne. Le pic de cette session, {D.moment.chatHeat.score}, tombe sur
        le passage que Sentinelle a retenu.
      </p>

      <h2 className={styles.h2}>Ce que la machine a entendu</h2>
      <ol className={styles.chunks}>
        {D.window.map((c) => {
          const inClip =
            c.startSeconds >= D.moment.clipStartSeconds - 10 && c.startSeconds < D.moment.clipEndSeconds;
          return (
            <li key={c.index} className={inClip ? styles.chunkOn : undefined}>
              <span>{hhmmss(c.startSeconds)}</span>
              <p>{c.text}</p>
              <em>chat {c.chatScore}</em>
            </li>
          );
        })}
      </ol>
      <Source>
        Source : journal du radar, {D.stream.id} — chunks.jsonl et state.json, session du{" "}
        {dateOf(D.stream.startedAt)}.
      </Source>
    </>
  );
}

function PanelMoment() {
  const m = D.moment;
  return (
    <>
      <div className={styles.scoreRow}>
        <div className={styles.scoreDial}>
          <strong>{m.score}</strong>
          <span>score</span>
        </div>
        <div className={styles.scoreCopy}>
          <p>
            Seuil de candidature : <b>{m.minScore}</b>. Le passage passe à <b>{m.score}</b> et devient
            candidat, pas publication.
          </p>
          <small>
            Modèle de notation configuré : {m.scoringModel} · fenêtre {m.scoringWindowSeconds} s ·
            transcription {m.transcriptionModel}
          </small>
        </div>
      </div>

      <blockquote className={styles.quote}>
        {m.hook}
        <cite>accroche proposée par le radar</cite>
      </blockquote>

      <h2 className={styles.h2}>La justification, telle qu'elle a été écrite</h2>
      <dl className={styles.reasoning}>
        <dt>Angle</dt>
        <dd>{m.angle}</dd>
        <dt>Raison</dt>
        <dd>{m.reason}</dd>
        <dt>Risque signalé</dt>
        <dd>{m.risk}</dd>
      </dl>
      <ul className={styles.chips}>
        {m.signals.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>

      <h2 className={styles.h2}>Le chat sur la fenêtre retenue</h2>
      <div className={styles.facts}>
        <Fact label="Chaleur" value={String(m.chatHeat.score)} note={`fenêtre ${m.chatHeat.windowSeconds} s`} />
        <Fact label="Messages" value={String(m.chatHeat.messageCount)} note={`${m.chatHeat.uniqueChatters} participants`} />
        <Fact label="Questions" value={String(m.chatHeat.questionCount)} note={`${m.chatHeat.clipCommands} commande !clip`} />
        <Fact label="Découpe" value={`${m.clipDurationSeconds} s`} note={`${hhmmss(m.clipStartSeconds)} → ${hhmmss(m.clipEndSeconds)}`} />
      </div>
      <ul className={styles.chat}>
        {m.chat.map((c) => (
          <li key={c.at}>
            <span>{clockOf(c.at)}</span>
            <b>{c.user}</b>
            <p>{c.text}</p>
          </li>
        ))}
      </ul>
      <Source>
        Messages réels du chat public Twitch, horodatés dans le journal du candidat{" "}
        {m.clipId}. Détection enregistrée à {clockOf(m.detectedAt)} UTC, soit{" "}
        {elapsed(new Date(new Date(m.streamStartedAt).getTime() + m.clipEndSeconds * 1000).toISOString(), m.detectedAt)}{" "}
        après la fin du passage — latence du flux Twitch comprise.
      </Source>
    </>
  );
}

function PanelMontage() {
  const r = D.render;
  return (
    <>
      <div className={styles.facts}>
        <Fact label="Entrée" value="1920 × 1080" note="flux Twitch, 16:9" />
        <Fact label="Sortie" value={`${r.media.width} × ${r.media.height}`} note={`${r.encoding.codec} · ${r.encoding.frameRate} i/s`} />
        <Fact label="Sous-titres" value={`${r.subtitleWordCount} mots calés`} note={`couverture ${Math.round(r.timedWordCoverage * 100)} %`} />
        <Fact label="Durée" value={`${r.outputDurationSec.toFixed(1)} s`} note="aucune coupe interne" />
      </div>

      <h2 className={styles.h2}>Ce que le montage ajoute</h2>
      <ul className={styles.bullets}>
        <li>
          <b>Cadrage vertical</b> — le 16:9 est replacé au centre, le fond est rempli par une version
          floutée de la même image. Rien n'est recadré hors champ.
        </li>
        <li>
          <b>Accroche fixe</b> — « {r.overlay} », posée en haut, lisible sans son.
        </li>
        <li>
          <b>Sous-titres au mot</b> — préréglage {r.subtitlePreset}, suivi du mot actif{" "}
          {r.activeWordTracking ? "activé" : "désactivé"}, transcription {r.language}.
        </li>
      </ul>

      <h2 className={styles.h2}>La transcription retenue</h2>
      <ol className={styles.segments}>
        {r.segments.map((s) => (
          <li key={s.start}>
            <span>{s.start.toFixed(1)} s</span>
            <p>{s.text}</p>
          </li>
        ))}
      </ol>

      <Source>
        Rendu {r.renderId}, version de design {r.designVersion}, produit le {stampOf(r.renderedAt)}.
        Les deux vidéos affichées ici sont les fichiers réels, ré-encodés pour le web (H.264, CRF 30) :
        aucun recadrage, aucune coupe, aucun sous-titre ajouté ou retiré.
      </Source>
    </>
  );
}

function PanelValidation() {
  const hero = D.queue.find((q) => q.slug === "bambi-tilt")!;
  const settings = hero.settings!;
  const first = D.queue[0].approvedAt!;
  const last = D.queue[D.queue.length - 1].approvedAt!;
  return (
    <>
      <article className={styles.captionCard}>
        <header>
          <span className={styles.account}>@{hero.accountId}</span>
          <small>compte destinataire</small>
        </header>
        <p className={styles.captionText}>{D.render.caption}</p>
        <p className={styles.captionTitle}>{hero.title}</p>
        <ul className={styles.settings}>
          <li>
            Visibilité <b>{settings.privacyLevel === "PUBLIC_TO_EVERYONE" ? "publique" : settings.privacyLevel}</b>
          </li>
          <li>
            Commentaires <b>{settings.allowComments ? "ouverts" : "fermés"}</b>
          </li>
          <li>
            Duo / Stitch <b>{settings.allowDuet || settings.allowStitch ? "autorisés" : "refusés"}</b>
          </li>
          <li>
            Contenu IA déclaré <b>{settings.isAigc ? "oui" : "non"}</b>
          </li>
          <li>
            Droits musicaux confirmés <b>{settings.musicUsageConfirmed ? "oui" : "non"}</b>
          </li>
          <li>
            Consentement explicite <b>{settings.expressConsent ? "oui" : "non"}</b>
          </li>
        </ul>
      </article>

      <h2 className={styles.h2}>La file de validation</h2>
      <p className={styles.note}>
        Bloc « {D.block.title} », ouvert le {stampOf(D.block.createdAt)}. Huit clips, deux comptes.
        L'humain approuve un par un ; chaque approbation écrit un reçu horodaté avec l'empreinte du
        fichier validé.
      </p>
      <ul className={styles.queue}>
        {D.queue.map((q, i) => (
          <li key={q.id}>
            <img src={`/sentinelle-demo/media/poster-${q.slug}.jpg`} alt="" width={44} height={78} loading="lazy" />
            <div>
              <p>{q.title}</p>
              <small>
                @{q.accountId} · {q.durationSec.toFixed(0)} s · approuvé {clockOf(q.approvedAt!)} UTC
              </small>
            </div>
            <b>{i + 1}</b>
          </li>
        ))}
      </ul>
      <p className={styles.guard}>
        Cette démo n'écrit rien : aucun bouton ici n'appelle TikTok, n'envoie de mail ni ne publie.
      </p>
      <Source>
        Bloc {D.block.id} et reçus d'approbation. Les huit approbations s'étalent de{" "}
        {clockOf(first)} à {clockOf(last)} UTC, soit {elapsed(first, last)} de travail humain pour la
        totalité du bloc.
      </Source>
    </>
  );
}

function PanelPublication({
  hero,
  publication,
  last
}: {
  hero: (typeof D.queue)[number];
  publication: (typeof D.publications)[number];
  last: (typeof D.publications)[number]["snapshots"][number];
}) {
  const maxViews = Math.max(
    ...D.publications.map((p) => p.snapshots[p.snapshots.length - 1].views)
  );
  return (
    <>
      <div className={styles.facts}>
        <Fact label="Compte" value={`@${publication.accountId}`} note="publication directe" />
        <Fact label="Statut TikTok" value={hero.publishStatus === "PUBLISH_COMPLETE" ? "publié" : String(hero.publishStatus)} note={`post ${publication.postId}`} />
        <Fact label="Confirmé" value={`${clockOf(publication.confirmedAt)} UTC`} note={dateOf(publication.confirmedAt)} />
        <Fact label="Vues à 24 h" value={num(last.views)} note={`${num(last.likes)} j'aime`} />
      </div>

      <h2 className={styles.h2}>Relevés successifs de ce clip</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Relevé</th>
            <th>Horodatage</th>
            <th>Vues</th>
            <th>J'aime</th>
          </tr>
        </thead>
        <tbody>
          {publication.snapshots.map((s) => (
            <tr key={s.delayMinutes}>
              <td>{s.delayMinutes < 60 ? `${s.delayMinutes} min` : s.delayMinutes === 60 ? "1 h" : "24 h"}</td>
              <td>{clockOf(s.observedAt)} UTC</td>
              <td>{num(s.views)}</td>
              <td>{num(s.likes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.linkRow}>
        <a href={publication.publicUrl} target="_blank" rel="noopener noreferrer">
          Ouvrir la publication sur TikTok ↗
        </a>
        <small>lien public, ouvert dans un nouvel onglet</small>
      </p>

      <h2 className={styles.h2}>Les huit clips du bloc, à 24 heures</h2>
      <ul className={styles.bars}>
        {D.publications.map((p) => {
          const day = p.snapshots[p.snapshots.length - 1];
          const item = D.queue.find((q) => q.id === p.itemId)!;
          return (
            <li key={p.postId}>
              <span className={styles.barLabel}>@{p.accountId}</span>
              <span className={styles.barTrack}>
                <i style={{ width: `${Math.max(1.5, (day.views / maxViews) * 100)}%` }} />
              </span>
              <span className={styles.barValue}>
                {num(day.views)} vues · {num(day.likes)} j'aime
              </span>
              <small className={styles.barTitle}>{item.title.split(" #")[0]}</small>
            </li>
          );
        })}
      </ul>
      <p className={styles.note}>
        Le dernier clip du bloc plafonne à 10 vues. Il est laissé tel quel : la démo montre la
        distribution réelle, pas une sélection.
      </p>
      <Source>
        Relevés de l'API TikTok (video query) enregistrés à 5 minutes, 1 heure et 24 heures pour les
        huit publications du {dateOf(publication.confirmedAt)}. Ces chiffres décrivent la
        performance observée ; ils ne démontrent pas que le montage en est la cause.
      </Source>
    </>
  );
}

function PanelPilote({ totals }: { totals: { posts: number; views: number; likes: number; seconds: number } }) {
  const m = D.moment;
  const first = D.queue[0].approvedAt!;
  const last = D.queue[D.queue.length - 1].approvedAt!;
  return (
    <>
      <h2 className={styles.h2}>Temps machine, temps humain</h2>
      <ol className={styles.timeline}>
        <li>
          <span>{clockAt(m.streamStartedAt, m.clipStartSeconds)}</span>
          <p>
            <b>Le moment a lieu</b> — VOD {hhmmss(m.clipStartSeconds)}, live en cours.
          </p>
          <em>machine</em>
        </li>
        <li>
          <span>{clockOf(m.detectedAt)}</span>
          <p>
            <b>Candidat détecté et justifié</b> — score {m.score}, points d'entrée et de sortie
            proposés.
          </p>
          <em>machine</em>
        </li>
        <li>
          <span>{clockOf(D.render.renderedAt)}</span>
          <p>
            <b>Montage vertical rendu</b> — sous-titres calés, accroche, caption. Lancé en lot le même
            soir.
          </p>
          <em>machine</em>
        </li>
        <li>
          <span>{clockOf(D.block.createdAt)}</span>
          <p>
            <b>Bloc de validation ouvert</b> — huit clips prêts, deux comptes.
          </p>
          <em>machine</em>
        </li>
        <li className={styles.timelineHuman}>
          <span>
            {clockOf(first)} → {clockOf(last)}
          </span>
          <p>
            <b>Validation humaine</b> — {elapsed(first, last)} pour approuver les huit clips, soit{" "}
            {Math.round(
              (new Date(last).getTime() - new Date(first).getTime()) / 1000 / D.queue.length
            )}{" "}
            s par clip.
          </p>
          <em>humain</em>
        </li>
        <li>
          <span>{clockOf(D.publications[0].confirmedAt)}</span>
          <p>
            <b>Publications confirmées</b> — huit posts en ligne, mesure programmée.
          </p>
          <em>machine</em>
        </li>
      </ol>

      <h2 className={styles.h2}>Ce que ce cas prouve</h2>
      <div className={styles.facts}>
        <Fact label="Live traité" value={hhmmss(D.stream.processedChunks * D.stream.chunkSeconds)} note={`${D.stream.candidates} candidats`} />
        <Fact label="Publiés" value={`${totals.posts} clips`} note={`${Math.round(totals.seconds)} s de vertical`} />
        <Fact label="Vues à 24 h" value={num(totals.views)} note={`${num(totals.likes)} j'aime, cumul du bloc`} />
        <Fact label="Travail humain" value={elapsed(first, last)} note="pour tout le bloc" />
      </div>

      <h2 className={styles.h2}>Ce qui tourne déjà autour</h2>
      <ul className={styles.bullets}>
        <li>
          <b>Bibliothèque</b> — {num(D.library.renderedVariants)} clips rendus dans cette version de
          design, {num(D.library.clipDirectories)} dossiers de clips au total, sur{" "}
          {num(D.library.radarSessions)} sessions de radar.
        </li>
        <li>
          <b>Continuité Twitch → Discord</b> — {num(D.library.discordTotal)} notifications de clips
          suivies, dont {num(D.library.discordByStatus.sent)} envoyées à la communauté et{" "}
          {num(D.library.discordByStatus.blocked)} bloquées par les garde-fous. Dernière mise à jour :{" "}
          {stampOf(D.library.discordUpdatedAt)}.
        </li>
        <li>
          <b>Quatre comptes TikTok</b> connectés par OAuth, avec un reçu d'approbation par
          publication.
        </li>
      </ul>

      <h2 className={styles.h2}>Ce que nous cherchons</h2>
      <p className={styles.note}>
        Un pilote avec un créateur ou une agence qui diffuse en live plusieurs fois par semaine :
        Sentinelle branchée sur leur flux, leur file de validation, leurs comptes. Le premier marché
        est celui des créateurs et des agences ; les médias, les franchises et le commerce viendront
        après.
      </p>
      <p className={styles.limits}>
        <b>Ce que ce cas ne prouve pas encore.</b> Un seul créateur, un seul live, huit publications,
        des volumes de vues faibles. Aucune mesure de rétention ni de complétion : l'API ne renvoie
        que vues, j'aime, commentaires et partages. Le rendu a été lancé en lot le soir, pas en
        continu. Aucun client payant à ce jour.
      </p>
      <Source>
        Manifeste complet des fichiers sources et empreintes des médias :{" "}
        <a href="/sentinelle-demo/evidence-manifest.json" target="_blank" rel="noopener noreferrer">
          evidence-manifest.json
        </a>
      </Source>
    </>
  );
}

function ProofBoard({ totals }: { totals: { posts: number; views: number; likes: number } }) {
  const rows = [
    {
      k: "Détection",
      v: `score ${D.moment.score} · seuil ${D.moment.minScore}`,
      d: stampOf(D.moment.detectedAt),
      s: "journal du radar"
    },
    {
      k: "Montage",
      v: `${D.render.media.width}×${D.render.media.height} · ${D.render.subtitleWordCount} mots calés`,
      d: stampOf(D.render.renderedAt),
      s: "métadonnées de rendu"
    },
    {
      k: "Validation",
      v: `${D.queue.length} approbations humaines`,
      d: stampOf(D.queue[0].approvedAt!),
      s: "reçus d'approbation"
    },
    {
      k: "Publication",
      v: `${totals.posts} posts TikTok`,
      d: stampOf(D.publications[0].confirmedAt),
      s: "API TikTok"
    },
    {
      k: "Mesure",
      v: `${num(totals.views)} vues · ${num(totals.likes)} j'aime à 24 h`,
      d: stampOf(D.publications[0].snapshots[D.publications[0].snapshots.length - 1].observedAt),
      s: "API TikTok, video query"
    }
  ];
  return (
    <div className={styles.proof}>
      <p className={styles.proofKicker}>Un cas, cinq preuves datées</p>
      <h2>
        Live du {dateOf(D.stream.startedAt)} → {totals.posts} publications du{" "}
        {dateOf(D.publications[0].confirmedAt)}
      </h2>
      <ul>
        {rows.map((r) => (
          <li key={r.k}>
            <b>{r.k}</b>
            <strong>{r.v}</strong>
            <span>{r.d}</span>
            <em>{r.s}</em>
          </li>
        ))}
      </ul>
      <div className={styles.proofStrip} aria-label="Les huit clips publiés">
        {D.queue.map((q) => (
          <img key={q.id} src={`/sentinelle-demo/media/poster-${q.slug}.jpg`} alt="" width={58} height={103} loading="lazy" />
        ))}
      </div>
    </div>
  );
}
