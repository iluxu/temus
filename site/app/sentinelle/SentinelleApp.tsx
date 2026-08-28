"use client";

import {
  CSSProperties,
  FormEvent,
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

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type CreativeIdea = {
  id: string;
  family: string;
  icon: string;
  label: string;
  prompt: string;
  hue: number;
};

const CREATIVE_IDEAS: CreativeIdea[] = [
  { id: "surgical-cut", family: "CUT", icon: "✂", label: "Cut chirurgical", prompt: "Construis un cut chirurgical qui ne garde que ce qui sert vraiment ce Moment.", hue: 78 },
  { id: "remove-pauses", family: "CUT", icon: "⌁", label: "Coupe les silences", prompt: "Coupe les silences et les respirations inutiles sans rendre la parole artificielle.", hue: 78 },
  { id: "keep-peak", family: "CUT", icon: "◆", label: "Garde le pic", prompt: "Repère le passage le plus fort et construis tout le montage autour de ce pic.", hue: 78 },
  { id: "eight-seconds", family: "CUT", icon: "8s", label: "Version 8 secondes", prompt: "Fais une version irrésistible de huit secondes maximum.", hue: 78 },
  { id: "fast-pace", family: "CUT", icon: "↯", label: "Rythme nerveux", prompt: "Donne un rythme très nerveux avec des coupes franches et aucune seconde molle.", hue: 78 },
  { id: "reaction-slowmo", family: "CUT", icon: "½", label: "Ralenti réaction", prompt: "Isole la meilleure réaction et ralentis-la juste assez pour lui donner du poids.", hue: 78 },
  { id: "perfect-loop", family: "CUT", icon: "∞", label: "Boucle parfaite", prompt: "Transforme ce Moment en boucle parfaite dont la fin rejoint naturellement le début.", hue: 78 },
  { id: "boomerang", family: "CUT", icon: "↔", label: "Boomerang", prompt: "Crée un boomerang court autour du geste ou du regard le plus mémorable.", hue: 78 },

  { id: "vertical", family: "CADRE", icon: "↕", label: "9:16 plein écran", prompt: "Recadre ce Moment en 9:16 plein écran en préservant toujours le sujet important.", hue: 185 },
  { id: "square", family: "CADRE", icon: "□", label: "Carré 1:1", prompt: "Compose une version carrée 1:1 dense et parfaitement centrée.", hue: 185 },
  { id: "face-track", family: "CADRE", icon: "◎", label: "Suis le visage", prompt: "Recadre dynamiquement pour suivre le visage de Lucia sans mouvement de caméra brutal.", hue: 185 },
  { id: "reaction-punch", family: "CADRE", icon: "+", label: "Zoom réaction", prompt: "Ajoute un punch-in précis sur la réaction la plus savoureuse.", hue: 185 },
  { id: "blurred-canvas", family: "CADRE", icon: "◫", label: "Fond flou vertical", prompt: "Fais une version verticale avec un fond flou élégant dérivé de l’image, jamais un cadre vide.", hue: 185 },
  { id: "stabilize", family: "CADRE", icon: "≈", label: "Stabilise l’image", prompt: "Stabilise les mouvements parasites tout en gardant l’énergie naturelle de la caméra.", hue: 185 },

  { id: "instant-hook", family: "TEXTE", icon: "↗", label: "Hook immédiat", prompt: "Fais comprendre la promesse du Moment dès la première seconde avec un hook très court.", hue: 316 },
  { id: "premium-captions", family: "TEXTE", icon: "Aa", label: "Sous-titres premium", prompt: "Crée des sous-titres premium, très lisibles et synchronisés avec la parole sans doubler le texte déjà présent.", hue: 316 },
  { id: "strong-words", family: "TEXTE", icon: "B", label: "Mots forts", prompt: "Fais apparaître seulement les mots les plus forts avec une animation typographique sobre.", hue: 316 },
  { id: "minimal-title", family: "TEXTE", icon: "—", label: "Titre minimal", prompt: "Remplace le traitement de titre actuel par une accroche minimale digne d’un générique de film.", hue: 316 },
  { id: "english-version", family: "TEXTE", icon: "EN", label: "Version anglaise", prompt: "Crée une version anglaise fidèle avec des sous-titres naturels, courts et bien placés.", hue: 316 },
  { id: "loop-end-card", family: "TEXTE", icon: "↵", label: "Fin qui reboucle", prompt: "Ajoute une fin typographique très brève qui donne envie de revoir immédiatement le début.", hue: 316 },

  { id: "warm-cinema", family: "IMAGE", icon: "◒", label: "Cinéma chaud", prompt: "Donne une colorimétrie cinéma chaude avec des peaux naturelles et des noirs profonds.", hue: 32 },
  { id: "monochrome", family: "IMAGE", icon: "◐", label: "Noir & blanc", prompt: "Passe ce Moment dans un noir et blanc contrasté, doux sur les visages et riche dans les ombres.", hue: 32 },
  { id: "matcha-acid", family: "IMAGE", icon: "✦", label: "Matcha acid", prompt: "Invente un look matcha acid très SF, subtil sur la peau et audacieux dans les hautes lumières.", hue: 32 },
  { id: "dreamy-glow", family: "IMAGE", icon: "☼", label: "Glow dreamy", prompt: "Ajoute un glow onirique léger autour des hautes lumières sans perdre les détails du visage.", hue: 32 },
  { id: "nineties-grain", family: "IMAGE", icon: "⁙", label: "Grain 90s", prompt: "Donne une texture vidéo 90s avec un grain vivant, sans transformer l’image en filtre cheap.", hue: 32 },
  { id: "soft-glitch", family: "IMAGE", icon: "≋", label: "Glitch subtil", prompt: "Place un glitch très court sur un changement d’idée ou une réaction, puis reviens à une image propre.", hue: 32 },

  { id: "clean-voice", family: "SON", icon: "♪", label: "Nettoie la voix", prompt: "Nettoie et rapproche la voix tout en conservant son grain naturel.", hue: 248 },
  { id: "reduce-noise", family: "SON", icon: "≈", label: "Coupe le bruit", prompt: "Réduis le bruit de fond sans créer d’artefacts métalliques sur la voix.", hue: 248 },
  { id: "dramatic-silence", family: "SON", icon: "…", label: "Silence dramatique", prompt: "Crée un silence dramatique très court juste avant la phrase ou la réaction décisive.", hue: 248 },
  { id: "sound-design", family: "SON", icon: "◉", label: "Sound design subtil", prompt: "Crée un sound design original et discret qui souligne les coupes sans voler la scène.", hue: 248 },
  { id: "warm-voiceover", family: "SON", icon: "●", label: "Voix off chaude", prompt: "Écris puis ajoute une voix off française chaude et très courte qui éclaire ce Moment.", hue: 248 },
  { id: "whisper-voiceover", family: "SON", icon: "◌", label: "Voix off chuchotée", prompt: "Ajoute une voix off française chuchotée, intime et parfaitement mixée avec le son original.", hue: 248 },

  { id: "surprise", family: "CARTE BLANCHE", icon: "✦", label: "Fais baver un monteur", prompt: "Prends carte blanche et transforme ce Moment en une pièce que même un excellent monteur voudrait rembobiner, sans trahir Lucia.", hue: 92 }
];

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
  const momentFeed = useRef<HTMLElement | null>(null);
  const composerInput = useRef<HTMLInputElement | null>(null);
  const workspaceRef = useRef<WorkspaceProjection | null>(null);
  const observedCollection = useRef<string | null>(null);
  const feedPositioned = useRef(false);
  const [auth, setAuth] = useState<AuthState>("loading");
  const [workspace, setWorkspace] = useState<WorkspaceProjection | null>(null);
  const [activeMomentId, setActiveMomentId] = useState<string | null>(null);
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
  const [workStep, setWorkStep] = useState(0);
  const [activeIdea, setActiveIdea] = useState<string | null>(null);
  const [readySources, setReadySources] = useState<Set<string>>(() => new Set());
  const [bufferingMomentId, setBufferingMomentId] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installGuide, setInstallGuide] = useState(false);

  const entities = useMemo(() => mapEntities(workspace), [workspace]);
  const moments = useMemo(() => [...entities.values()].filter((entity) => typeName(entity) === "Moment" && Boolean(entity.contentUrl)), [entities]);
  const humanFocus = workspace?.presence.find((item) => item.actor === "human")?.focus ?? null;
  const sentinelFocus = workspace?.presence.find((item) => item.actor === "sentinelle")?.focus ?? null;
  const focused = (humanFocus ? entities.get(humanFocus) : null) ?? moments[0] ?? null;
  const locallyFocused = activeMomentId ? entities.get(activeMomentId) ?? null : null;
  const currentMoment = locallyFocused && typeName(locallyFocused) === "Moment"
    ? locallyFocused
    : focused && typeName(focused) === "Moment"
      ? focused
      : moments[0] ?? null;
  const selection = entities.get(SELECTION_ID) ?? null;
  const compilation = entities.get(COMPILATION_ID) ?? null;
  const baseCollection = compilation ?? selection;
  const sharedCollection = workspace ? attentionValue(workspace, "current_selection") : null;
  const sharedCollectionEntity = typeof sharedCollection === "string" ? entities.get(sharedCollection) ?? null : null;
  const activeCollection = sharedCollectionEntity?.orderedEntityIds ? sharedCollectionEntity : baseCollection;
  const ordered = collectionIds(activeCollection);
  const instructionEntities = [...entities.values()].filter((entity) => typeName(entity) === "Instruction").sort((a, b) => {
    const aCreated = nested(a.state, "instruction", "created_at");
    const bCreated = nested(b.state, "instruction", "created_at");
    if (Boolean(aCreated) !== Boolean(bCreated)) return bCreated ? 1 : -1;
    return String(bCreated ?? b.updatedAt ?? "").localeCompare(String(aCreated ?? a.updatedAt ?? ""));
  });
  const currentInstruction = instructionEntities[0] ?? null;
  const instructionStatus = String(currentInstruction ? nested(currentInstruction.state, "instruction", "status") ?? "" : "");
  const instructionText = String(currentInstruction ? nested(currentInstruction.state, "instruction", "text") ?? "" : "");
  const instructionMessage = String(currentInstruction ? nested(currentInstruction.state, "instruction", "message") ?? "" : "");
  const instructionError = String(currentInstruction ? nested(currentInstruction.state, "instruction", "error") ?? "" : "");
  const working = instructionStatus === "open" || instructionStatus === "working";
  const momentState = (currentMoment ? nested(currentMoment.state, "moment") : {}) as Record<string, unknown>;
  const originalMediaId = String(momentState.media_derivative_id ?? "");
  const activeMediaId = String(momentState.active_media_derivative_id ?? originalMediaId);
  const currentMomentIndex = moments.findIndex((moment) => moment["@id"] === currentMoment?.["@id"]);

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
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || navigatorWithStandalone.standalone === true;
    setInstalled(standalone);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sentinelle-sw.js", {
        scope: "/sentinelle",
        updateViaCache: "none"
      }).catch(() => undefined);
    }

    const rememberPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const rememberInstall = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setInstallGuide(false);
      setNotice("Sentinelle est installée ✦");
    };
    window.addEventListener("beforeinstallprompt", rememberPrompt);
    window.addEventListener("appinstalled", rememberInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", rememberPrompt);
      window.removeEventListener("appinstalled", rememberInstall);
    };
  }, []);

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
    const fallback = window.setInterval(() => void loadWorkspace(), 30_000);
    return () => { events.close(); window.clearInterval(fallback); };
  }, [api, auth, loadWorkspace]);

  useEffect(() => {
    setShowOriginal(false);
    setPlayhead(0);
    setPlaying(false);
  }, [activeMediaId, currentMoment?.["@id"]]);

  useEffect(() => {
    if (!working) {
      setWorkStep(0);
      return;
    }
    setWorkStep(0);
    const timer = window.setInterval(
      () => setWorkStep((value) => (value + 1) % 4),
      3_200
    );
    return () => window.clearInterval(timer);
  }, [currentInstruction?.["@id"], working]);

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
    if (humanFocus || !workspace || !moments.length) return;
    void focusMoment(moments[0]);
  }, [focusMoment, humanFocus, moments, workspace]);

  useEffect(() => {
    const feed = momentFeed.current;
    if (!feed || !moments.length) return;
    const slides = Array.from(feed.querySelectorAll<HTMLElement>("[data-moment-slide]"));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
      if (!visible || visible.intersectionRatio < 0.58) return;
      const momentId = (visible.target as HTMLElement).dataset.momentId;
      if (momentId) setActiveMomentId((current) => current === momentId ? current : momentId);
    }, { root: feed, threshold: [0.58, 0.72, 0.9] });
    slides.forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [moments]);

  useEffect(() => {
    if (!currentMoment) return;
    setActiveMomentId((current) => current ?? currentMoment["@id"]);
    const feed = momentFeed.current;
    if (feed && !feedPositioned.current) {
      const slide = Array.from(feed.querySelectorAll<HTMLElement>("[data-moment-slide]"))
        .find((item) => item.dataset.momentId === currentMoment["@id"]);
      slide?.scrollIntoView({ block: "start" });
      feedPositioned.current = true;
    }
  }, [currentMoment]);

  useEffect(() => {
    if (!activeMomentId) return;
    const players = momentFeed.current?.querySelectorAll<HTMLVideoElement>("video[data-moment-id]") ?? [];
    const activePlayer = Array.from(players).find((player) => player.dataset.momentId === activeMomentId) ?? null;
    players.forEach((player) => {
      if (player !== activePlayer) player.pause();
    });
    if (activePlayer && activePlayer.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      activePlayer.load();
    }
    video.current = activePlayer;
    setPlaying(Boolean(activePlayer && !activePlayer.paused));

    const moment = entities.get(activeMomentId);
    if (!moment || humanFocus === activeMomentId) return;
    const timer = window.setTimeout(() => void focusMoment(moment), 380);
    return () => window.clearTimeout(timer);
  }, [activeMomentId, entities, focusMoment, humanFocus]);

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

  const shareCurrentTime = async () => {
    if (!currentMoment) return;
    const canonical = workspaceRef.current;
    if (canonical) {
      const artifact = attentionValue(canonical, "active_artifact");
      const artifactEntity = typeof artifact === "string"
        ? mapEntities(canonical).get(artifact) ?? null
        : null;
      if (artifactEntity && typeName(artifactEntity) === "ComposedWorld") return;
    }
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

  const toggleMoment = (moment: WorldEntity) => {
    const exists = ordered.includes(moment["@id"]);
    void updateCollection(exists ? ordered.filter((id) => id !== moment["@id"]) : [...ordered, moment["@id"]], exists ? null : moment["@id"]);
  };

  const chooseIdea = (idea: CreativeIdea) => {
    setActiveIdea(idea.id);
    setInstruction(idea.prompt);
    window.requestAnimationFrame(() => composerInput.current?.focus());
  };

  const requestInstall = async () => {
    if (!installPrompt) {
      setInstallGuide(true);
      return;
    }
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setInstallPrompt(null);
    } catch {
      setInstallGuide(true);
    }
  };

  const sendInstruction = async (text: string) => {
    const focusEntity = currentMoment;
    if (!text.trim() || !focusEntity || working) return;
    setConversationActive(true);
    if (typeName(focusEntity) === "Moment") await shareCurrentTime();
    const next = await mutate("instruct", {
      mutationId: mutationId("human-instruction"),
      text: text.trim(),
      currentFocus: focusEntity["@id"]
    });
    if (next) {
      setInstruction("");
      setActiveIdea(null);
    }
  };

  const submitInstruction = (event: FormEvent) => {
    event.preventDefault();
    void sendInstruction(instruction);
  };

  const togglePlayback = (target?: HTMLVideoElement) => {
    const player = target ?? video.current;
    if (!player) return;
    video.current = player;
    if (player.paused) void player.play();
    else player.pause();
  };

  if (auth === "loading") return <main className={styles.loading}><span>✦</span></main>;
  if (auth === "locked") return <LockScreen onUnlock={unlock} />;
  if (!workspace || !currentMoment) return <main className={styles.loading}><span>✦</span><p>{notice || "Lucia arrive…"}</p></main>;

  const knownDuration = Number(momentState.active_duration_seconds ?? momentState.duration_seconds ?? 0);
  const duration = videoDuration || knownDuration;
  const progress = duration > 0 ? Math.min(100, (playhead / duration) * 100) : 0;
  const intentPreview = instructionText.length > 54 ? `${instructionText.slice(0, 54)}…` : instructionText;
  const progressText = [
    `Je relis « ${intentPreview || "ton intention"} ».`,
    "Je regarde exactement le même Moment que toi.",
    "Je prépare une nouvelle version sans toucher à l’original.",
    "Le montage avance. Je te montre le résultat dès qu’il existe."
  ][workStep];

  return (
    <main className={styles.shell}>
      <div className={styles.ambient} />
      <section className={styles.app}>
        <header className={styles.topbar}>
          <div className={styles.brand}><span>✦</span><strong>Sentinelle</strong></div>
          <div className={styles.sharedPresence}><span>● Luca</span><i>+</i><span>✦ ici</span></div>
          <div className={styles.topActions}>
            {!installed ? <button type="button" onClick={() => void requestInstall()} className={styles.installApp} aria-label="Installer Sentinelle sur cet appareil"><b>↓</b><span>Installer</span></button> : null}
            <button type="button" onClick={() => setCompose(true)} className={styles.constellation}><b>{ordered.length}</b><span>Montage</span></button>
          </div>
        </header>

        {working ? <div className={styles.globalWorkBubble} aria-live="polite">
          <div className={styles.requestBubble}><span>●</span><p>{instructionText || "Ta demande"}</p></div>
          <div className={styles.sentinelleProgress}><span>✦</span><p>{progressText}</p><i /></div>
        </div> : null}

        <section
          ref={momentFeed}
          className={styles.momentFeed}
          aria-label="Moments de Lucia"
        >
          {notice ? <button type="button" className={styles.notice} onClick={() => setNotice("")}>{notice}<span>×</span></button> : null}
          {moments.map((moment, index) => {
            const isActive = moment["@id"] === currentMoment["@id"];
            const state = (nested(moment.state, "moment") as Record<string, unknown>) ?? {};
            const originalId = String(state.media_derivative_id ?? "");
            const activeId = String(state.active_media_derivative_id ?? originalId);
            const original = entities.get(originalId) ?? null;
            const active = entities.get(activeId) ?? null;
            const versioned = Boolean(originalId && activeId && originalId !== activeId);
            const media = isActive && showOriginal && original?.contentUrl ? original : active;
            const source = media?.contentUrl ?? moment.contentUrl ?? "";
            const shouldAttach = Math.abs(index - currentMomentIndex) <= 1;
            const shouldWarmNext = index === currentMomentIndex + 1;
            const mediaLoading = isActive && (
              !readySources.has(source) || bufferingMomentId === moment["@id"]
            );
            const transcriptLink = moment.links.find((link) => link.rel.endsWith("/transcript"));
            const transcript = transcriptLink ? entities.get(transcriptLink.href) ?? null : null;
            const momentExcerpt = String(transcript ? nested(transcript.state, "transcript", "excerpt") ?? "" : "");
            const stateDuration = Number(state.active_duration_seconds ?? state.duration_seconds ?? 0);
            const shownDuration = isActive ? duration : stateDuration;
            const kept = ordered.includes(moment["@id"]);
            return <article
              key={moment["@id"]}
              className={styles.momentSlide}
              data-moment-slide
              data-moment-id={moment["@id"]}
              data-world-id={moment["@id"]}
              data-semantic-world-id={moment["@id"]}
              aria-label={`Moment ${index + 1} sur ${moments.length} — ${cleanMomentName(moment.name)}`}
            >
              <div className={styles.videoFrame}>
                <video
                  key={`${moment["@id"]}:${source}`}
                  data-moment-id={moment["@id"]}
                  data-media-attached={shouldAttach ? "true" : "false"}
                  src={shouldAttach && source ? source : undefined}
                  playsInline
                  preload={isActive ? "auto" : shouldWarmNext ? "metadata" : "none"}
                  muted={isActive ? muted : true}
                  onClick={(event) => {
                    setActiveMomentId(moment["@id"]);
                    togglePlayback(event.currentTarget);
                  }}
                  onLoadStart={() => { if (isActive) setBufferingMomentId(moment["@id"]); }}
                  onLoadedData={() => {
                    if (source) setReadySources((current) => current.has(source) ? current : new Set(current).add(source));
                    setBufferingMomentId((current) => current === moment["@id"] ? null : current);
                  }}
                  onCanPlay={() => {
                    if (source) setReadySources((current) => current.has(source) ? current : new Set(current).add(source));
                    setBufferingMomentId((current) => current === moment["@id"] ? null : current);
                  }}
                  onWaiting={() => { if (isActive) setBufferingMomentId(moment["@id"]); }}
                  onLoadedMetadata={(event) => { if (isActive) setVideoDuration(event.currentTarget.duration); }}
                  onTimeUpdate={(event) => { if (isActive) setPlayhead(event.currentTarget.currentTime); }}
                  onPlay={(event) => {
                    setActiveMomentId(moment["@id"]);
                    video.current = event.currentTarget;
                    setPlaying(true);
                  }}
                  onPlaying={() => setBufferingMomentId((current) => current === moment["@id"] ? null : current)}
                  onPause={() => { if (isActive) { setPlaying(false); void shareCurrentTime(); } }}
                  onSeeked={() => { if (isActive) void shareCurrentTime(); }}
                  onEnded={() => { if (isActive) setPlaying(false); }}
                />
                <div className={styles.videoShade} />
                <div className={styles.momentCount}>{index + 1}<span>/</span>{moments.length}</div>
                <div className={`${styles.coPresence} ${sentinelFocus === moment["@id"] ? styles.together : ""}`} title="Luca et Sentinelle regardent le même Moment"><span>●</span><span>✦</span></div>
                {isActive && versioned ? <div className={styles.versionToggle}><button type="button" className={showOriginal ? styles.versionActive : ""} onClick={() => setShowOriginal(true)}>Original</button><button type="button" className={!showOriginal ? styles.versionActive : ""} onClick={() => setShowOriginal(false)}>Version ✦</button></div> : null}
                {mediaLoading ? <div className={styles.mediaLoading} aria-live="polite"><i /><span>Le Moment arrive</span></div> : null}
                {isActive && !mediaLoading && !playing ? <button type="button" className={styles.play} onClick={() => togglePlayback()} aria-label={`Lire ${cleanMomentName(moment.name)}`}><span>▶</span></button> : null}
                <div className={styles.actions}>
                  <button type="button" className={kept ? styles.kept : ""} onClick={() => toggleMoment(moment)} aria-label={kept ? "Retirer du montage" : "Ajouter au montage"}><span>{kept ? "✓" : "+"}</span><small>{kept ? "Montage" : "Ajouter"}</small></button>
                  <button type="button" onClick={() => { setActiveMomentId(moment["@id"]); setInspect(true); }} aria-label="Voir ce que Sentinelle comprend"><span>•••</span><small>Voir</small></button>
                </div>
                <div className={styles.caption}>
                  {versioned && !(isActive && showOriginal) ? <span className={styles.shaped}>✦ version montée</span> : null}
                  <h1>{cleanMomentName(moment.name)}</h1>
                  <p>{momentExcerpt ? `${momentExcerpt.slice(0, 118)}${momentExcerpt.length > 118 ? "…" : ""}` : String(state.hook ?? "Un Moment de Lucia")}</p>
                  <div className={styles.meta}><span>{String(state.location ?? "Lucia")}</span><i>·</i><span>{secondsLabel(shownDuration)}</span></div>
                </div>
                {isActive ? <div className={styles.playerControls}>
                  <button type="button" onClick={() => togglePlayback()} aria-label={playing ? "Pause" : "Lire"}>{playing ? "Ⅱ" : "▶"}</button>
                  <span>{secondsLabel(playhead)}</span>
                  <input type="range" min="0" max={Math.max(duration, 0.01)} step="0.01" value={Math.min(playhead, Math.max(duration, 0.01))} onChange={(event) => { const at = Number(event.target.value); setPlayhead(at); if (video.current) video.current.currentTime = at; }} style={{ "--progress": `${progress}%` } as CSSProperties} aria-label="Position dans le Moment" />
                  <button type="button" onClick={() => { const next = !muted; setMuted(next); if (video.current) video.current.muted = next; }} aria-label={muted ? "Activer le son" : "Couper le son"}>{muted ? "×♪" : "♪"}</button>
                </div> : null}
              </div>
              {index < moments.length - 1 ? <div className={styles.scrollCue}><span>Moment suivant</span><b>↓</b></div> : null}
            </article>;
          })}
        </section>

        <footer className={styles.composer}>
          {conversationActive && (instructionMessage || instructionError) && !working ? <div className={`${styles.reply} ${instructionError ? styles.replyError : ""}`}><span>✦</span><p>{instructionError ? "Je n’ai pas réussi cette transformation." : instructionMessage}</p><button type="button" onClick={() => setConversationActive(false)}>×</button></div> : null}
          <div className={styles.ideasIntro}><span>✦ POSSIBILITÉS DU WORKER</span><small>Touche une bulle, puis rends la demande encore plus tienne.</small></div>
          <div className={styles.ideaCloud} aria-label="Possibilités créatives pour ce Moment" role="list">
            {CREATIVE_IDEAS.map((idea) => <button
              type="button"
              role="listitem"
              key={idea.id}
              disabled={working}
              className={`${styles.ideaBubble} ${activeIdea === idea.id ? styles.ideaActive : ""}`}
              style={{ "--idea-hue": idea.hue } as CSSProperties}
              onClick={() => chooseIdea(idea)}
              aria-label={`${idea.family} — ${idea.label}`}
            ><span>{idea.icon}</span><strong>{idea.label}</strong><small>{idea.family}</small></button>)}
          </div>
          <form onSubmit={submitInstruction}>
            <span>✦</span>
            <input ref={composerInput} value={instruction} onChange={(event) => { setInstruction(event.target.value); setActiveIdea(null); }} placeholder="Décris librement le montage de ce Moment…" aria-label="Décris le montage vidéo à Sentinelle" />
            <button type="submit" disabled={!instruction.trim() || working} aria-label="Envoyer">↑</button>
          </form>
        </footer>

        {compose ? <section className={styles.composition}>
          <header><div><span>TON MONTAGE</span><h2>{ordered.length ? `${ordered.length} Moments` : "Ajoute des Moments"}</h2></div><button type="button" onClick={() => setCompose(false)}>×</button></header>
          {ordered.length ? <div className={styles.timeline}>{ordered.map((id, index) => { const moment = entities.get(id); if (!moment) return null; return <button type="button" key={id} draggable onDragStart={() => setDragged(id)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (!dragged || dragged === id) return; const next = [...ordered]; const from = next.indexOf(dragged); const to = next.indexOf(id); next.splice(from, 1); next.splice(to, 0, dragged); setDragged(null); void updateCollection(next, dragged); }} onClick={() => { setActiveMomentId(moment["@id"]); setCompose(false); const slide = Array.from(momentFeed.current?.querySelectorAll<HTMLElement>("[data-moment-slide]") ?? []).find((item) => item.dataset.momentId === moment["@id"]); slide?.scrollIntoView({ behavior: "smooth", block: "start" }); }}><span>{index + 1}</span><strong>{cleanMomentName(moment.name)}</strong><i onClick={(event) => { event.stopPropagation(); void updateCollection(ordered.filter((item) => item !== id), null); }}>×</i></button>; })}</div> : <p>Fais défiler les Moments et ajoute ceux que tu veux monter. Rien n’est publié automatiquement.</p>}
        </section> : null}

        {installGuide ? <div className={styles.modalBackdrop} onMouseDown={() => setInstallGuide(false)}>
          <section className={styles.installGuide} onMouseDown={(event) => event.stopPropagation()} aria-label="Installer Sentinelle">
            <header><div><span>TON APP SENTINELLE</span><h2>Installe-moi sur ton écran d’accueil.</h2></div><button type="button" onClick={() => setInstallGuide(false)}>×</button></header>
            <p>Ensuite je m’ouvre en plein écran, comme une vraie app — sans tunnel SSH ni barre de navigateur.</p>
            <div className={styles.installPaths}>
              <div><b>iPhone / iPad</b><span><i>1</i> Touche Partager <strong>↥</strong></span><span><i>2</i> Choisis « Sur l’écran d’accueil »</span></div>
              <div><b>Android / Chrome</b><span><i>1</i> Ouvre le menu <strong>⋮</strong></span><span><i>2</i> Choisis « Installer l’application »</span></div>
            </div>
            <button type="button" className={styles.installDone} onClick={() => setInstallGuide(false)}>J’ai trouvé <span>✦</span></button>
          </section>
        </div> : null}

        {inspect ? <Inspect entity={currentMoment} entities={entities} onClose={() => setInspect(false)} /> : null}
      </section>
    </main>
  );
}
