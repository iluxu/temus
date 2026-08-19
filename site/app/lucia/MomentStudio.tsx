"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  MomentAnswerV0,
  MomentCollectionV0,
  MomentDoV0,
  MomentFindV0,
  MomentV0,
  parseMomentAnswerV0,
  parseMomentCollectionV0,
  parseMomentDoV0,
  parseMomentFindV0
} from "./moment-public";
import styles from "./moment.module.css";

type ShellMode = "public" | "operator";
type HumanMode = "find" | "ask" | "do";

async function requestJson<T>(url: string, init: RequestInit, parse: (value: unknown) => T): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...(init.headers ?? {}) }
  });
  if (!response.ok) throw new Error(`Moment Studio unavailable (${response.status})`);
  return parse(await response.json());
}

function formatSeconds(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

function MomentCard({ moment, selected, onSelect }: { moment: MomentV0; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" className={`${styles.momentCard} ${selected ? styles.selectedCard : ""}`} onClick={onSelect} aria-pressed={selected}>
      <span className={styles.cardTopline}><span>{moment.category}</span><span>{moment.derivatives.length} média{moment.derivatives.length === 1 ? "" : "s"}</span></span>
      <strong>{moment.title}</strong>
      <span>{moment.summary}</span>
      <span className={styles.cardSource}>Twitch · {formatSeconds(moment.source.start_seconds)}</span>
    </button>
  );
}

function MomentDetail({ moment, operator }: { moment: MomentV0; operator: boolean }) {
  return (
    <article className={styles.detail} aria-labelledby="moment-detail-title">
      <div className={styles.detailTopline}><span>Moment canonique</span><span>{moment.public ? "public" : "studio privé"}</span></div>
      <h3 id="moment-detail-title">{moment.title}</h3>
      <p className={styles.hook}>{moment.qualification.hook}</p>
      <p>{moment.summary}</p>
      <div className={styles.proofGrid}>
        <div><span>Source exacte</span><strong>{formatSeconds(moment.source.start_seconds)} → {formatSeconds(moment.source.end_seconds)}</strong><a href={moment.source.public_url} rel="noreferrer">Live Twitch ↗</a></div>
        <div><span>Qualification</span><strong>{moment.qualification.score} / 100</strong><small>score de sélection · seuil {moment.qualification.threshold}</small></div>
        <div><span>Dérivés reliés</span><strong>{moment.derivatives.length}</strong><small>une identité, plusieurs formats</small></div>
      </div>
      <section className={styles.why}><span>Pourquoi il compte</span><p>{moment.qualification.reason}</p></section>
      <section className={styles.derivatives} aria-label="Médias dérivés">
        <h4>Derivative media</h4>
        {moment.derivatives.length ? (
          <ul>{moment.derivatives.map((media) => (
            <li key={media.id}><span>{media.platform} · {media.kind.replaceAll("_", " ")}</span><strong>{media.status}</strong>{media.public_url ? <a href={media.public_url} rel="noreferrer">ouvrir ↗</a> : <small>pas d’URL publique</small>}</li>
          ))}</ul>
        ) : <p>Aucun média dérivé observé pour l’instant.</p>}
      </section>
      {operator && moment.decisions.length ? (
        <section className={styles.decisions}><h4>Décisions & outcomes</h4>{moment.decisions.map((decision, index) => (
          <div key={decision.id ?? `${decision.action}-${index}`}><strong>{decision.title}</strong><span>{decision.status} · {decision.receipts.length} reçu{decision.receipts.length === 1 ? "" : "s"} · {decision.outcomes.length} outcome{decision.outcomes.length === 1 ? "" : "s"}</span></div>
        ))}</section>
      ) : null}
    </article>
  );
}

export default function MomentStudio({ operator = false }: { operator?: boolean }) {
  const shellMode: ShellMode = operator ? "operator" : "public";
  const base = `/api/lucia/v1/${shellMode}/moments`;
  const [collection, setCollection] = useState<MomentCollectionV0 | null>(null);
  const [moments, setMoments] = useState<MomentV0[]>([]);
  const [category, setCategory] = useState("Tous");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [humanMode, setHumanMode] = useState<HumanMode>("find");
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState<MomentAnswerV0 | null>(null);
  const [action, setAction] = useState<MomentDoV0 | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    requestJson(base, { method: "GET" }, parseMomentCollectionV0)
      .then((next) => {
        if (!active || next.mode !== shellMode) return;
        setCollection(next); setMoments(next.moments); setSelectedId(next.moments[0]?.id ?? null);
      })
      .catch(() => active && setError(operator ? "Le Studio attend une identité Lucia ou Luca vérifiée." : "La collection canonique n’est pas joignable pour le moment."));
    return () => { active = false; };
  }, [base, operator, shellMode]);

  const visible = useMemo(() => category === "Tous" ? moments : moments.filter((moment) => moment.category === category), [category, moments]);
  const selected = visible.find((moment) => moment.id === selectedId) ?? visible[0] ?? null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const command = input.trim();
    if (!command || busy) return;
    if ((humanMode === "ask" || humanMode === "do") && !selected) { setError("Choisis d’abord un Moment."); return; }
    if (humanMode === "do" && !operator) { setError("Do est réservé au Studio authentifié de Lucia et Luca."); return; }
    setBusy(true); setError(null); setAnswer(null); setAction(null);
    try {
      if (humanMode === "find") {
        const found = await requestJson(`${base}/find`, { method: "POST", body: JSON.stringify({ query: command }) }, (value) => parseMomentFindV0(value, shellMode)) as MomentFindV0;
        setMoments(found.results); setCategory("Tous"); setSelectedId(found.results[0]?.id ?? null);
      } else if (humanMode === "ask" && selected) {
        const result = await requestJson(`${base}/ask`, { method: "POST", body: JSON.stringify({ moment_id: selected.id, question: command }) }, parseMomentAnswerV0);
        if (result.moment_id !== selected.id || result.question !== command) throw new Error();
        setAnswer(result);
      } else if (selected) {
        const result = await requestJson(`${base}/do`, { method: "POST", body: JSON.stringify({ moment_id: selected.id, command, message_id: crypto.randomUUID() }) }, parseMomentDoV0);
        if (result.moment_id !== selected.id) throw new Error();
        setAction(result);
      }
    } catch { setError("Aucun résultat n’est affiché sans réponse canonique vérifiée."); }
    finally { setBusy(false); }
  }

  return (
    <section className={styles.studio} id="moments" aria-labelledby="moments-title">
      <header className={styles.header}>
        <div><p>{operator ? "Creator Studio · privé" : "Moments · collection réelle"}</p><h2 id="moments-title">Le clip est un média. Le Moment raconte ce qui s’est passé.</h2></div>
        {operator ? (
          <a href="/lucia">Voir la Maison publique</a>
        ) : (
          <span className={styles.privateLabel}>Studio publisher · accès Lucia / Luca</span>
        )}
      </header>
      {collection ? (
        <>
          <nav className={styles.categories} aria-label="Catégories de Moments">{["Tous", ...collection.categories].map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</nav>
          <div className={styles.workspace}>
            <div className={styles.collection} aria-label="Collection de Moments">{visible.length ? visible.map((moment) => <MomentCard key={moment.id} moment={moment} selected={selected?.id === moment.id} onSelect={() => setSelectedId(moment.id)} />) : <div className={styles.empty}><strong>Aucun Moment {category === "Tous" ? "visible" : `dans « ${category} »`}.</strong><span>La Maison préfère un état vide à une collection inventée.</span></div>}</div>
            {selected ? <MomentDetail moment={selected} operator={operator} /> : null}
          </div>
        </>
      ) : error ? <div className={styles.empty} role="status">{error}</div> : <div className={styles.empty}>La collection rejoint le World State…</div>}
      <form className={styles.command} onSubmit={submit}>
        <div className={styles.modes} aria-label="Ask Find Do">{(["find", "ask", "do"] as HumanMode[]).map((mode) => <button key={mode} type="button" aria-pressed={humanMode === mode} onClick={() => { setHumanMode(mode); setError(null); }}>{mode}</button>)}</div>
        <label htmlFor={`moment-command-${shellMode}`}>{humanMode === "find" ? "Retrouver dans les Moments" : humanMode === "ask" ? "Comprendre ce Moment" : "Agir avec autorité"}</label>
        <div className={styles.commandLine}>
          <input id={`moment-command-${shellMode}`} value={input} onChange={(event) => setInput(event.target.value)} maxLength={600} placeholder={humanMode === "find" ? "retrouve quand Lucia chantait à New York" : humanMode === "ask" ? "pourquoi celui-ci a été retenu ?" : "fais-en une version TikTok et demande à Lucia"} />
          <button type="submit" disabled={busy}>{busy ? "…" : humanMode}</button>
        </div>
        <small>{humanMode === "do" ? "Do propose une décision. Il ne lance ni worker ni publication sans Lucia." : "Sources et timestamps restent attachés au Moment."}</small>
      </form>
      {answer ? <div className={styles.response} role="status"><strong>Sentinelle</strong><p>{answer.answer.text}</p>{answer.answer.sources.map((source) => <a key={`${source.occurred_at}-${source.at_seconds}`} href={source.url} rel="noreferrer">{source.label} · {formatSeconds(source.at_seconds)} ↗</a>)}</div> : null}
      {action ? <div className={styles.response} role="status"><strong>Needs Lucia</strong><p>{action.decision.title}</p><span>{action.decision.effect}</span></div> : null}
      {error && collection ? <div className={styles.error} role="alert">{error}</div> : null}
    </section>
  );
}
