"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  HousePublicV1,
  LuciaPresenceState,
  parseHousePublicV1
} from "./house-public";
import styles from "./lucia.module.css";

const PUBLIC_HOUSE_ENDPOINT = "/api/lucia/v1/public/house";
const POLL_INTERVAL_MS = 30_000;
const STALE_AFTER_MS = 5 * 60_000;

const presenceCopy: Record<LuciaPresenceState, string> = {
  watching: "regarde le monde",
  working: "en mouvement",
  waiting: "en attente",
  sleeping: "au calme"
};

type RequestState = "loading" | "ready" | "refreshing" | "error";

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

function SentinelHero({ data }: { data: HousePublicV1 }) {
  const updatedAt = formatMoment(data.presence.updated_at, data.house.locale);
  return (
    <section className={styles.hero} id="house" aria-labelledby="house-title">
      <div className={styles.heroCopy}>
        <p className={styles.goodMorning}>Good morning</p>
        <p className={styles.houseName}>{data.house.name}</p>
        <h1 id="house-title">Lucia’s Sentinel</h1>
        <p className={styles.heroLead}>
          Une présence discrète au centre de la Maison. Le Contract garde la ligne;
          le réel décide du reste.
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
        <span>Sentinel {presenceCopy[data.presence.state]}</span>
        <span className={styles.presenceTime}>mis à jour {updatedAt}</span>
      </div>
    </section>
  );
}

function NowCard({ data }: { data: HousePublicV1 }) {
  const now = data.now;
  return (
    <section className={styles.nowCard} id="now" aria-labelledby="now-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>Signal vérifié</p>
          <h2 id="now-title">Now</h2>
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
            <h3>{now.title ?? "Signal en cours"}</h3>
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

function TrustFooter({ data }: { data: HousePublicV1 }) {
  return (
    <footer className={styles.footer}>
      <div>
        <span className={styles.footerStar} aria-hidden="true">
          ★
        </span>
        <p>
          Maison en lecture seule. Ask, Find et la participation ne sont pas ouverts.
        </p>
      </div>
      <p className={styles.projectionMeta}>
        Projection {data.revision} · {data.projection_hash.slice(0, 10)} · générée{" "}
        <time dateTime={data.generated_at}>
          {formatMoment(data.generated_at, data.house.locale)}
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
  const [data, setData] = useState<HousePublicV1 | null>(null);
  const [requestState, setRequestState] = useState<RequestState>("loading");
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [lastSuccessfulFetchAt, setLastSuccessfulFetchAt] = useState<number | null>(
    null
  );
  const [clock, setClock] = useState(() => Date.now());
  const requestSequence = useRef(0);

  const load = useCallback(async (background = false) => {
    const sequence = ++requestSequence.current;
    setRequestState((current) =>
      background && current !== "error" ? "refreshing" : "loading"
    );

    try {
      const response = await fetch(PUBLIC_HOUSE_ENDPOINT, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (!response.ok) throw new Error("Public projection unavailable");
      const projection = parseHousePublicV1(await response.json());
      if (sequence !== requestSequence.current) return;
      const receivedAt = Date.now();
      setData(projection);
      setRefreshFailed(false);
      setLastSuccessfulFetchAt(receivedAt);
      setClock(receivedAt);
      setRequestState("ready");
    } catch {
      if (sequence !== requestSequence.current) return;
      setRequestState(background ? "ready" : "error");
      setRefreshFailed(background);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setClock(Date.now());
      if (document.visibilityState === "visible") void load(true);
    }, POLL_INTERVAL_MS);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    const refreshWhenOnline = () => void load(true);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("online", refreshWhenOnline);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("online", refreshWhenOnline);
    };
  }, [load]);

  const stale = useMemo(() => {
    if (!data) return false;
    return (
      refreshFailed ||
      lastSuccessfulFetchAt === null ||
      clock - lastSuccessfulFetchAt > STALE_AFTER_MS
    );
  }, [clock, data, lastSuccessfulFetchAt, refreshFailed]);

  if (!data && requestState === "loading") return <LoadingHouse />;
  if (!data) return <ErrorHouse onRetry={() => void load(false)} />;

  return (
    <div className={styles.shell} lang="fr">
      <Header rooms={data.rooms} />
      {stale ? (
        <div className={styles.staleBanner} role="status">
          <span>La projection tarde à se rafraîchir.</span>
          <button type="button" onClick={() => void load(true)}>
            Actualiser
          </button>
        </div>
      ) : requestState === "refreshing" ? (
        <div className={styles.syncStatus} role="status">
          Synchronisation…
        </div>
      ) : null}

      <main className={styles.houseGrid}>
        <SentinelHero data={data} />
        <ContractCard house={data.house} />
        <NowCard data={data} />
        <Rooms data={data} />
      </main>
      <TrustFooter data={data} />
    </div>
  );
}
