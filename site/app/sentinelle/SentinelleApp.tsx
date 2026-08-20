"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  WorkspaceProjection,
  WorldEntity,
  nested,
  parseWorkspace,
  sentinelleApiBase,
  typeName
} from "./world";
import styles from "./sentinelle.module.css";

const SELECTION_ID = "urn:adoptan:selection:44";
const COMPILATION_ID = "urn:adoptan:compilation:12";

type AuthState = "loading" | "locked" | "authenticated";

function mutationId(prefix: string): string {
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}:${suffix}`;
}

function mapEntities(workspace: WorkspaceProjection | null): Map<string, WorldEntity> {
  return new Map((workspace?.graph.entities ?? []).map((entity) => [entity["@id"], entity]));
}

function attentionValue(workspace: WorkspaceProjection, name: string): unknown {
  return nested(workspace.attention.state, "attention", name);
}

function collectionIds(entity: WorldEntity | null): string[] {
  return entity?.orderedEntityIds ?? [];
}

function secondsLabel(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = Math.floor(safe % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function LockScreen({ onUnlock }: { onUnlock: (password: string) => Promise<boolean> }) {
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(false);
  return (
    <main className={styles.lockScreen}>
      <div className={styles.lockGlow} />
      <section className={styles.lockCard}>
        <span className={styles.sigil}>✦</span>
        <p className={styles.kicker}>Sentinelle · Lucia</p>
        <h1>Entre dans son monde.</h1>
        <p>Les mêmes Moments. Deux regards. Un seul espace où les façonner ensemble.</p>
        <form onSubmit={async (event) => {
          event.preventDefault();
          if (!password || working) return;
          setWorking(true);
          setError(false);
          const ok = await onUnlock(password);
          setWorking(false);
          if (!ok) setError(true);
        }}>
          <input autoFocus type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mot de passe" aria-label="Mot de passe Sentinelle" />
          <button type="submit" disabled={working}>{working ? "Ouverture…" : "Entrer"}</button>
        </form>
        {error ? <small>Ce mot de passe ne passe pas.</small> : null}
      </section>
    </main>
  );
}

function Inspect({ entity, entities, onClose }: {
  entity: WorldEntity;
  entities: Map<string, WorldEntity>;
  onClose: () => void;
}) {
  return (
    <div className={styles.modalBackdrop} onMouseDown={onClose}>
      <section className={styles.inspect} onMouseDown={(event) => event.stopPropagation()} data-semantic-world-id={entity["@id"]}>
        <header><div><p className={styles.kicker}>Ce que Sentinelle voit</p><h2>{entity.name}</h2></div><button type="button" onClick={onClose}>×</button></header>
        <div className={styles.sameObject}><span>Moment</span><code>{entity["@id"]}</code></div>
        <div className={styles.semanticGrid}>
          <section><h3>Propriétés</h3>{Object.entries((nested(entity.state, "moment") as Record<string, unknown>) ?? {}).filter(([, value]) => value !== null && value !== "").slice(0, 8).map(([key, value]) => <p key={key}><span>{key.replaceAll("_", " ")}</span><strong>{String(value)}</strong></p>)}</section>
          <section><h3>Relations</h3>{entity.links.filter((link) => entities.has(link.href)).slice(0, 8).map((link) => <p key={`${link.rel}:${link.href}`}><span>{link.rel.split("/").pop()}</span><strong>{entities.get(link.href)?.name ?? link.href}</strong></p>)}</section>
        </div>
        <section className={styles.possible}><h3>Actions possibles</h3><div>{entity.affordances.map((item) => <span key={item["@id"]}>{item["@id"].split(":").pop()?.replaceAll("-", " ")}</span>)}</div></section>
      </section>
    </div>
  );
}

export default function SentinelleApp() {
  const api = sentinelleApiBase();
  const video = useRef<HTMLVideoElement | null>(null);
  const workspaceRef = useRef<WorkspaceProjection | null>(null);
  const observedCollection = useRef<string | null>(null);
  const [auth, setAuth] = useState<AuthState>("loading");
  const [workspace, setWorkspace] = useState<WorkspaceProjection | null>(null);
  const [notice, setNotice] = useState("");
  const [instruction, setInstruction] = useState("");
  const [playhead, setPlayhead] = useState(0);
  const [inspect, setInspect] = useState(false);
  const [compose, setCompose] = useState(false);
  const [dragged, setDragged] = useState<string | null>(null);

  const entities = useMemo(() => mapEntities(workspace), [workspace]);
  const moments = useMemo(() => [...entities.values()].filter((entity) => typeName(entity) === "Moment" && Boolean(entity.contentUrl)), [entities]);
  const humanFocus = workspace?.presence.find((item) => item.actor === "human")?.focus ?? null;
  const sentinelFocus = workspace?.presence.find((item) => item.actor === "sentinelle")?.focus ?? null;
  const focused = (humanFocus ? entities.get(humanFocus) : null) ?? moments[0] ?? null;
  const currentMoment = focused && typeName(focused) === "Moment" ? focused : moments[0] ?? null;
  const currentIndex = currentMoment ? moments.findIndex((item) => item["@id"] === currentMoment["@id"]) : -1;
  const selection = entities.get(SELECTION_ID) ?? null;
  const compilation = entities.get(COMPILATION_ID) ?? null;
  const sharedCollection = workspace
    ? attentionValue(workspace, "current_selection")
    : null;
  const sharedCollectionEntity = typeof sharedCollection === "string"
    ? entities.get(sharedCollection) ?? null
    : null;
  const activeCollection = sharedCollectionEntity?.orderedEntityIds
    ? sharedCollectionEntity
    : compilation ?? selection;
  const ordered = collectionIds(activeCollection);
  const instructionEntities = [...entities.values()].filter((entity) => typeName(entity) === "Instruction").sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  const currentInstruction = instructionEntities[0] ?? null;
  const instructionStatus = String(currentInstruction ? nested(currentInstruction.state, "instruction", "status") ?? "" : "");
  const working = instructionStatus === "open" || instructionStatus === "working";
  const transcriptLink = currentMoment?.links.find((link) => link.rel.endsWith("/transcript"));
  const transcript = transcriptLink ? entities.get(transcriptLink.href) ?? null : null;
  const excerpt = String(transcript ? nested(transcript.state, "transcript", "excerpt") ?? "" : "");
  const momentState = (currentMoment ? nested(currentMoment.state, "moment") : {}) as Record<string, unknown>;
  const sharedStart = Number(workspace ? attentionValue(workspace, "range_start_seconds") ?? 0 : 0);

  const acceptWorkspace = useCallback((value: WorkspaceProjection) => {
    workspaceRef.current = value;
    setWorkspace(value);
  }, []);

  const loadWorkspace = useCallback(async () => {
    try {
      const response = await fetch(`${api}/workspaces/lucia`, { credentials: "include", headers: { Accept: "application/json" }, cache: "no-store" });
      if (response.status === 401) {
        setAuth("locked");
        setWorkspace(null);
        return;
      }
      if (!response.ok) throw new Error();
      acceptWorkspace(parseWorkspace(await response.json()));
    } catch {
      setNotice("Le monde de Lucia ne répond pas encore.");
    }
  }, [acceptWorkspace, api]);

  useEffect(() => {
    fetch(`${api}/auth/status`, { credentials: "include", cache: "no-store" })
      .then((response) => setAuth(response.ok ? "authenticated" : "locked"))
      .catch(() => setAuth("locked"));
  }, [api]);

  useEffect(() => {
    if (auth !== "authenticated") return;
    void loadWorkspace();
    const events = new EventSource(`${api}/events/lucia`, { withCredentials: true });
    events.addEventListener("world-changed", () => void loadWorkspace());
    events.onerror = () => setNotice("Sentinelle se reconnecte…");
    const fallback = window.setInterval(() => void loadWorkspace(), 6_000);
    return () => { events.close(); window.clearInterval(fallback); };
  }, [api, auth, loadWorkspace]);

  const unlock = useCallback(async (password: string) => {
    try {
      const response = await fetch(`${api}/auth/login`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      if (!response.ok) return false;
      setAuth("authenticated");
      return true;
    } catch {
      return false;
    }
  }, [api]);

  const mutate = useCallback(async (action: string, payload: Record<string, unknown>) => {
    setNotice("");
    try {
      const response = await fetch(`${api}/workspaces/lucia/actions/${action}`, { method: "POST", credentials: "include", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(payload), cache: "no-store" });
      if (response.status === 409) {
        setNotice("Le Moment a changé. Je recharge sa version actuelle.");
        await loadWorkspace();
        return null;
      }
      if (response.status === 401) { setAuth("locked"); return null; }
      if (!response.ok) throw new Error();
      const value = await response.json() as { workspace?: unknown };
      if (!value.workspace) throw new Error();
      const next = parseWorkspace(value.workspace);
      acceptWorkspace(next);
      return next;
    } catch {
      setNotice("Cette transformation n’a pas pu être appliquée.");
      return null;
    }
  }, [acceptWorkspace, api, loadWorkspace]);

  const focusMoment = useCallback(async (moment: WorldEntity, at = 0) => {
    const current = workspaceRef.current;
    if (!current) return null;
    setPlayhead(at);
    return mutate("set-attention", {
      mutationId: mutationId("human-focus-moment"),
      expectedVersion: current.attention.worldVersion,
      currentFocus: moment["@id"],
      currentSelection: activeCollection?.["@id"] ?? null,
      activeArtifact: String(nested(moment.state, "moment", "active_media_derivative_id") ?? moment["@id"]),
      playheadSeconds: at,
      rangeStartSeconds: at
    });
  }, [activeCollection, mutate]);

  useEffect(() => {
    if (!workspace || !moments.length || (humanFocus && entities.get(humanFocus)?.contentUrl)) return;
    void focusMoment(moments[0]);
  }, [entities, focusMoment, humanFocus, moments, workspace]);

  useEffect(() => {
    if (!activeCollection) return;
    const observed = `${activeCollection["@id"]}:${activeCollection.worldVersion ?? 0}`;
    if (observedCollection.current === null) {
      observedCollection.current = observed;
      return;
    }
    if (observedCollection.current !== observed) {
      observedCollection.current = observed;
      if (activeCollection.lastChangeKind === "sentinelle") setCompose(true);
    }
  }, [activeCollection]);

  const navigate = (direction: -1 | 1) => {
    if (!moments.length || currentIndex < 0) return;
    const next = moments[(currentIndex + direction + moments.length) % moments.length];
    void focusMoment(next);
  };

  const shareCurrentTime = async () => {
    if (!currentMoment) return;
    const at = Number((video.current?.currentTime ?? playhead).toFixed(3));
    await focusMoment(currentMoment, at);
  };

  const updateCollection = async (ids: string[], focusId: string | null) => {
    const action = compilation ? "set-compilation" : "set-selection";
    await mutate(action, {
      mutationId: mutationId(`human-${action}`),
      expectedVersion: activeCollection?.worldVersion ?? 0,
      entityIds: ids,
      currentFocus: focusId
    });
  };

  const toggleCurrentMoment = () => {
    if (!currentMoment) return;
    setCompose(true);
    const exists = ordered.includes(currentMoment["@id"]);
    void updateCollection(exists ? ordered.filter((id) => id !== currentMoment["@id"]) : [...ordered, currentMoment["@id"]], exists ? null : currentMoment["@id"]);
  };

  const submitInstruction = async (event: FormEvent) => {
    event.preventDefault();
    if (!instruction.trim() || !currentMoment || working) return;
    await shareCurrentTime();
    const next = await mutate("instruct", {
      mutationId: mutationId("human-instruction"),
      text: instruction.trim(),
      currentFocus: currentMoment["@id"]
    });
    if (next) setInstruction("");
  };

  if (auth === "loading") return <main className={styles.loading}><span>✦</span></main>;
  if (auth === "locked") return <LockScreen onUnlock={unlock} />;
  if (!workspace || !currentMoment) return <main className={styles.loading}><span>✦</span><p>{notice || "Ouverture du monde de Lucia…"}</p></main>;

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brand}><span className={styles.sigil}>✦</span><strong>Sentinelle</strong></div>
        <div className={styles.worldName}><span>Lucia</span><i>·</i><strong>Moments</strong></div>
        <div className={styles.presence}><span>● Luca</span><span className={styles.sentinel}>✦ Sentinelle</span></div>
      </header>

      <section className={styles.stage} data-semantic-world-id={currentMoment["@id"]}>
        {notice ? <button type="button" className={styles.notice} onClick={() => setNotice("")}>{notice}<span>×</span></button> : null}
        <div className={styles.playerColumn}>
          <button className={`${styles.navArrow} ${styles.previous}`} type="button" onClick={() => navigate(-1)} aria-label="Moment précédent">‹</button>
          <div className={styles.videoFrame}>
            <video
              key={`${currentMoment["@id"]}:${currentMoment.worldVersion}:${currentMoment.contentUrl}`}
              ref={video}
              src={currentMoment.contentUrl ?? undefined}
              controls
              playsInline
              preload="metadata"
              onTimeUpdate={(event) => setPlayhead(event.currentTarget.currentTime)}
              onPause={() => void shareCurrentTime()}
              onSeeked={() => void shareCurrentTime()}
            />
            <div className={styles.sharedGaze}><span>●</span><span>✦</span><small>{sentinelFocus === currentMoment["@id"] ? "Vous regardez le même Moment" : "Sentinelle voit ce Moment"}</small></div>
            {currentMoment.lastChangeKind === "sentinelle" ? <div className={styles.changed}>✦ façonné par Sentinelle</div> : null}
          </div>
          <button className={`${styles.navArrow} ${styles.next}`} type="button" onClick={() => navigate(1)} aria-label="Moment suivant">›</button>
        </div>

        <article className={styles.momentDetails}>
          <p className={styles.kicker}>Moment {String(currentIndex + 1).padStart(2, "0")} · {String(moments.length).padStart(2, "0")}</p>
          <h1>{currentMoment.name}</h1>
          {momentState.hook ? <p className={styles.hook}>{String(momentState.hook)}</p> : null}
          <div className={styles.meta}><span>{String(momentState.location ?? "Lucia")}</span><span>{secondsLabel(Number(momentState.active_duration_seconds ?? momentState.duration_seconds ?? 0))}</span>{Number(momentState.range_start_seconds ?? 0) > 0 ? <span>commence à {secondsLabel(Number(momentState.range_start_seconds))}</span> : null}</div>
          {excerpt ? <blockquote>“{excerpt.slice(0, 360)}{excerpt.length > 360 ? "…" : ""}”</blockquote> : null}
          <div className={styles.actions}>
            <button type="button" className={styles.primaryAction} onClick={() => void shareCurrentTime()}>Commencer ici <span>{secondsLabel(playhead)}</span></button>
            <button type="button" onClick={toggleCurrentMoment}>{ordered.includes(currentMoment["@id"]) ? "Retirer de la composition" : "+ Composer"}</button>
            <button type="button" className={styles.more} onClick={() => setInspect(true)} aria-label="Inspecter ce Moment">•••</button>
          </div>
          {sharedStart > 0 ? <p className={styles.sharedMarker}><span /> Point partagé avec Sentinelle · {secondsLabel(sharedStart)}</p> : null}
        </article>
      </section>

      <nav className={styles.momentRail} aria-label="Moments Lucia">
        {moments.map((moment, index) => <button type="button" key={moment["@id"]} className={moment["@id"] === currentMoment["@id"] ? styles.activeMoment : ""} onClick={() => void focusMoment(moment)} data-world-id={moment["@id"]}><span>{String(index + 1).padStart(2, "0")}</span><strong>{moment.name}</strong></button>)}
      </nav>

      {compose ? <section className={styles.composition}>
        <header><div><p className={styles.kicker}>{compilation ? "Compilation" : "Sélection"}</p><h2>Composition</h2></div><span>{ordered.length} Moments</span><button type="button" onClick={() => setCompose(false)}>×</button></header>
        <div className={styles.timeline}>{ordered.map((id, index) => { const moment = entities.get(id); if (!moment) return null; return <button type="button" key={id} draggable onDragStart={() => setDragged(id)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (!dragged || dragged === id) return; const next = [...ordered]; const from = next.indexOf(dragged); const to = next.indexOf(id); next.splice(from, 1); next.splice(to, 0, dragged); setDragged(null); void updateCollection(next, dragged); }} onClick={() => void focusMoment(moment)}><span>{index + 1}</span><strong>{moment.name}</strong><i onClick={(event) => { event.stopPropagation(); void updateCollection(ordered.filter((item) => item !== id), null); }}>×</i></button>; })}</div>
      </section> : null}

      <footer className={styles.composer}>
        <div className={styles.sentient}><span className={working ? styles.working : ""}>✦</span><small>{working ? "Sentinelle façonne le Moment…" : "Sentinelle est ici"}</small></div>
        <form onSubmit={submitInstruction}>
          <span className={styles.contextPill}>celui-là · {secondsLabel(playhead)}</span>
          <input value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="Que veux-tu faire avec celui-là ?" aria-label="Que veux-tu faire avec ce Moment ?" />
          <button type="submit" disabled={!instruction.trim() || working}>↑</button>
        </form>
      </footer>

      {inspect ? <Inspect entity={currentMoment} entities={entities} onClose={() => setInspect(false)} /> : null}
    </main>
  );
}
