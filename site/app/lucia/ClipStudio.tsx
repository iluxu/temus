"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ClipAnswerPublicV0,
  ClipCategorySlug,
  ClipCollectionPublicV0,
  ClipPublicV0,
  ClipStatusSlug,
  parseClipAnswerPublicV0,
  parseClipCollectionPublicV0
} from "./clip-public";
import styles from "./clip-studio.module.css";

type HumanMode = "find" | "ask" | "do";
type CategoryFilter = "all" | ClipCategorySlug;
type StatusFilter = "all" | ClipStatusSlug;

async function requestJson<T>(url: string, init: RequestInit, parse: (value: unknown) => T): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {})
    }
  });
  if (!response.ok) throw new Error(`Studio unavailable (${response.status})`);
  return parse(await response.json());
}

function displayDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function ClipCard({ clip, selected, onSelect }: { clip: ClipPublicV0; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" className={`${styles.clipCard} ${selected ? styles.selectedCard : ""}`} onClick={onSelect} aria-pressed={selected}>
      <span className={styles.cardMedia} aria-hidden="true"><span>▶</span></span>
      <span className={styles.cardBody}>
        <span className={styles.cardTopline}><span>{clip.category_label}</span><span>{displayDate(clip.created_at)}</span></span>
        <strong>{clip.title}</strong>
        <span className={styles.cardMeta}>{clip.status_label} · {clip.variant_count} version{clip.variant_count === 1 ? "" : "s"}</span>
        {clip.match ? <span className={styles.cardReason}>{clip.match.reasons[0]}</span> : null}
      </span>
    </button>
  );
}

function ClipDetail({ clip, host, onShare, shareState }: { clip: ClipPublicV0; host: string; onShare: () => void; shareState: string | null }) {
  const embedUrl = host
    ? `https://clips.twitch.tv/embed?clip=${encodeURIComponent(clip.id)}&parent=${encodeURIComponent(host)}&autoplay=false`
    : null;
  return (
    <article className={styles.detail} aria-labelledby="clip-detail-title">
      <div className={styles.detailTopline}>
        <span>Clip public · Twitch</span>
        <span>{clip.moment_id ? "Moment relié" : "Pas encore un Moment"}</span>
      </div>
      <div className={styles.player}>
        {embedUrl ? <iframe src={embedUrl} title={`Clip Twitch — ${clip.title}`} allowFullScreen loading="lazy" /> : <div>Chargement du lecteur…</div>}
      </div>
      <div className={styles.detailCopy}>
        <p className={styles.eyebrow}>{clip.category_label} · {clip.status_label}</p>
        <h2 id="clip-detail-title">{clip.title}</h2>
        <div className={styles.detailActions}>
          <a href={clip.public_url} target="_blank" rel="noreferrer">Ouvrir sur Twitch ↗</a>
          <button type="button" onClick={onShare}>{shareState ?? "Partager"}</button>
        </div>
        <dl>
          <div><dt>Créé</dt><dd>{displayDate(clip.created_at)}</dd></div>
          <div><dt>Rendus</dt><dd>{clip.variant_count}</dd></div>
          <div><dt>DA TikTok</dt><dd>{clip.ready_tiktok ? "prête" : "non confirmée"}</dd></div>
        </dl>
        {clip.match ? (
          <section className={styles.matchExplanation} aria-labelledby="match-explanation-title">
            <p className={styles.eyebrow} id="match-explanation-title">Pourquoi ce résultat</p>
            <ul>{clip.match.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
            <small>Pertinence de recherche : {Math.round(clip.match.score * 100)} %. Ce n’est ni une note de qualité ni une confiance éditoriale.</small>
          </section>
        ) : null}
        <p className={styles.truthNote}>Ce média reste un Clip. Il ne devient Moment qu’avec une qualification, une provenance et un <code>moment_id</code> canoniques.</p>
      </div>
    </article>
  );
}

export default function ClipStudio() {
  const [collection, setCollection] = useState<ClipCollectionPublicV0 | null>(null);
  const [clips, setClips] = useState<ClipPublicV0[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [humanMode, setHumanMode] = useState<HumanMode>("find");
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState<ClipAnswerPublicV0 | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [shareState, setShareState] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [host, setHost] = useState("");

  useEffect(() => setHost(window.location.hostname), []);

  useEffect(() => {
    let active = true;
    requestJson("/api/lucia/v1/public/clips", { method: "GET" }, parseClipCollectionPublicV0)
      .then((next) => {
        if (!active) return;
        setCollection(next);
        setClips(next.clips);
        setSelectedId(next.clips[0]?.id ?? null);
      })
      .catch(() => active && setError("Le catalogue réel de Lucia n’est pas joignable pour le moment."));
    return () => { active = false; };
  }, []);

  const selected = useMemo(
    () => clips.find((clip) => clip.id === selectedId) ?? clips[0] ?? null,
    [clips, selectedId]
  );

  async function find(nextCategory = category, nextStatus = status, offset = 0, append = false, query = input.trim()) {
    setBusy(true); setError(null); setAnswer(null); setNotice(null);
    try {
      const next = await requestJson(
        "/api/lucia/v1/public/clips/find",
        { method: "POST", body: JSON.stringify({ query, category: nextCategory, status: nextStatus, offset, limit: 24 }) },
        parseClipCollectionPublicV0
      );
      setCollection(next);
      setClips((current) => append ? [...current, ...next.clips.filter((clip) => !current.some((item) => item.id === clip.id))] : next.clips);
      if (!append) setSelectedId(next.clips[0]?.id ?? null);
    } catch {
      setError("Find n’a reçu aucune projection vérifiée. Réessaie dans un instant.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const command = input.trim();
    if (!command || busy) return;
    setAnswer(null); setNotice(null); setError(null);
    if (humanMode === "find") {
      await find(category, status, 0, false, command);
      return;
    }
    if (!selected) {
      setError("Choisis d’abord un clip.");
      return;
    }
    if (humanMode === "do") {
      setNotice(
        selected.moment_id
          ? "Do demande une identité Lucia/Luca vérifiée avant de créer Needs Lucia."
          : "Do est bien gouverné : ce clip doit d’abord être qualifié en Moment réel. Je ne crée pas une fausse décision sur un média sans moment_id."
      );
      return;
    }
    setBusy(true);
    try {
      const result = await requestJson(
        "/api/lucia/v1/public/clips/ask",
        {
          method: "POST",
          body: JSON.stringify({
            clip_id: selected.id,
            question: command,
            context_query: collection?.filters.query.trim() || null
          })
        },
        parseClipAnswerPublicV0
      );
      if (result.clip_id !== selected.id || result.question !== command) throw new Error();
      setAnswer(result);
    } catch {
      setError("Ask n’a reçu aucune réponse source-backed vérifiée.");
    } finally {
      setBusy(false);
    }
  }

  async function shareSelected() {
    if (!selected) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: selected.title, text: `Un clip de Lucia : ${selected.title}`, url: selected.public_url });
        setShareState("Partagé");
      } else {
        await navigator.clipboard.writeText(selected.public_url);
        setShareState("Lien copié");
      }
    } catch {
      setShareState("Partage annulé");
    }
    window.setTimeout(() => setShareState(null), 1800);
  }

  function changeCategory(next: CategoryFilter) {
    setCategory(next);
    void find(next, status, 0, false);
  }

  function changeStatus(next: StatusFilter) {
    setStatus(next);
    void find(category, next, 0, false);
  }

  return (
    <div className={styles.shell} lang="fr">
      <header className={styles.siteHeader}>
        <a href="/lucia" className={styles.brand}><span>◉</span> Maison Lucia</a>
        <span>Sentinelle Publisher Studio</span>
      </header>
      <main className={styles.studio}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Collection réelle · Lucia</p>
            <h1>Tous ses clips.<br />Un endroit pour les retrouver, les comprendre et agir.</h1>
          </div>
          <div className={styles.stat}>
            <strong>{collection?.totals.public_clips.toLocaleString("fr-FR") ?? "—"}</strong>
            <span>clips Twitch publics</span>
            <small>Les Moments canoniques restent distingués des médias historiques.</small>
          </div>
        </section>

        {collection ? (
          <>
            <section className={styles.filters} aria-label="Filtres du catalogue">
              <div className={styles.filterRow}>
                <button type="button" aria-pressed={category === "all"} onClick={() => changeCategory("all")}>Tout <span>{collection.totals.public_clips}</span></button>
                {collection.categories.map((facet) => (
                  <button key={facet.slug} type="button" aria-pressed={category === facet.slug} onClick={() => changeCategory(facet.slug as CategoryFilter)}>{facet.label} <span>{facet.count}</span></button>
                ))}
              </div>
              <label>État du média
                <select value={status} onChange={(event) => changeStatus(event.target.value as StatusFilter)}>
                  <option value="all">Tous les états</option>
                  {collection.statuses.map((facet) => <option key={facet.slug} value={facet.slug}>{facet.label} · {facet.count}</option>)}
                </select>
              </label>
            </section>

            <section className={styles.workspace}>
              <div className={styles.library}>
                <div className={styles.libraryHead}><strong>{collection.totals.matching_clips.toLocaleString("fr-FR")} résultat{collection.totals.matching_clips === 1 ? "" : "s"}</strong><span>Catégories dérivées · filtre v0</span></div>
                <div className={styles.grid}>
                  {clips.map((clip) => <ClipCard key={clip.id} clip={clip} selected={selected?.id === clip.id} onSelect={() => { setSelectedId(clip.id); setAnswer(null); setNotice(null); }} />)}
                </div>
                {!clips.length ? <div className={styles.empty}>Aucun clip ne correspond à ces filtres.</div> : null}
                {collection.filters.next_offset !== null ? <button className={styles.more} type="button" disabled={busy} onClick={() => void find(category, status, collection.filters.next_offset ?? 0, true)}>{busy ? "Chargement…" : "Charger 24 clips de plus"}</button> : null}
              </div>
              {selected ? <ClipDetail clip={selected} host={host} onShare={() => void shareSelected()} shareState={shareState} /> : null}
            </section>
          </>
        ) : error ? <div className={styles.empty} role="alert">{error}</div> : <div className={styles.empty}>Sentinelle ouvre le catalogue réel…</div>}

        <section className={styles.commandDock} aria-labelledby="command-title">
          <div className={styles.commandIntro}><p className={styles.eyebrow}>Interface humaine</p><h2 id="command-title">Ask / Find / Do</h2></div>
          <form onSubmit={submit}>
            <div className={styles.modes}>{(["find", "ask", "do"] as HumanMode[]).map((mode) => <button key={mode} type="button" aria-pressed={humanMode === mode} onClick={() => { setHumanMode(mode); setAnswer(null); setNotice(null); setError(null); }}>{mode}</button>)}</div>
            <div className={styles.commandLine}>
              <input value={input} onChange={(event) => setInput(event.target.value)} maxLength={600} placeholder={humanMode === "find" ? "retrouve quand Lucia était marrante" : humanMode === "ask" ? "pourquoi celui-ci a été retenu ?" : "fais-en une version TikTok et demande à Lucia"} aria-label={`${humanMode} dans le Studio`} />
              <button type="submit" disabled={busy}>{busy ? "…" : humanMode}</button>
            </div>
            <small>{humanMode === "find" ? "Find cherche dans les titres, angles et transcriptions disponibles sans exposer le transcript brut." : humanMode === "ask" ? "Ask répond sur le clip sélectionné et garde sa source Twitch." : "Do exige un Moment canonique et l’identité vérifiée de Lucia ou Luca."}</small>
          </form>
        </section>
        {answer ? <div className={styles.response} role="status"><strong>Sentinelle</strong><p>{answer.answer.text}</p>{answer.answer.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a>)}</div> : null}
        {notice ? <div className={styles.response} role="status"><strong>Do · limite d’autorité</strong><p>{notice}</p></div> : null}
        {error && collection ? <div className={styles.error} role="alert">{error}</div> : null}
      </main>
    </div>
  );
}
