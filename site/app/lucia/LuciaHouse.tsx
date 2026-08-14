"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  HousePublicV1,
  LuciaPresenceState,
  parseHousePublicV1
} from "./house-public";
import {
  HouseExperiencePublicV1,
  parseHouseExperiencePublicV1,
  PublicAnswerV1,
  ReplayControlAction
} from "./experience-public";
import styles from "./lucia.module.css";

const PUBLIC_HOUSE_ENDPOINT = "/api/lucia/v1/public/house";
const PUBLIC_EXPERIENCE_ENDPOINT = "/api/lucia/v1/public/experience";
const PUBLIC_ASK_ENDPOINT = "/api/lucia/v1/public/ask";
const PUBLIC_REPLAY_ENDPOINT = "/api/lucia/v1/public/replay/sessions";
const POLL_INTERVAL_MS = 30_000;
const PLAYING_POLL_INTERVAL_MS = 3_000;
const STALE_AFTER_MS = 5 * 60_000;
const REPLAY_SESSION_STORAGE_KEY = "maison-lucia-replay-session-v1";

const presenceCopy: Record<LuciaPresenceState, string> = {
  watching: "regarde le monde",
  working: "en mouvement",
  waiting: "en attente",
  sleeping: "au calme"
};

type RequestState = "loading" | "ready" | "refreshing" | "error";

type HouseView = {
  house: HousePublicV1;
  experience: HouseExperiencePublicV1 | null;
};

type BoundAnswer = {
  question: string;
  asOf: string;
  value: PublicAnswerV1;
};

type AskFailure = {
  question: string;
  message: string;
};

async function publicJson(
  endpoint: string,
  init: RequestInit,
  parser: (value: unknown) => HouseExperiencePublicV1
): Promise<HouseExperiencePublicV1> {
  const response = await fetch(endpoint, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {})
    },
    cache: "no-store"
  });
  if (!response.ok) throw new Error("Maison Lucia projection unavailable");
  return parser(await response.json());
}

async function fetchLiveView(): Promise<HouseView> {
  try {
    const experience = await publicJson(
      PUBLIC_EXPERIENCE_ENDPOINT,
      { method: "GET" },
      parseHouseExperiencePublicV1
    );
    return { house: experience.house, experience };
  } catch {
    const response = await fetch(PUBLIC_HOUSE_ENDPOINT, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    if (!response.ok) throw new Error("Maison Lucia heartbeat unavailable");
    return { house: parseHousePublicV1(await response.json()), experience: null };
  }
}

function formatMoment(value: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatClock(value: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatObservedAge(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  if (hours > 0) return `${hours} h ${minutes.toString().padStart(2, "0")} min`;
  return `${minutes} min ${remaining.toString().padStart(2, "0")} s`;
}

function SentinelMark({ active = false }: { active?: boolean }) {
  return (
    <div
      className={`${styles.sentinelMark} ${active ? styles.sentinelMarkActive : ""}`}
      aria-hidden="true"
    >
      <div className={styles.haloOuter} />
      <div className={styles.haloInner} />
      <svg viewBox="0 0 260 260" role="presentation">
        <path d="M44 148 92 82l68 17 51-52" />
        <path d="m92 82 20 91 48-74 48 72" />
        <circle cx="44" cy="148" r="4" />
        <circle cx="92" cy="82" r="6" />
        <circle cx="112" cy="173" r="4" />
        <circle cx="160" cy="99" r="5" />
        <circle cx="208" cy="171" r="4" />
        <circle cx="211" cy="47" r="3" />
      </svg>
      <span className={styles.guardianStar}>★</span>
      <span className={`${styles.spark} ${styles.sparkOne}`}>✦</span>
      <span className={`${styles.spark} ${styles.sparkTwo}`}>✦</span>
      <span className={`${styles.spark} ${styles.sparkThree}`}>·</span>
    </div>
  );
}

function Header({
  rooms = []
}: {
  rooms?: HousePublicV1["rooms"];
}) {
  return (
    <header className={styles.header}>
      <a className={styles.wordmark} href="#house" aria-label="Maison Lucia">
        <span className={styles.wordmarkStar}>★</span>
        <span>Maison Lucia</span>
      </a>
      <nav className={styles.nav} aria-label="Pièces de la Maison">
        {rooms.map((room) => (
          <a href={`#${room.slug}`} key={room.slug}>
            {room.name}
          </a>
        ))}
      </nav>
      <a className={styles.contractJump} href="#contract">
        Contract
      </a>
    </header>
  );
}

function ContractCard({ house }: { house: HousePublicV1["house"] }) {
  const { charter } = house;
  return (
    <aside className={styles.contractRail} id="contract" aria-labelledby="contract-title">
      <div className={styles.contractCard}>
        <div className={styles.contractHeading}>
          <div>
            <p className={styles.eyebrow}>Le cadre de la Maison</p>
            <h2 id="contract-title">Contract</h2>
          </div>
          <span className={styles.contractSeal} aria-hidden="true">
            ★
          </span>
        </div>

        <p className={styles.mission}>{charter.mission}</p>

        <ContractList title="Elle peut" items={charter.may} tone="may" />
        <ContractList
          title="Elle demande avant"
          items={charter.asks_before}
          tone="ask"
        />
        <ContractList title="Jamais" items={charter.never} tone="never" />
        <ContractList
          title="Une réussite, ici"
          items={charter.success_means}
          tone="success"
        />
      </div>
    </aside>
  );
}

function ContractList({
  title,
  items,
  tone
}: {
  title: string;
  items: string[];
  tone: "may" | "ask" | "never" | "success";
}) {
  return (
    <section className={`${styles.contractGroup} ${styles[`contract_${tone}`]}`}>
      <h3>{title}</h3>
      {items.length > 0 ? (
        <ul>
          {items.map((item, index) => (
            <li key={`${tone}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className={styles.emptyLine}>Rien de publié.</p>
      )}
    </section>
  );
}

function SentinelHero({
  data,
  mode
}: {
  data: HousePublicV1;
  mode: "live" | "replay" | "heartbeat";
}) {
  const updatedAt = formatMoment(data.presence.updated_at, data.house.locale);
  return (
    <section className={styles.hero} id="house" aria-labelledby="house-title">
      <div className={styles.heroCopy}>
        <div className={styles.modeLine}>
          <p className={styles.goodMorning}>
            {mode === "replay" ? "Back in time" : "Maison ouverte"}
          </p>
          {mode === "replay" ? (
            <span className={styles.historicalBadge}>Real historical data</span>
          ) : null}
        </div>
        <p className={styles.houseName}>{data.house.name}</p>
        <h1 id="house-title">Lucia’s Sentinel</h1>
        <p className={styles.heroLead}>
          {mode === "replay"
            ? "La même Sentinelle, dans une tranche réelle du passé. Le temps accélère; les preuves, elles, ne bougent pas."
            : "Une présence discrète au centre de la Maison. Le Contract garde la ligne; le réel décide du reste."}
        </p>
      </div>

      <SentinelMark
        active={
          data.presence.state === "watching" || data.presence.state === "working"
        }
      />

      <div className={styles.presence}>
        <span
          className={`${styles.presenceDot} ${styles[`presence_${data.presence.state}`]}`}
        />
        <span>
          Sentinel {presenceCopy[data.presence.state]}
          {mode === "replay" ? " · replay" : ""}
        </span>
        <span className={styles.presenceTime}>mis à jour {updatedAt}</span>
      </div>
    </section>
  );
}

function NowCard({
  data,
  experience,
  onStartReplay,
  replayStarting
}: {
  data: HousePublicV1;
  experience: HouseExperiencePublicV1 | null;
  onStartReplay: () => void;
  replayStarting: boolean;
}) {
  const now = data.now;
  const replay = experience?.mode === "replay";
  return (
    <section className={styles.nowCard} id="now" aria-labelledby="now-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>
            {replay ? "Temps virtuel · sources réelles" : "Signal vérifié"}
          </p>
          <h2 id="now-title">{replay ? "Then" : "Now"}</h2>
        </div>
        {now ? (
          <span className={`${styles.nowStatus} ${styles[`now_${now.status}`]}`}>
            <span />
            {now.status === "live" ? "En direct" : "Hors direct"}
          </span>
        ) : null}
      </div>

      {now === null ? (
        <div className={styles.emptyNow}>
          <span aria-hidden="true">✦</span>
          <div>
            <h3>Pas de signal public en ce moment.</h3>
            <p>La Maison reste ouverte, sans inventer d’activité.</p>
          </div>
        </div>
      ) : (
        <div className={styles.nowBody}>
          <div>
            <p className={styles.nowKind}>Stream</p>
            <h3>
              {now.title ??
                (now.status === "live" ? "Live en cours" : "Dernier live observé")}
            </h3>
            {now.category ? <p className={styles.category}>{now.category}</p> : null}
          </div>
          <dl className={styles.nowFacts}>
            <div>
              <dt>Source</dt>
              <dd>{now.source.label}</dd>
            </div>
            {now.started_at ? (
              <div>
                <dt>Début</dt>
                <dd>
                  <time dateTime={now.started_at}>
                    {formatMoment(now.started_at, data.house.locale)}
                  </time>
                </dd>
              </div>
            ) : null}
            {now.ended_at ? (
              <div>
                <dt>Fin</dt>
                <dd>
                  <time dateTime={now.ended_at}>
                    {formatMoment(now.ended_at, data.house.locale)}
                  </time>
                </dd>
              </div>
            ) : null}
          </dl>
          {now.public_url ? (
            <a className={styles.sourceLink} href={now.public_url} rel="noreferrer">
              Voir le signal <span aria-hidden="true">↗</span>
            </a>
          ) : null}
        </div>
      )}

      {!replay && now?.status !== "live" && experience?.capabilities.replay ? (
        <div className={styles.replayInvitation}>
          <div>
            <p className={styles.replayInvitationLabel}>La Maison est calme.</p>
            <p>Revivre une soirée réelle avec Lucia, en quatre minutes.</p>
          </div>
          <button
            type="button"
            onClick={onStartReplay}
            disabled={replayStarting}
          >
            {replayStarting ? "Retour dans le temps…" : "Replay a day with Lucia →"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function PublicSource({
  source,
  locale,
  atSeconds
}: {
  source: { label: string; occurred_at: string; url: string | null; sha256: string | null };
  locale: string;
  atSeconds?: number | null;
}) {
  const label = atSeconds === null || atSeconds === undefined
    ? source.label
    : `${source.label} · ${Math.floor(atSeconds / 60)}:${Math.floor(
        atSeconds % 60
      )
        .toString()
        .padStart(2, "0")}`;
  return (
    <li className={styles.sourceItem}>
      <span>
        {source.url ? (
          <a href={source.url} rel="noreferrer">
            {label} <span aria-hidden="true">↗</span>
          </a>
        ) : (
          label
        )}
      </span>
      <time dateTime={source.occurred_at}>
        {formatMoment(source.occurred_at, locale)}
      </time>
      {source.sha256 ? (
        <span className={styles.sourceHash}>preuve {source.sha256.slice(0, 10)}</span>
      ) : null}
    </li>
  );
}

function AskPanel({
  experience,
  answer,
  failure,
  onAsk,
  submitting
}: {
  experience: HouseExperiencePublicV1;
  answer: BoundAnswer | null;
  failure: AskFailure | null;
  onAsk: (question: string) => void;
  submitting: boolean;
}) {
  const [question, setQuestion] = useState("");
  const locale = experience.house.house.locale;
  const prompts = experience.mode === "replay"
    ? ["De quoi parle-t-elle ?", "Pourquoi ce clip ?", "Et après ?", "Garde-le"]
    : ["De quoi parle Lucia maintenant ?"];

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = question.trim();
    if (!value || submitting) return;
    onAsk(value);
  };

  return (
    <section className={styles.askCard} aria-labelledby="ask-title">
      <div className={styles.experienceHeading}>
        <div>
          <p className={styles.eyebrow}>Ask · contexte public seulement</p>
          <h2 id="ask-title">Parler avec Sentinel</h2>
        </div>
        <time className={styles.asOf} dateTime={experience.as_of}>
          as of {formatClock(experience.as_of, locale)}
        </time>
      </div>
      <form onSubmit={submit} className={styles.askForm}>
        <label htmlFor="lucia-question">Que veux-tu comprendre ?</label>
        <div className={styles.askComposer}>
          <input
            id="lucia-question"
            name="question"
            value={question}
            maxLength={500}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="De quoi parle Lucia ?"
            autoComplete="off"
          />
          <button type="submit" disabled={submitting || question.trim().length === 0}>
            {submitting ? "Je cherche…" : "Ask"}
          </button>
        </div>
      </form>
      <div className={styles.promptRow} aria-label="Questions suggérées">
        {prompts.map((prompt) => (
          <button
            type="button"
            key={prompt}
            disabled={submitting}
            onClick={() => {
              setQuestion(prompt);
              onAsk(prompt);
            }}
          >
            {prompt}
          </button>
        ))}
      </div>
      <div
        className={styles.answer}
        aria-live="polite"
        aria-busy={submitting}
        aria-atomic={failure ? "true" : undefined}
      >
        {failure ? (
          <div className={styles.answerError} id="lucia-ask-error" role="alert">
            <strong>La réponse n’a pas pu être vérifiée.</strong>
            <p>Question : « {failure.question} »</p>
            <p>{failure.message}</p>
          </div>
        ) : answer ? (
          <>
            <div className={styles.answerTopline}>
              <span>
                {answer.value.status === "would_request_approval"
                  ? "Replay simulation"
                  : answer.value.status === "unavailable"
                    ? "Portée limitée"
                    : "Réponse sourcée"}
              </span>
              <span>
                {answer.value.intent.replaceAll("_", " ")} · as of{" "}
                <time dateTime={answer.asOf}>
                  {formatClock(answer.asOf, locale)}
                </time>
              </span>
            </div>
            <p className={styles.answerQuestion}>
              Question : « {answer.question} »
            </p>
            <p>{answer.value.text}</p>
            {answer.value.sources.length > 0 ? (
              <ul className={styles.sources} aria-label="Sources publiques">
                {answer.value.sources.map((source, index) => (
                  <PublicSource
                    key={`${source.label}-${source.occurred_at}-${index}`}
                    source={source}
                    locale={locale}
                    atSeconds={source.at_seconds}
                  />
                ))}
              </ul>
            ) : null}
            {answer.value.limitations.length > 0 ? (
              <ul className={styles.limitations}>
                {answer.value.limitations.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          <p className={styles.answerEmpty}>
            Je réponds seulement depuis ce que cette Room est autorisée à voir.
          </p>
        )}
      </div>
    </section>
  );
}

function ReplayTimeline({ experience }: { experience: HouseExperiencePublicV1 }) {
  if (!experience.story || !experience.session) return null;
  return (
    <section className={styles.timelineCard} aria-labelledby="timeline-title">
      <div className={styles.experienceHeading}>
        <div>
          <p className={styles.eyebrow}>Real events · accelerated time</p>
          <h2 id="timeline-title">{experience.story.title}</h2>
        </div>
        <div className={styles.virtualClock}>
          <span>Replay</span>
          <time dateTime={experience.session.virtual_time}>
            {formatClock(
              experience.session.virtual_time,
              experience.house.house.locale
            )}
          </time>
        </div>
      </div>
      <ol className={styles.timeline}>
        {experience.story.moments.map((moment) => (
          <li
            key={moment.id}
            className={moment.state === "current" ? styles.currentMoment : undefined}
            aria-current={moment.state === "current" ? "step" : undefined}
          >
            <span className={styles.timelineDot} aria-hidden="true" />
            <div>
              <p>{moment.label}</p>
              <time dateTime={moment.occurred_at}>
                {formatMoment(moment.occurred_at, experience.house.house.locale)}
              </time>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function EvidenceCards({ experience }: { experience: HouseExperiencePublicV1 }) {
  const locale = experience.house.house.locale;
  if (
    !experience.topic &&
    !experience.clip_candidate &&
    !experience.receipt &&
    experience.outcomes.length === 0
  ) {
    return null;
  }
  return (
    <section className={styles.evidenceStack} aria-label="État historique sourcé">
      {experience.topic ? (
        <article className={`${styles.evidenceCard} ${styles.topicCard}`}>
          <div className={styles.evidenceTopline}>
            <span>{experience.topic.label}</span>
            <time dateTime={experience.topic.window.ended_at}>
              {formatClock(experience.topic.window.ended_at, locale)}
            </time>
          </div>
          <h3>{experience.topic.title}</h3>
          <p>{experience.topic.summary}</p>
          <ul className={styles.sources}>
            <PublicSource source={experience.topic.source} locale={locale} />
          </ul>
        </article>
      ) : null}

      {experience.clip_candidate ? (
        <article className={`${styles.evidenceCard} ${styles.candidateCard}`}>
          <div className={styles.evidenceTopline}>
            <span>Historical automation</span>
            <span>
              score {experience.clip_candidate.score} · seuil{" "}
              {experience.clip_candidate.threshold}
            </span>
          </div>
          <h3>{experience.clip_candidate.title}</h3>
          <p>{experience.clip_candidate.reason}</p>
          <div className={styles.authorityTruth}>
            <strong>
              {experience.clip_candidate.score} ≥ {experience.clip_candidate.threshold}
            </strong>
            <span>Sélection automatique historique.</span>
            <span>Aucune décision humaine de Lucia n’est enregistrée.</span>
          </div>
          <ul className={styles.sources}>
            <PublicSource
              source={experience.clip_candidate.source}
              locale={locale}
            />
          </ul>
        </article>
      ) : null}

      {experience.receipt ? (
        <article className={`${styles.evidenceCard} ${styles.receiptCard}`}>
          <div className={styles.evidenceTopline}>
            <span>Historical receipt</span>
            <time dateTime={experience.receipt.occurred_at}>
              {formatClock(experience.receipt.occurred_at, locale)}
            </time>
          </div>
          <h3>Clip Twitch créé.</h3>
          <p>
            Twitch date l’asset de{" "}
            <time dateTime={experience.receipt.asset_created_at}>
              {formatClock(experience.receipt.asset_created_at, locale)}
            </time>
            ; Sentinelle a observé le reçu à{" "}
            <time dateTime={experience.receipt.occurred_at}>
              {formatClock(experience.receipt.occurred_at, locale)}
            </time>
            . Aucune action n’est exécutée par le replay.
          </p>
          <a
            className={styles.receiptLink}
            href={experience.receipt.public_url}
            rel="noreferrer"
          >
            Voir le clip historique <span aria-hidden="true">↗</span>
          </a>
        </article>
      ) : null}

      {experience.outcomes.length > 0 ? (
        <article className={`${styles.evidenceCard} ${styles.outcomeCard}`}>
          <div className={styles.evidenceTopline}>
            <span>Observed outcomes</span>
            <span>observational</span>
          </div>
          <h3>Ce que Twitch a réellement mesuré.</h3>
          <div className={styles.outcomeList}>
            {experience.outcomes.map((outcome) => (
              <div key={`${outcome.occurred_at}-${outcome.target_milestone_seconds}`}>
                <strong>
                  {outcome.view_count} {outcome.view_count === 1 ? "vue" : "vues"}
                </strong>
                <span>
                  âge d’échantillon Twitch {formatObservedAge(outcome.observed_age_seconds)}
                </span>
                <span>rétention indisponible</span>
              </div>
            ))}
          </div>
        </article>
      ) : null}
    </section>
  );
}

function ExperienceSection({
  experience,
  answer,
  askFailure,
  onAsk,
  asking,
  onControl,
  controlling,
  onExitReplay
}: {
  experience: HouseExperiencePublicV1;
  answer: BoundAnswer | null;
  askFailure: AskFailure | null;
  onAsk: (question: string) => void;
  asking: boolean;
  onControl: (action: ReplayControlAction) => void;
  controlling: boolean;
  onExitReplay: () => void;
}) {
  const replay = experience.mode === "replay";
  const allowed = new Set(experience.controls?.allowed ?? []);
  return (
    <section className={styles.experienceSection} aria-label="Lucia Sentinel experience">
      {replay ? (
        <div className={styles.replayBar}>
          <div>
            <span className={styles.replayBadge}>Replay</span>
            <span className={styles.realBadge}>Real historical data</span>
            <span>
              Side effects disabled
              {experience.controls?.next_after_seconds !== null &&
              experience.controls?.next_after_seconds !== undefined
                ? ` · prochain moment dans ${experience.controls.next_after_seconds}s`
                : ""}
            </span>
          </div>
          <div className={styles.replayControls} aria-label="Contrôles du replay">
            {allowed.has("play") ? (
              <button
                type="button"
                disabled={controlling}
                onClick={() => onControl("play")}
              >
                Play
              </button>
            ) : null}
            {allowed.has("pause") ? (
              <button
                type="button"
                disabled={controlling}
                onClick={() => onControl("pause")}
              >
                Pause
              </button>
            ) : null}
            {allowed.has("next") ? (
              <button
                type="button"
                disabled={controlling}
                onClick={() => onControl("next")}
              >
                Moment suivant
              </button>
            ) : null}
            {allowed.has("restart") ? (
              <button
                type="button"
                disabled={controlling}
                onClick={() => onControl("restart")}
              >
                Recommencer
              </button>
            ) : null}
            <button type="button" onClick={onExitReplay}>
              Retour au direct
            </button>
          </div>
        </div>
      ) : null}
      {replay ? <ReplayTimeline experience={experience} /> : null}
      <EvidenceCards experience={experience} />
      <AskPanel
        experience={experience}
        answer={answer}
        failure={askFailure}
        onAsk={onAsk}
        submitting={asking}
      />
      {experience.limitations.length > 0 ? (
        <ul className={styles.experienceLimits}>
          {experience.limitations.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function Rooms({ data }: { data: HousePublicV1 }) {
  return (
    <section className={styles.roomsSection} aria-labelledby="rooms-title">
      <div className={styles.roomsIntro}>
        <p className={styles.eyebrow}>Portes publiques</p>
        <h2 id="rooms-title">Rooms</h2>
        <p>Seulement ce que la Maison choisit de montrer.</p>
      </div>

      {data.rooms.length === 0 ? (
        <div className={styles.emptyRooms}>
          <p>Aucune Room publique pour le moment.</p>
        </div>
      ) : (
        <div className={styles.roomGrid}>
          {data.rooms.map((room, index) => (
            <article className={styles.roomCard} id={room.slug} key={room.slug}>
              <div className={styles.roomTopline}>
                <span className={styles.roomNumber}>0{index + 1}</span>
                <span className={styles.publicPill}>public</span>
              </div>
              <h3>{room.name}</h3>
              <p>{room.summary}</p>
              <span className={styles.roomStar} aria-hidden="true">
                {index % 2 === 0 ? "★" : "✦"}
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function TrustFooter({
  data,
  experience
}: {
  data: HousePublicV1;
  experience: HouseExperiencePublicV1 | null;
}) {
  return (
    <footer className={styles.footer}>
      <div>
        <span className={styles.footerStar} aria-hidden="true">
          ★
        </span>
        <p>
          {experience
            ? "Ask est ouvert en lecture seule. Find et la participation attendent encore."
            : "Maison en lecture seule. Ask et Replay sont temporairement indisponibles."}
        </p>
      </div>
      <p className={styles.projectionMeta}>
        Projection {data.revision} · {data.projection_hash.slice(0, 10)} ·{" "}
        {experience?.mode === "replay" ? "temps virtuel" : "état observé"}{" "}
        <time dateTime={experience?.as_of ?? data.generated_at}>
          {formatMoment(
            experience?.as_of ?? data.generated_at,
            data.house.locale
          )}
        </time>
      </p>
    </footer>
  );
}

function LoadingHouse() {
  return (
    <div className={styles.shell} lang="fr">
      <Header />
      <main className={styles.loadingLayout} aria-busy="true" aria-live="polite">
        <section className={styles.loadingHero}>
          <SentinelMark />
          <p>La Maison rejoint son état réel…</p>
        </section>
        <aside className={styles.contractRail} id="contract">
          <div className={`${styles.contractCard} ${styles.loadingContract}`}>
            <p className={styles.eyebrow}>Le cadre de la Maison</p>
            <h2>Contract</h2>
            <div className={styles.skeletonWide} />
            <div className={styles.skeleton} />
            <div className={styles.skeleton} />
          </div>
        </aside>
      </main>
    </div>
  );
}

function ErrorHouse({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={styles.shell} lang="fr">
      <Header />
      <main className={styles.errorLayout}>
        <section className={styles.errorCard} aria-live="assertive">
          <span aria-hidden="true">✦</span>
          <p className={styles.eyebrow}>Projection indisponible</p>
          <h1>La Maison ne devine rien.</h1>
          <p>
            Son état canonique n’est pas joignable. Aucun contenu de remplacement
            n’est affiché.
          </p>
          <button type="button" onClick={onRetry}>
            Réessayer
          </button>
        </section>
        <aside className={styles.contractRail} id="contract">
          <div className={styles.contractCard}>
            <p className={styles.eyebrow}>Le cadre de la Maison</p>
            <h2>Contract</h2>
            <p className={styles.contractUnavailable}>
              Le Contract reste à sa place, mais son contenu attend la projection
              vérifiée.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default function LuciaHouse() {
  const [view, setView] = useState<HouseView | null>(null);
  const [requestState, setRequestState] = useState<RequestState>("loading");
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [answer, setAnswer] = useState<BoundAnswer | null>(null);
  const [askFailure, setAskFailure] = useState<AskFailure | null>(null);
  const [asking, setAsking] = useState(false);
  const [replayStarting, setReplayStarting] = useState(false);
  const [controlling, setControlling] = useState(false);
  const [lastSuccessfulFetchAt, setLastSuccessfulFetchAt] = useState<number | null>(
    null
  );
  const [clock, setClock] = useState(() => Date.now());
  const requestSequence = useRef(0);
  const pollSequence = useRef(0);
  const pollInFlight = useRef(false);
  const explicitRequestInFlight = useRef(false);
  const viewRef = useRef<HouseView | null>(null);

  const applyView = useCallback((next: HouseView) => {
    const previousExperience = viewRef.current?.experience;
    const nextExperience = next.experience;
    const previousAnswerContext = previousExperience
      ? `${previousExperience.mode}:${previousExperience.session?.id ?? "live"}:${previousExperience.as_of}`
      : null;
    const nextAnswerContext = nextExperience
      ? `${nextExperience.mode}:${nextExperience.session?.id ?? "live"}:${nextExperience.as_of}`
      : null;
    const answerContextChanged = previousAnswerContext !== nextAnswerContext;
    if (answerContextChanged) {
      setAnswer(null);
      setAskFailure(null);
    }
    viewRef.current = next;
    setView(next);
    const receivedAt = Date.now();
    setRefreshFailed(false);
    setLastSuccessfulFetchAt(receivedAt);
    setClock(receivedAt);
    setRequestState("ready");
    return true;
  }, []);

  const acceptView = useCallback(
    (next: HouseView, sequence: number) => {
      if (sequence !== requestSequence.current) return false;
      return applyView(next);
    },
    [applyView]
  );

  const beginExplicitRequest = useCallback(() => {
    if (explicitRequestInFlight.current) return null;
    explicitRequestInFlight.current = true;
    ++pollSequence.current;
    setRequestState((current) =>
      current === "refreshing" ? "ready" : current
    );
    return ++requestSequence.current;
  }, []);

  const endExplicitRequest = useCallback(() => {
    explicitRequestInFlight.current = false;
  }, []);

  const load = useCallback(async (background = false, sessionId?: string) => {
    if (
      background &&
      (pollInFlight.current || explicitRequestInFlight.current)
    ) {
      return;
    }
    const sequence = background ? requestSequence.current : ++requestSequence.current;
    const pollingToken = ++pollSequence.current;
    if (background) pollInFlight.current = true;
    setRequestState((current) =>
      background && current !== "error" ? "refreshing" : "loading"
    );

    try {
      let next: HouseView;
      if (sessionId) {
        const experience = await publicJson(
          `${PUBLIC_REPLAY_ENDPOINT}/${encodeURIComponent(sessionId)}`,
          { method: "GET" },
          parseHouseExperiencePublicV1
        );
        next = { house: experience.house, experience };
      } else {
        next = await fetchLiveView();
      }
      if (background) {
        if (
          pollingToken !== pollSequence.current ||
          sequence !== requestSequence.current ||
          explicitRequestInFlight.current
        ) {
          return;
        }
        applyView(next);
      } else {
        acceptView(next, sequence);
      }
    } catch {
      if (
        sequence !== requestSequence.current ||
        (background && pollingToken !== pollSequence.current)
      ) {
        return;
      }
      setRequestState(background ? "ready" : "error");
      setRefreshFailed(background);
    } finally {
      if (background) pollInFlight.current = false;
    }
  }, [acceptView, applyView]);

  useEffect(() => {
    const stored = window.sessionStorage.getItem(REPLAY_SESSION_STORAGE_KEY);
    if (!stored) {
      void load(false);
      return;
    }
    void load(false, stored).then(() => {
      if (!viewRef.current) {
        window.sessionStorage.removeItem(REPLAY_SESSION_STORAGE_KEY);
        void load(false);
      }
    });
  }, [load]);

  useEffect(() => {
    const refreshCurrent = () => {
      const sessionId = viewRef.current?.experience?.session?.id;
      void load(true, sessionId);
    };
    const playing = view?.experience?.session?.status === "playing";
    const interval = window.setInterval(() => {
      setClock(Date.now());
      if (document.visibilityState === "visible") refreshCurrent();
    }, playing ? PLAYING_POLL_INTERVAL_MS : POLL_INTERVAL_MS);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refreshCurrent();
    };
    const refreshWhenOnline = () => refreshCurrent();
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("online", refreshWhenOnline);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("online", refreshWhenOnline);
    };
  }, [load, view?.experience?.session?.status]);

  const startReplay = useCallback(async () => {
    if (replayStarting) return;
    const sequence = beginExplicitRequest();
    if (sequence === null) return;
    setReplayStarting(true);
    setAnswer(null);
    setAskFailure(null);
    try {
      const experience = await publicJson(
        PUBLIC_REPLAY_ENDPOINT,
        {
          method: "POST",
          body: JSON.stringify({ story_slug: "a-day-with-lucia" })
        },
        parseHouseExperiencePublicV1
      );
      if (!experience.session) throw new Error("Replay session missing");
      if (acceptView({ house: experience.house, experience }, sequence)) {
        window.sessionStorage.setItem(
          REPLAY_SESSION_STORAGE_KEY,
          experience.session.id
        );
      }
    } catch {
      if (sequence === requestSequence.current) setRefreshFailed(true);
    } finally {
      endExplicitRequest();
      setReplayStarting(false);
    }
  }, [acceptView, beginExplicitRequest, endExplicitRequest, replayStarting]);

  const controlReplay = useCallback(
    async (action: ReplayControlAction) => {
      const current = viewRef.current?.experience;
      if (
        controlling ||
        !current?.session ||
        !current.controls?.allowed.includes(action)
      ) {
        return;
      }
      const sequence = beginExplicitRequest();
      if (sequence === null) return;
      setControlling(true);
      setAnswer(null);
      setAskFailure(null);
      try {
        const experience = await publicJson(
          `${PUBLIC_REPLAY_ENDPOINT}/${encodeURIComponent(
            current.session.id
          )}/control`,
          { method: "POST", body: JSON.stringify({ action }) },
          parseHouseExperiencePublicV1
        );
        acceptView({ house: experience.house, experience }, sequence);
      } catch {
        if (sequence === requestSequence.current) setRefreshFailed(true);
      } finally {
        endExplicitRequest();
        setControlling(false);
      }
    },
    [
      acceptView,
      beginExplicitRequest,
      controlling,
      endExplicitRequest
    ]
  );

  const ask = useCallback(
    async (question: string) => {
      if (asking || question.length > 500) return;
      const current = viewRef.current?.experience;
      if (!current) return;
      const sequence = beginExplicitRequest();
      if (sequence === null) return;
      setAsking(true);
      setAnswer(null);
      setAskFailure(null);
      try {
        const experience = await publicJson(
          PUBLIC_ASK_ENDPOINT,
          {
            method: "POST",
            body: JSON.stringify({
              question,
              ...(current.session
                ? { replay_session_id: current.session.id }
                : {})
            })
          },
          parseHouseExperiencePublicV1
        );
        if (!experience.answer) {
          throw new Error("Verified Ask answer missing");
        }
        if (
          acceptView({ house: experience.house, experience }, sequence)
        ) {
          setAnswer({
            question,
            asOf: experience.as_of,
            value: experience.answer
          });
        }
      } catch {
        if (sequence === requestSequence.current) {
          setAnswer(null);
          setAskFailure({
            question,
            message:
              "La Maison n’affiche aucune réponse tant que ses sources publiques ne sont pas disponibles. Réessaie dans un instant."
          });
        }
      } finally {
        endExplicitRequest();
        setAsking(false);
      }
    },
    [acceptView, asking, beginExplicitRequest, endExplicitRequest]
  );

  const exitReplay = useCallback(() => {
    window.sessionStorage.removeItem(REPLAY_SESSION_STORAGE_KEY);
    setAnswer(null);
    setAskFailure(null);
    viewRef.current = null;
    setView(null);
    void load(false);
  }, [load]);

  const stale = useMemo(() => {
    if (!view) return false;
    const generatedAt = view.experience?.generated_at;
    const projectionTransportOld =
      view.experience?.mode === "live" &&
      generatedAt !== undefined &&
      clock - Date.parse(generatedAt) > STALE_AFTER_MS;
    return (
      refreshFailed ||
      lastSuccessfulFetchAt === null ||
      clock - lastSuccessfulFetchAt > STALE_AFTER_MS ||
      projectionTransportOld
    );
  }, [clock, lastSuccessfulFetchAt, refreshFailed, view]);

  if (!view && requestState === "loading") return <LoadingHouse />;
  if (!view) return <ErrorHouse onRetry={() => void load(false)} />;

  const data = view.house;
  const experience = view.experience;
  const mode = experience?.mode ?? "heartbeat";

  return (
    <div className={styles.shell} lang="fr">
      <Header rooms={data.rooms} />
      {stale ? (
        <div className={styles.staleBanner} role="status">
          <span>La projection tarde à se rafraîchir.</span>
          <button
            type="button"
            onClick={() => void load(true, experience?.session?.id)}
          >
            Actualiser
          </button>
        </div>
      ) : null}

      <main className={styles.houseGrid}>
        <SentinelHero data={data} mode={mode} />
        <ContractCard house={data.house} />
        <NowCard
          data={data}
          experience={experience}
          onStartReplay={() => void startReplay()}
          replayStarting={replayStarting}
        />
        {experience ? (
          <ExperienceSection
            experience={experience}
            answer={answer}
            askFailure={askFailure}
            onAsk={(question) => void ask(question)}
            asking={asking}
            onControl={(action) => void controlReplay(action)}
            controlling={controlling}
            onExitReplay={exitReplay}
          />
        ) : null}
        <Rooms data={data} />
      </main>
      <TrustFooter data={data} experience={experience} />
    </div>
  );
}
