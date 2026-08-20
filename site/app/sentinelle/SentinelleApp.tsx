"use client";

import {
  DragEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { HumanEntityRenderer } from "./renderers";
import {
  TemplateId,
  WorkspaceProjection,
  WorldEntity,
  WorldTemplate,
  nested,
  parseTemplates,
  parseWorkspace,
  sentinelleApiBase,
  typeName
} from "./world";
import styles from "./sentinelle.module.css";

const SELECTION_ID = "urn:adoptan:selection:44";
const COMPILATION_ID = "urn:adoptan:compilation:12";
const MAX_FILE_BYTES = 15 * 1024 * 1024;

type RequestState = "loading" | "ready" | "refreshing" | "error";
type AuthState = "loading" | "locked" | "authenticated";
type ViewMode = "canvas" | "list";
type AddMode = "text" | "url" | null;

function mutationId(prefix: string): string {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}:${suffix}`;
}

function entityMap(workspace: WorkspaceProjection | null): Map<string, WorldEntity> {
  return new Map((workspace?.graph.entities ?? []).map((entity) => [entity["@id"], entity]));
}

function attentionSelection(workspace: WorkspaceProjection | null): string[] {
  const value = workspace ? nested(workspace.attention.state, "attention", "current_selection") : null;
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return typeof value === "string" ? [value] : [];
}

function activeArtifact(workspace: WorkspaceProjection | null): string | null {
  const value = workspace ? nested(workspace.attention.state, "attention", "active_artifact") : null;
  return typeof value === "string" ? value : null;
}

function fileKind(file: File): "image" | "pdf" | "csv" | "file" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return "pdf";
  if (file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv")) return "csv";
  return "file";
}

async function fileBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
  }
  return btoa(binary);
}

function publicUrl(entity: WorldEntity): string | null {
  const value = nested(entity.state, "moment", "public_url");
  return typeof value === "string" && value.startsWith("https://") ? value : null;
}

function clipSlug(url: string): string | null {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    const marker = parts.lastIndexOf("clip");
    return marker >= 0 ? parts[marker + 1] ?? null : parts[parts.length - 1] ?? null;
  } catch {
    return null;
  }
}

function LockScreen({ onUnlock }: { onUnlock: (password: string) => Promise<boolean> }) {
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(false);
  return (
    <main className={styles.lockScreen}>
      <div className={styles.lockAura} />
      <section className={styles.lockCard}>
        <span className={styles.brandOrb}>✦</span>
        <p className={styles.eyebrow}>Sentinelle · Full mode</p>
        <h1>Entre dans notre espace.</h1>
        <p>Un endroit calme où toi et Sentinelle travaillez directement sur les mêmes objets.</p>
        <form onSubmit={async (event) => {
          event.preventDefault();
          if (!password || working) return;
          setWorking(true);
          setError(false);
          const unlocked = await onUnlock(password);
          setWorking(false);
          if (!unlocked) setError(true);
        }}>
          <input
            type="password"
            value={password}
            autoFocus
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mot de passe"
            aria-label="Mot de passe Full Sentinelle"
          />
          <button type="submit" disabled={working}>{working ? "Ouverture…" : "Entrer"}</button>
        </form>
        {error ? <small>Ce mot de passe ne passe pas.</small> : null}
      </section>
    </main>
  );
}

function Templates({ templates, current, onOpen, onClose }: {
  templates: WorldTemplate[];
  current: TemplateId;
  onOpen: (template: TemplateId) => void;
  onClose: () => void;
}) {
  return (
    <div className={styles.modalBackdrop} onMouseDown={onClose}>
      <section className={styles.templateModal} onMouseDown={(event) => event.stopPropagation()}>
        <header><div><p className={styles.eyebrow}>Nouveau World</p><h2>À quoi veux-tu donner vie ?</h2></div><button type="button" onClick={onClose}>×</button></header>
        <div className={styles.templateGrid}>
          {templates.map((template) => (
            <button
              type="button"
              key={template.id}
              disabled={!template.available}
              className={template.id === current ? styles.templateCurrent : ""}
              onClick={() => template.available && onOpen(template.id as TemplateId)}
            >
              <span>{template.id === "blank" ? "+" : template.id === "lucia" ? "▶" : template.id === "document" ? "¶" : template.id === "table" ? "T" : "R"}</span>
              <strong>{template.id === "blank" ? "Blank" : template.name}</strong>
              <small>{template.description}</small>
              {!template.available ? <em>Bientôt</em> : null}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function InspectPanel({ entity, onClose }: { entity: WorldEntity; onClose: () => void }) {
  return (
    <div className={styles.modalBackdrop} onMouseDown={onClose}>
      <section className={styles.inspectPanel} onMouseDown={(event) => event.stopPropagation()} data-semantic-world-id={entity["@id"]}>
        <header><div><p className={styles.eyebrow}>Ce que Sentinelle voit</p><h2>{entity.name}</h2></div><button type="button" onClick={onClose}>×</button></header>
        <div className={styles.inspectIdentity}><span>{typeName(entity)}</span><code>{entity["@id"]}</code></div>
        <section><h3>Propriétés</h3>{Object.entries(entity.state).slice(0, 8).map(([name, value]) => <div key={name}><span>{name}</span><strong>{typeof value === "string" ? value : JSON.stringify(value)}</strong></div>)}</section>
        <section><h3>Relations</h3>{entity.links.slice(0, 8).map((link) => <div key={`${link.rel}:${link.href}`}><span>{link.rel.split("/").pop()}</span><strong>{link.href}</strong></div>)}</section>
        <section><h3>Actions possibles</h3><p className={styles.actionChips}>{entity.affordances.map((item) => <span key={item["@id"]}>{item["@id"].split(":").pop()}</span>)}</p></section>
      </section>
    </div>
  );
}

export default function SentinelleApp() {
  const api = sentinelleApiBase();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const workspaceRef = useRef<WorkspaceProjection | null>(null);
  const [auth, setAuth] = useState<AuthState>("loading");
  const [templates, setTemplates] = useState<WorldTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<TemplateId>("blank");
  const [workspace, setWorkspace] = useState<WorkspaceProjection | null>(null);
  const [status, setStatus] = useState<RequestState>("loading");
  const [notice, setNotice] = useState("");
  const [view, setView] = useState<ViewMode>("canvas");
  const [railOpen, setRailOpen] = useState(true);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [addTitle, setAddTitle] = useState("");
  const [addValue, setAddValue] = useState("");
  const [instruction, setInstruction] = useState("");
  const [inspect, setInspect] = useState<WorldEntity | null>(null);
  const [editing, setEditing] = useState<WorldEntity | null>(null);
  const [editValue, setEditValue] = useState("");
  const [draggingMoment, setDraggingMoment] = useState<string | null>(null);
  const [preview, setPreview] = useState<WorldEntity | null>(null);
  const [dropActive, setDropActive] = useState(false);

  const entities = useMemo(() => entityMap(workspace), [workspace]);
  const humanFocus = workspace?.presence.find((item) => item.actor === "human")?.focus ?? null;
  const sentinelFocus = workspace?.presence.find((item) => item.actor === "sentinelle")?.focus ?? null;
  const selectedIds = attentionSelection(workspace);
  const artifactId = activeArtifact(workspace);
  const focusedEntity = humanFocus ? entities.get(humanFocus) ?? null : null;
  const selection = entities.get(SELECTION_ID) ?? null;
  const compilation = entities.get(COMPILATION_ID) ?? null;
  const activeCollection = compilation ?? selection;
  const collectionIds = activeCollection?.orderedEntityIds ?? [];
  const moments = [...entities.values()].filter((entity) => typeName(entity) === "Moment");
  const instructions = [...entities.values()]
    .filter((entity) => typeName(entity) === "Instruction")
    .sort((left, right) => (right.updatedAt ?? "").localeCompare(left.updatedAt ?? ""));
  const currentInstruction = instructions[0] ?? null;
  const instructionStatus = currentInstruction ? String(nested(currentInstruction.state, "instruction", "status") ?? "") : "";
  const working = instructionStatus === "open" || instructionStatus === "working";
  const canvasEntities = [...entities.values()]
    .filter((entity) => !["World", "SharedAttention", "Instruction", "Clip", "Transcript", "MediaDerivative"].includes(typeName(entity)))
    .filter((entity) => activeTemplate === "blank" || !["Selection", "Compilation"].includes(typeName(entity)));

  const acceptWorkspace = useCallback((value: WorkspaceProjection) => {
    workspaceRef.current = value;
    setWorkspace(value);
    setStatus("ready");
  }, []);

  const loadWorkspace = useCallback(async (template: TemplateId, background = false) => {
    setStatus(background ? "refreshing" : "loading");
    try {
      const response = await fetch(`${api}/workspaces/${template}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (response.status === 401) {
        setAuth("locked");
        setWorkspace(null);
        return;
      }
      if (!response.ok) throw new Error();
      acceptWorkspace(parseWorkspace(await response.json()));
    } catch {
      setStatus("error");
      setNotice("Le World est momentanément indisponible.");
    }
  }, [acceptWorkspace, api]);

  useEffect(() => {
    let live = true;
    Promise.all([
      fetch(`${api}/templates`, { credentials: "include", cache: "no-store" }).then((response) => response.json()),
      fetch(`${api}/auth/status`, { credentials: "include", cache: "no-store" })
    ]).then(([templatePayload, authResponse]) => {
      if (!live) return;
      setTemplates(parseTemplates(templatePayload));
      setAuth(authResponse.ok ? "authenticated" : "locked");
      const requested = new URLSearchParams(window.location.search).get("world");
      if (requested === "lucia" || requested === "blank") setActiveTemplate(requested);
    }).catch(() => live && setAuth("locked"));
    return () => { live = false; };
  }, [api]);

  useEffect(() => {
    if (auth !== "authenticated") return;
    void loadWorkspace(activeTemplate);
    window.history.replaceState(null, "", activeTemplate === "blank" ? "/sentinelle" : `/sentinelle?world=${activeTemplate}`);
    const events = new EventSource(`${api}/events/${activeTemplate}`, { withCredentials: true });
    const refresh = () => void loadWorkspace(activeTemplate, true);
    events.addEventListener("world-changed", refresh);
    events.onerror = () => setNotice("La connexion temps réel se reconnecte…");
    const fallback = window.setInterval(refresh, 6_000);
    return () => { events.close(); window.clearInterval(fallback); };
  }, [activeTemplate, api, auth, loadWorkspace]);

  const unlock = useCallback(async (password: string) => {
    try {
      const response = await fetch(`${api}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
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
      const response = await fetch(`${api}/workspaces/${activeTemplate}/actions/${action}`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store"
      });
      if (response.status === 409) {
        setNotice("Quelqu’un a modifié cet objet avant toi. La version actuelle est rechargée.");
        await loadWorkspace(activeTemplate, true);
        return null;
      }
      if (response.status === 401) {
        setAuth("locked");
        return null;
      }
      if (!response.ok) throw new Error();
      const value = await response.json() as { workspace?: unknown };
      if (!value.workspace) throw new Error();
      const next = parseWorkspace(value.workspace);
      acceptWorkspace(next);
      return next;
    } catch {
      setNotice("Cette action n’a pas pu être appliquée.");
      return null;
    }
  }, [acceptWorkspace, activeTemplate, api, loadWorkspace]);

  const focus = useCallback((entity: WorldEntity, additive = false) => {
    const current = workspaceRef.current;
    if (!current) return;
    let nextSelection: string[] | string | null;
    if (activeTemplate === "blank") {
      const existing = attentionSelection(current);
      nextSelection = additive
        ? existing.includes(entity["@id"])
          ? existing.filter((id) => id !== entity["@id"])
          : [...existing, entity["@id"]]
        : [entity["@id"]];
    } else {
      nextSelection = activeCollection?.["@id"] ?? null;
    }
    void mutate("set-attention", {
      mutationId: mutationId("human-focus"),
      expectedVersion: current.attention.worldVersion,
      currentFocus: entity["@id"],
      currentSelection: nextSelection,
      activeArtifact: activeTemplate === "blank" ? (artifactId ?? entity["@id"]) : (compilation?.["@id"] ?? selection?.["@id"] ?? null)
    });
  }, [activeCollection, activeTemplate, artifactId, compilation, mutate, selection]);

  const importFile = useCallback(async (file: File) => {
    if (!file.size || file.size > MAX_FILE_BYTES) {
      setNotice("Ce fichier doit faire moins de 15 Mo.");
      return;
    }
    const contentBase64 = await fileBase64(file);
    await mutate("import", {
      mutationId: mutationId("human-import"),
      kind: fileKind(file),
      name: file.name,
      mediaType: file.type || "application/octet-stream",
      contentBase64
    });
  }, [mutate]);

  const importFiles = useCallback(async (files: FileList | File[]) => {
    for (const file of Array.from(files).slice(0, 8)) await importFile(file);
  }, [importFile]);

  const submitAdd = async (event: FormEvent) => {
    event.preventDefault();
    if (!addMode || !addValue.trim()) return;
    const payload = addMode === "text"
      ? { kind: "text", name: addTitle.trim() || "Nouvelle note", mediaType: "text/plain", text: addValue }
      : { kind: "url", name: addTitle.trim() || "Nouveau lien", mediaType: "text/uri-list", url: addValue.trim() };
    const next = await mutate("import", { mutationId: mutationId(`human-${addMode}`), ...payload });
    if (next) { setAddMode(null); setAddTitle(""); setAddValue(""); }
  };

  const editEntity = (entity: WorldEntity) => {
    setEditing(entity);
    setEditValue(String(nested(entity.state, "text", "value") ?? ""));
  };

  const saveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    const next = await mutate("set-text", {
      mutationId: mutationId("human-edit-text"),
      expectedVersion: editing.worldVersion,
      entityId: editing["@id"],
      value: editValue,
      currentFocus: editing["@id"]
    });
    if (next) setEditing(null);
  };

  const deleteEntity = async (entity: WorldEntity) => {
    if (!window.confirm(`Retirer « ${entity.name} » de ce World ?`)) return;
    await mutate("delete", {
      mutationId: mutationId("human-delete"),
      expectedVersion: entity.worldVersion,
      entityId: entity["@id"]
    });
  };

  const setCollection = useCallback((ids: string[], focusId: string | null = null) => {
    const action = compilation ? "set-compilation" : "set-selection";
    void mutate(action, {
      mutationId: mutationId(`human-${action}`),
      expectedVersion: activeCollection?.worldVersion ?? 0,
      entityIds: ids,
      currentFocus: focusId
    });
  }, [activeCollection, compilation, mutate]);

  if (auth === "loading") return <main className={styles.loadingScreen}><span>✦</span></main>;
  if (auth === "locked") return <LockScreen onUnlock={unlock} />;
  if (!workspace) return <main className={styles.loadingScreen}><span>✦</span><p>{status === "error" ? "Le World ne répond pas." : "Ouverture…"}</p></main>;

  const openTemplate = (template: TemplateId) => {
    setActiveTemplate(template);
    setWorkspace(null);
    setTemplatesOpen(false);
    setPreview(null);
    setNotice("");
  };
  const previewUrl = preview ? publicUrl(preview) : null;
  const previewSlug = previewUrl ? clipSlug(previewUrl) : null;
  const parent = typeof window !== "undefined" ? window.location.hostname : "adoptan.ai";
  const outcomeCount = Number(workspace.outcome?.checks[0]?.observed ?? 0);
  const renderEntity = (entity: WorldEntity, options: { compact?: boolean; inCollection?: boolean } = {}) => (
    <HumanEntityRenderer
      key={entity["@id"]}
      entity={entity}
      focused={humanFocus === entity["@id"]}
      selected={selectedIds.includes(entity["@id"])}
      compact={options.compact}
      inCollection={options.inCollection}
      onFocus={focus}
      onPreview={(item) => { setPreview(item); focus(item); }}
      onAdd={(item) => setCollection([...collectionIds, item["@id"]], item["@id"])}
      onRemove={(item) => setCollection(collectionIds.filter((id) => id !== item["@id"]), null)}
      onDelete={activeTemplate === "blank" ? deleteEntity : undefined}
      onEdit={typeName(entity) === "TextBlock" ? editEntity : undefined}
      onInspect={setInspect}
    />
  );

  return (
    <main className={`${styles.shell} ${railOpen ? "" : styles.railCollapsed}`}>
      <header className={styles.header}>
        <div className={styles.headerBrand}><button type="button" onClick={() => setRailOpen((value) => !value)} aria-label="Afficher les objets">☰</button><span className={styles.brandOrb}>✦</span><strong>Sentinelle</strong></div>
        <button type="button" className={styles.worldSwitcher} onClick={() => setTemplatesOpen(true)}>{activeTemplate === "blank" ? "Mon World" : "Lucia Video"}<span>⌄</span></button>
        <div className={styles.presences}><span>● Luca</span><span className={styles.sentinelPresence}>✦ Sentinelle</span></div>
      </header>

      <aside className={styles.rail}>
        <nav>
          <button type="button" className={styles.navActive}><span>●</span> Objets <em>{canvasEntities.length}</em></button>
          <button type="button" onClick={() => fileInput.current?.click()}><span>↑</span> Fichiers</button>
          <button type="button" onClick={() => setTemplatesOpen(true)}><span>+</span> Nouveau World</button>
        </nav>
        <div className={styles.railObjects}>
          {canvasEntities.slice(0, 12).map((entity) => <button type="button" key={entity["@id"]} className={humanFocus === entity["@id"] ? styles.railObjectActive : ""} onClick={() => focus(entity)}><span>{typeName(entity) === "TextBlock" ? "Aa" : typeName(entity) === "Image" ? "I" : typeName(entity) === "Moment" ? "▶" : "·"}</span><strong>{entity.name}</strong></button>)}
        </div>
        <footer><span className={status === "refreshing" ? styles.syncing : ""}>●</span>{status === "refreshing" ? "Mise à jour…" : "World à jour"}</footer>
      </aside>

      <section
        className={`${styles.mainSpace} ${dropActive ? styles.dropActive : ""}`}
        onDragEnter={(event) => { event.preventDefault(); if (activeTemplate === "blank") setDropActive(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => { if (event.currentTarget === event.target) setDropActive(false); }}
        onDrop={(event: DragEvent<HTMLElement>) => { event.preventDefault(); setDropActive(false); if (activeTemplate === "blank") void importFiles(event.dataTransfer.files); }}
      >
        {notice ? <div className={styles.notice}>{notice}<button type="button" onClick={() => setNotice("")}>×</button></div> : null}

        {activeTemplate === "blank" ? (
          <>
            <div className={styles.blankToolbar}>
              <div><p className={styles.eyebrow}>Espace partagé</p><h1>{canvasEntities.length ? "Mon World" : "Un espace pour commencer."}</h1></div>
              <div className={styles.toolbarActions}>
                <input ref={fileInput} type="file" multiple hidden onChange={(event) => event.target.files && void importFiles(event.target.files)} />
                <button type="button" className={styles.primaryButton} onClick={() => fileInput.current?.click()}>↑ Importer</button>
                <button type="button" onClick={() => setAddMode("text")}>+ Ajouter</button>
                <button type="button" onClick={() => setTemplatesOpen(true)}>Templates</button>
                <span className={styles.viewSwitch}><button type="button" className={view === "canvas" ? styles.viewActive : ""} onClick={() => setView("canvas")} aria-label="Vue canvas">Canvas</button><button type="button" className={view === "list" ? styles.viewActive : ""} onClick={() => setView("list")} aria-label="Vue liste">Liste</button></span>
              </div>
            </div>
            {canvasEntities.length === 0 ? (
              <div className={styles.emptyWorld}>
                <div className={styles.emptyOrb}>✦</div>
                <h2>Dépose quelque chose ici.</h2>
                <p>Un texte, une image, un PDF, un CSV ou un lien.<br />Sentinelle le partagera avec toi dans ce même espace.</p>
                <div><button type="button" onClick={() => fileInput.current?.click()}>Importer un fichier</button><button type="button" onClick={() => setAddMode("text")}>Écrire quelque chose</button></div>
              </div>
            ) : (
              <div className={view === "canvas" ? styles.canvasGrid : styles.listGrid}>{canvasEntities.map((entity) => renderEntity(entity, { compact: view === "list" }))}</div>
            )}
            {selectedIds.length > 1 ? <div className={styles.selectionToast}><span>{selectedIds.length} objets sélectionnés</span><small>Tu peux dire « compare ceux-là ».</small></div> : null}
          </>
        ) : (
          <section className={styles.luciaSpace}>
            <div className={styles.blankToolbar}><div><p className={styles.eyebrow}>Template · Lucia Video</p><h1>New York, en trois Moments.</h1></div><div className={styles.goalMini}><span>{outcomeCount} / 3</span><strong>{workspace.outcome?.status === "SATISFIED" ? "Objectif atteint" : "Moments sélectionnés"}</strong></div></div>
            <div className={styles.videoStage}>
              {previewSlug ? <iframe src={`https://clips.twitch.tv/embed?clip=${encodeURIComponent(previewSlug)}&parent=${encodeURIComponent(parent)}&autoplay=false`} title={preview?.name ?? "Lucia preview"} allowFullScreen /> : <button type="button" onClick={() => moments[0] && setPreview(moments[0])}><span>▶</span><strong>Voir un Moment</strong></button>}
              <div><p className={styles.eyebrow}>Même objet, deux regards</p><h2>{preview?.name ?? focusedEntity?.name ?? "Lucia Video"}</h2><p>La timeline et l’AI-DOM utilisent exactement les mêmes identifiants.</p></div>
            </div>
            <section className={styles.timelineSection}><header><div><p className={styles.eyebrow}>{compilation ? "Compilation #12" : "Selection #44"}</p><h2>{collectionIds.length ? "Sélection actuelle" : "Choisis des Moments"}</h2></div>{selection && !compilation ? <button type="button" onClick={() => void mutate("set-compilation", { mutationId: mutationId("human-create-compilation"), expectedVersion: 0, entityIds: collectionIds, currentFocus: collectionIds[0] ?? null })}>Créer la timeline</button> : null}</header>
              <div className={styles.timeline}>{collectionIds.map((id, index) => { const entity = entities.get(id); if (!entity) return null; return <button type="button" key={id} draggable onDragStart={() => setDraggingMoment(id)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (!draggingMoment || draggingMoment === id) return; const next = [...collectionIds]; const from = next.indexOf(draggingMoment); const to = next.indexOf(id); next.splice(from, 1); next.splice(to, 0, draggingMoment); setCollection(next, draggingMoment); setDraggingMoment(null); }} onClick={() => focus(entity)}><span>0{index + 1}</span><strong>{entity.name}</strong><em onClick={(event) => { event.stopPropagation(); setCollection(collectionIds.filter((item) => item !== id), null); }}>×</em></button>; })}</div>
            </section>
            <div className={styles.momentGrid}>{moments.filter((entity) => !collectionIds.includes(entity["@id"])).map((entity) => renderEntity(entity))}</div>
          </section>
        )}
        {dropActive ? <div className={styles.dropOverlay}><span>+</span><strong>Dépose dans le World</strong></div> : null}
      </section>

      <footer className={styles.composerBar}>
        <div className={styles.composerPresence}><span className={working ? styles.pulseMark : styles.sentinelMark}>✦</span><small>{working ? "Sentinelle travaille…" : sentinelFocus && sentinelFocus === humanFocus ? "Sentinelle regarde avec toi" : "Sentinelle est là"}</small></div>
        <form onSubmit={(event) => { event.preventDefault(); if (!instruction.trim() || working) return; void mutate("instruct", { mutationId: mutationId("human-instruction"), text: instruction.trim(), currentFocus: humanFocus }).then((next) => next && setInstruction("")); }}>
          <input value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="Que veux-tu faire ?" aria-label="Que veux-tu faire ?" />
          {selectedIds.length ? <span>{selectedIds.length === 1 ? entities.get(selectedIds[0])?.name : `${selectedIds.length} objets`}</span> : null}
          <button type="submit" disabled={!instruction.trim() || working}>↑</button>
        </form>
      </footer>

      {templatesOpen ? <Templates templates={templates} current={activeTemplate} onOpen={openTemplate} onClose={() => setTemplatesOpen(false)} /> : null}
      {inspect ? <InspectPanel entity={inspect} onClose={() => setInspect(null)} /> : null}
      {addMode ? <div className={styles.modalBackdrop} onMouseDown={() => setAddMode(null)}><form className={styles.addModal} onSubmit={submitAdd} onMouseDown={(event) => event.stopPropagation()}><header><div><p className={styles.eyebrow}>{addMode === "text" ? "Nouveau texte" : "Nouveau lien"}</p><h2>Ajouter au World</h2></div><button type="button" onClick={() => setAddMode(null)}>×</button></header><input value={addTitle} onChange={(event) => setAddTitle(event.target.value)} placeholder="Titre (facultatif)" />{addMode === "text" ? <textarea autoFocus value={addValue} onChange={(event) => setAddValue(event.target.value)} placeholder="Écris ici…" /> : <input autoFocus type="url" value={addValue} onChange={(event) => setAddValue(event.target.value)} placeholder="https://…" />}<button type="submit" className={styles.primaryButton}>Ajouter</button>{addMode === "text" ? <button type="button" className={styles.secondaryLink} onClick={() => setAddMode("url")}>Ajouter plutôt un lien</button> : <button type="button" className={styles.secondaryLink} onClick={() => setAddMode("text")}>Ajouter plutôt du texte</button>}</form></div> : null}
      {editing ? <div className={styles.modalBackdrop} onMouseDown={() => setEditing(null)}><form className={styles.editModal} onSubmit={saveEdit} onMouseDown={(event) => event.stopPropagation()}><header><div><p className={styles.eyebrow}>Objet partagé</p><h2>{editing.name}</h2></div><button type="button" onClick={() => setEditing(null)}>×</button></header><textarea autoFocus value={editValue} onChange={(event) => setEditValue(event.target.value)} /><button type="submit" className={styles.primaryButton}>Mettre à jour</button></form></div> : null}
    </main>
  );
}
