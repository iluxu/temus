"use client";

import {
  CSSProperties,
  FormEvent,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
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

function cleanMomentName(value: string): string {
  return value.replace(/^Radar\s+\d+\s*[-–—]\s*/i, "").trim();
}

function LockScreen({ onUnlock }: { onUnlock: (password: string) => Promise<boolean> }) {
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(false);
  return (
    <main className={styles.lockScreen}>
      <div className={styles.lockGlow} />
      <section className={styles.lockCard}>
        <div className={styles.lockMark}>✦</div>
        <p>ENTRE DANS</p>
        <h1>Sentinelle</h1>
        <span>Lucia, en Moments.</span>
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
          <button type="submit" disabled={working} aria-label="Entrer">{working ? "…" : "→"}</button>
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
  const state = (nested(entity.state, "moment") as Record<string, unknown>) ?? {};
  return (
    <div className={styles.modalBackdrop} onMouseDown={onClose}>
      <section className={styles.inspect} onMouseDown={(event) => event.stopPropagation()} data-semantic-world-id={entity["@id"]}>
        <header>
          <div><span>Same reality</span><h2>{cleanMomentName(entity.name)}</h2></div>
          <button type="button" onClick={onClose}>×</button>
        </header>
        <div className={styles.sameReality}>
          <div><i>●</i><span>Luca voit</span><strong>un Moment de Lucia</strong></div>
          <b>↔</b>
          <div><i>✦</i><span>Sentinelle voit</span><strong>ce même Moment, ses sources et ses possibilités</strong></div>
        </div>
        <div className={styles.entityId}>{entity["@id"]}</div>
        <dl>
          {Object.entries(state).filter(([, value]) => value !== null && value !== "" && typeof value !== "object").slice(0, 6).map(([key, value]) => <div key={key}><dt>{key.replaceAll("_", " ")}</dt><dd>{String(value)}</dd></div>)}
        </dl>
        <div className={styles.relations}>{entity.links.filter((link) => entities.has(link.href)).slice(0, 5).map((link) => <span key={`${link.rel}:${link.href}`}>{link.rel.split("/").pop()} · {entities.get(link.href)?.name}</span>)}</div>
      </section>
    </div>
  );
}

export default function SentinelleApp() {
  const api = sentinelleApiBase();
  const video = useRef<HTMLVideoElement | null>(null);
  const workspaceRef = useRef<WorkspaceProjection | null>(null);
  const observedCollection = useRef<string | null>(null);
  const swipeStart = useRef<number | null>(null);
  const [auth, setAuth] = useState<AuthState>("loading");
  const [workspace, setWorkspace] = useState<WorkspaceProjection | null>(null);
  const [notice, setNotice] = useState("");
  const [instruction, setInstruction] = useState("");
  const [playhead, setPlayhead] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [inspect, setInspect] = useState(false);
  const [compose, setCompose] = useState(false);
  const [dragged, setDragged] = useState<string | null>(null);
  const [conversationActive, setConversationActive] = useState(false);

  const entities = useMemo(() => mapEntities(workspace), [workspace]);
  const moments = useMemo(() => [...entities.values()].filter((entity) => typeName(entity) === "Moment" && Boolean(entity.contentUrl)), [entities]);
  const humanFocus = workspace?.presence.find((item) => item.actor === "human")?.focus ?? null;
  const sentinelFocus = workspace?.presence.find((item) => item.actor === "sentinelle")?.focus ?? null;
  const focused = (humanFocus ? entities.get(humanFocus) : null) ?? moments[0] ?? null;
  const currentMoment = focused && typeName(focused) === "Moment" ? focused : moments[0] ?? null;
  const currentIndex = currentMoment ? moments.findIndex((item) => item["@id"] === currentMoment["@id"]) : -1;
  const selection = entities.get(SELECTION_ID) ?? null;
  const compilation = entities.get(COMPILATION_ID) ?? null;
  const sharedCollection = workspace ? attentionValue(workspace, "current_selection") : null;
  const sharedCollectionEntity = typeof sharedCollection === "string" ? entities.get(sharedCollection) ?? null : null;
  const activeCollection = sharedCollectionEntity?.orderedEntityIds ? sharedCollectionEntity : compilation ?? selection;
  const ordered = collectionIds(activeCollection);
  const instructionEntities = [...entities.values()].filter((entity) => typeName(entity) === "Instruction").sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  const currentInstruction = instructionEntities[0] ?? null;
  const instructionStatus = String(currentInstruction ? nested(currentInstruction.state, "instruction", "status") ?? "" : "");
  const instructionMessage = String(currentInstruction ? nested(currentInstruction.state, "instruction", "message") ?? "" : "");
  const instructionError = String(currentInstruction ? nested(currentInstruction.state, "instruction", "error") ?? "" : "");
  const working = instructionStatus === "open" || instructionStatus === "working";
  const transcriptLink = currentMoment?.links.find((link) => link.rel.endsWith("/transcript"));
  const transcript = transcriptLink ? entities.get(transcriptLink.href) ?? null : null;
  const excerpt = String(transcript ? nested(transcript.state, "transcript", "excerpt") ?? "" : "");
  const momentState = (currentMoment ? nested(currentMoment.state, "moment") : {}) as Record<string, unknown>;
  const originalMediaId = String(momentState.media_derivative_id ?? "");
  const activeMediaId = String(momentState.active_media_derivative_id ?? originalMediaId);
  const originalMedia = entities.get(originalMediaId) ?? null;
  const activeMedia = entities.get(activeMediaId) ?? null;
  const hasVersion = Boolean(originalMediaId && activeMediaId && originalMediaId !== activeMediaId);
  const visibleMedia = showOriginal && originalMedia?.contentUrl ? originalMedia : activeMedia;
  const videoSource = visibleMedia?.contentUrl ?? currentMoment?.contentUrl ?? "";

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
      setNotice("");
    } catch {
      setNotice("Je reviens…");
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
    events.onerror = () => setNotice("Reconnexion…");
    const fallback = window.setInterval(() => void loadWorkspace(), 6_000);
    return () => { events.close(); window.clearInterval(fallback); };
  }, [api, auth, loadWorkspace]);

  useEffect(() => {
    setShowOriginal(false);
    setPlayhead(0);
    setPlaying(false);
  }, [activeMediaId, currentMoment?.["@id"]]);

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
        setNotice("Ce Moment a évolué — je charge sa version actuelle.");
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
      setNotice("Je n’ai pas pu appliquer ça.");
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
    const exists = ordered.includes(currentMoment["@id"]);
    void updateCollection(exists ? ordered.filter((id) => id !== currentMoment["@id"]) : [...ordered, currentMoment["@id"]], exists ? null : currentMoment["@id"]);
  };

  const sendInstruction = async (text: string) => {
    if (!text.trim() || !currentMoment || working) return;
    setConversationActive(true);
    await shareCurrentTime();
    const next = await mutate("instruct", {
      mutationId: mutationId("human-instruction"),
      text: text.trim(),
      currentFocus: currentMoment["@id"]
    });
    if (next) setInstruction("");
  };

  const submitInstruction = (event: FormEvent) => {
    event.preventDefault();
    void sendInstruction(instruction);
  };

  const togglePlayback = () => {
    const player = video.current;
    if (!player) return;
    if (player.paused) void player.play();
    else player.pause();
  };

  const finishSwipe = (event: ReactPointerEvent<HTMLElement>) => {
    if (swipeStart.current === null) return;
    const distance = event.clientX - swipeStart.current;
    swipeStart.current = null;
    if (Math.abs(distance) > 54) navigate(distance > 0 ? -1 : 1);
  };

  if (auth === "loading") return <main className={styles.loading}><span>✦</span></main>;
  if (auth === "locked") return <LockScreen onUnlock={unlock} />;
  if (!workspace || !currentMoment) return <main className={styles.loading}><span>✦</span><p>{notice || "Lucia arrive…"}</p></main>;

  const selected = ordered.includes(currentMoment["@id"]);
  const title = cleanMomentName(currentMoment.name);
  const knownDuration = Number(momentState.active_duration_seconds ?? momentState.duration_seconds ?? 0);
  const duration = videoDuration || knownDuration;
  const progress = duration > 0 ? Math.min(100, (playhead / duration) * 100) : 0;
  const shellStyle = videoSource ? ({ "--moment-art": `url("${videoSource}")` } as CSSProperties) : undefined;

  return (
    <main className={styles.shell} style={shellStyle}>
      <div className={styles.ambient} />
      <section className={styles.app}>
        <header className={styles.topbar}>
          <div className={styles.brand}><span>✦</span><strong>Sentinelle</strong></div>
          <div className={styles.sharedPresence}><span>● Luca</span><i>+</i><span>✦ ici</span></div>
          <button type="button" onClick={() => setCompose(true)} className={styles.constellation}><b>{ordered.length}</b><span>Moments</span></button>
        </header>

        <section
          className={styles.moment}
          data-semantic-world-id={currentMoment["@id"]}
          onPointerDown={(event) => { swipeStart.current = event.clientX; }}
          onPointerUp={finishSwipe}
        >
          {notice ? <button type="button" className={styles.notice} onClick={() => setNotice("")}>{notice}<span>×</span></button> : null}
          <div className={styles.videoFrame}>
            <video
              key={`${currentMoment["@id"]}:${videoSource}`}
              ref={video}
              src={videoSource || undefined}
              playsInline
              preload="metadata"
              muted={muted}
              onClick={togglePlayback}
              onLoadedMetadata={(event) => setVideoDuration(event.currentTarget.duration)}
              onTimeUpdate={(event) => setPlayhead(event.currentTarget.currentTime)}
              onPlay={() => setPlaying(true)}
              onPause={() => { setPlaying(false); void shareCurrentTime(); }}
              onSeeked={() => void shareCurrentTime()}
              onEnded={() => setPlaying(false)}
            />
            <div className={styles.videoShade} />
            <div className={styles.momentCount}>{currentIndex + 1}<span>/</span>{moments.length}</div>
            <div className={`${styles.coPresence} ${sentinelFocus === currentMoment["@id"] ? styles.together : ""}`} title="Luca et Sentinelle regardent le même Moment"><span>●</span><span>✦</span></div>
            {hasVersion ? <div className={styles.versionToggle}><button type="button" className={showOriginal ? styles.versionActive : ""} onClick={() => setShowOriginal(true)}>Original</button><button type="button" className={!showOriginal ? styles.versionActive : ""} onClick={() => setShowOriginal(false)}>Version ✦</button></div> : null}
            {working ? <div className={styles.workingLayer}><span>✦</span><p>Je façonne ce Moment…</p></div> : null}
            {!playing && !working ? <button type="button" className={styles.play} onClick={togglePlayback} aria-label="Lire"><span>▶</span></button> : null}
            <button className={`${styles.nav} ${styles.previous}`} type="button" onClick={() => navigate(-1)} aria-label="Moment précédent">‹</button>
            <button className={`${styles.nav} ${styles.next}`} type="button" onClick={() => navigate(1)} aria-label="Moment suivant">›</button>
            <div className={styles.actions}>
              <button type="button" className={selected ? styles.kept : ""} onClick={toggleCurrentMoment} aria-label={selected ? "Retirer de ma sélection" : "Garder ce Moment"}><span>{selected ? "✓" : "+"}</span><small>{selected ? "Gardé" : "Garder"}</small></button>
              <button type="button" onClick={() => setInspect(true)} aria-label="Voir ce que Sentinelle comprend"><span>•••</span><small>Voir</small></button>
            </div>
            <div className={styles.caption}>
              {hasVersion && !showOriginal ? <span className={styles.shaped}>✦ nouvelle version</span> : null}
              <h1>{title}</h1>
              <p>{excerpt ? `${excerpt.slice(0, 118)}${excerpt.length > 118 ? "…" : ""}` : String(momentState.hook ?? "Un Moment de Lucia")}</p>
              <div className={styles.meta}><span>{String(momentState.location ?? "Lucia")}</span><i>·</i><span>{secondsLabel(duration)}</span></div>
            </div>
            <div className={styles.playerControls}>
              <button type="button" onClick={togglePlayback} aria-label={playing ? "Pause" : "Lire"}>{playing ? "Ⅱ" : "▶"}</button>
              <span>{secondsLabel(playhead)}</span>
              <input type="range" min="0" max={Math.max(duration, 0.01)} step="0.01" value={Math.min(playhead, Math.max(duration, 0.01))} onChange={(event) => { const at = Number(event.target.value); setPlayhead(at); if (video.current) video.current.currentTime = at; }} style={{ "--progress": `${progress}%` } as CSSProperties} aria-label="Position dans le Moment" />
              <button type="button" onClick={() => { const next = !muted; setMuted(next); if (video.current) video.current.muted = next; }} aria-label={muted ? "Activer le son" : "Couper le son"}>{muted ? "×♪" : "♪"}</button>
            </div>
          </div>

          <nav className={styles.momentRail} aria-label="Moments Lucia">
            {moments.map((moment, index) => <button type="button" key={moment["@id"]} className={moment["@id"] === currentMoment["@id"] ? styles.activeMoment : ""} onClick={() => void focusMoment(moment)} data-world-id={moment["@id"]} aria-label={cleanMomentName(moment.name)}><span>{String(index + 1).padStart(2, "0")}</span></button>)}
          </nav>
        </section>

        <footer className={styles.composer}>
          {conversationActive && (instructionMessage || instructionError) && !working ? <div className={`${styles.reply} ${instructionError ? styles.replyError : ""}`}><span>✦</span><p>{instructionError ? "Je n’ai pas réussi cette transformation." : instructionMessage}</p><button type="button" onClick={() => setConversationActive(false)}>×</button></div> : null}
          <div className={styles.suggestions} aria-label="Idées de transformation">
            {["Plus nerveux", "Coupe les blancs", "Noir & blanc", "Format carré"].map((idea) => <button type="button" key={idea} disabled={working} onClick={() => void sendInstruction(`${idea}, sur celui-là.`)}>{idea}</button>)}
          </div>
          <form onSubmit={submitInstruction}>
            <span>✦</span>
            <input value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="Que veux-tu faire avec celui-là ?" aria-label="Que veux-tu faire avec ce Moment ?" />
            <button type="submit" disabled={!instruction.trim() || working} aria-label="Envoyer">↑</button>
          </form>
        </footer>

        {compose ? <section className={styles.composition}>
          <header><div><span>CONSTELLATION</span><h2>{ordered.length ? `${ordered.length} Moments` : "Choisis tes Moments"}</h2></div><button type="button" onClick={() => setCompose(false)}>×</button></header>
          {ordered.length ? <div className={styles.timeline}>{ordered.map((id, index) => { const moment = entities.get(id); if (!moment) return null; return <button type="button" key={id} draggable onDragStart={() => setDragged(id)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (!dragged || dragged === id) return; const next = [...ordered]; const from = next.indexOf(dragged); const to = next.indexOf(id); next.splice(from, 1); next.splice(to, 0, dragged); setDragged(null); void updateCollection(next, dragged); }} onClick={() => { void focusMoment(moment); setCompose(false); }}><span>{index + 1}</span><strong>{cleanMomentName(moment.name)}</strong><i onClick={(event) => { event.stopPropagation(); void updateCollection(ordered.filter((item) => item !== id), null); }}>×</i></button>; })}</div> : <p>Garde les Moments qui te donnent envie. Sentinelle travaille exactement avec cette constellation.</p>}
        </section> : null}

        {inspect ? <Inspect entity={currentMoment} entities={entities} onClose={() => setInspect(false)} /> : null}
      </section>
    </main>
  );
}
