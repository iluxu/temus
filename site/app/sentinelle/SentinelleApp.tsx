"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
const TEXT_ID = "urn:adoptan:text:1";

type RequestState = "loading" | "ready" | "refreshing" | "error";

function mutationId(prefix: string): string {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}:${suffix}`;
}

function entityMap(workspace: WorkspaceProjection | null): Map<string, WorldEntity> {
  return new Map(
    (workspace?.graph.entities ?? []).map((entity) => [entity["@id"], entity])
  );
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

function Landing({
  templates,
  loading,
  onOpen
}: {
  templates: WorldTemplate[];
  loading: boolean;
  onOpen: (template: TemplateId) => void;
}) {
  return (
    <main className={styles.landing}>
      <header className={styles.landingHeader}>
        <a href="/" className={styles.brand} aria-label="Sentinelle home">
          <span>✦</span> Sentinelle
        </a>
        <span className={styles.presencePill}>✦ Sentinelle here</span>
      </header>
      <section className={styles.landingHero}>
        <p className={styles.kicker}>A shared workspace with an intelligence</p>
        <h1>
          Work on the same thing.
          <br />
          <em>See it differently.</em>
        </h1>
        <p>
          Point, write, arrange and create normally. Sentinelle understands the
          exact same objects because you inhabit the same structured World.
        </p>
      </section>
      <section className={styles.templateSection} aria-labelledby="templates-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>New World</p>
            <h2 id="templates-title">What do you want to work on?</h2>
          </div>
          <span className={styles.sandboxBadge}>Public sandbox</span>
        </div>
        <div className={styles.templateGrid}>
          {loading ? <div className={styles.loadingCard}>Opening the World…</div> : null}
          {templates.map((template, index) => (
            <button
              key={template.id}
              type="button"
              className={`${styles.templateCard} ${styles[`accent_${template.accent}`] ?? ""}`}
              disabled={!template.available}
              onClick={() => onOpen(template.id as TemplateId)}
            >
              <span className={styles.templateNumber}>0{index + 1}</span>
              <span className={styles.templateIcon} aria-hidden="true">
                {template.id === "blank"
                  ? "＋"
                  : template.id === "lucia"
                    ? "▶"
                    : template.id === "document"
                      ? "¶"
                      : template.id === "table"
                        ? "▦"
                        : "⌕"}
              </span>
              <strong>{template.name}</strong>
              <span>{template.description}</span>
              <small>{template.available ? "Open World →" : "Coming next"}</small>
            </button>
          ))}
        </div>
      </section>
      <section className={styles.tutorial} aria-label="How Sentinelle works">
        <div><span>1</span><p>Everything you see is shared with Sentinelle.</p></div>
        <div><span>2</span><p>Select, drag and edit normally. The objects keep their identity.</p></div>
        <div><span>3</span><p>Ask for a result. Sentinelle can change the World with you.</p></div>
      </section>
    </main>
  );
}

function SemanticPanel({ entity }: { entity: WorldEntity | null }) {
  if (!entity) {
    return (
      <div className={styles.semanticEmpty}>
        <span>◎</span>
        <p>Select an object to reveal the compact semantic view Sentinelle receives.</p>
      </div>
    );
  }
  const properties = Object.entries(entity.state).slice(0, 5);
  return (
    <div className={styles.semanticPanel} data-semantic-world-id={entity["@id"]}>
      <div className={styles.semanticIdentity}>
        <div>
          <p className={styles.kicker}>What Sentinelle sees</p>
          <h3>{entity.name}</h3>
        </div>
        <span>{typeName(entity)}</span>
      </div>
      <code>{entity["@id"]}</code>
      <section>
        <h4>Properties</h4>
        {properties.length ? properties.map(([name, value]) => (
          <div className={styles.semanticRow} key={name}>
            <span>{name}</span>
            <strong>{typeof value === "string" ? value : JSON.stringify(value)}</strong>
          </div>
        )) : <p>Identity only.</p>}
      </section>
      <section>
        <h4>Links</h4>
        {entity.links.length ? entity.links.slice(0, 8).map((link) => (
          <div className={styles.semanticRow} key={`${link.rel}:${link.href}`}>
            <span>{link.rel.split("/").pop()}</span>
            <strong>{link.href}</strong>
          </div>
        )) : <p>No outgoing links.</p>}
      </section>
      <section>
        <h4>Possible actions</h4>
        <div className={styles.actionTokens}>
          {entity.affordances.map((affordance) => (
            <span key={affordance["@id"]}>{affordance["@id"].split(":").pop()}</span>
          ))}
        </div>
      </section>
    </div>
  );
}

function Presence({ workspace, entities }: { workspace: WorkspaceProjection; entities: Map<string, WorldEntity> }) {
  const human = workspace.presence.find((item) => item.actor === "human");
  const sentinel = workspace.presence.find((item) => item.actor === "sentinelle");
  const shared = human?.focus && human.focus === sentinel?.focus;
  return (
    <section className={`${styles.presenceCard} ${shared ? styles.presenceShared : ""}`}>
      <p className={styles.kicker}>Presence</p>
      {workspace.presence.map((item) => (
        <div className={styles.presencePerson} key={item.actor}>
          <span className={item.actor === "sentinelle" ? styles.sentinelAvatar : styles.humanAvatar}>
            {item.mark}
          </span>
          <div>
            <strong>{item.label}</strong>
            <small>{item.focus ? entities.get(item.focus)?.name ?? item.focus : "In this World"}</small>
          </div>
        </div>
      ))}
      <p className={styles.sharedNotice}>
        {shared ? "You are looking at the same Entity." : "Same World. Different eyes."}
      </p>
    </section>
  );
}

export default function SentinelleApp() {
  const [templates, setTemplates] = useState<WorldTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<TemplateId | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceProjection | null>(null);
  const [status, setStatus] = useState<RequestState>("loading");
  const [notice, setNotice] = useState("");
  const [sameReality, setSameReality] = useState(false);
  const [preview, setPreview] = useState<WorldEntity | null>(null);
  const [textDraft, setTextDraft] = useState("");
  const [instruction, setInstruction] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  const workspaceRef = useRef<WorkspaceProjection | null>(null);
  const api = sentinelleApiBase();

  const entities = useMemo(() => entityMap(workspace), [workspace]);
  const humanFocus = workspace?.presence.find((item) => item.actor === "human")?.focus ?? null;
  const focusedEntity = humanFocus ? entities.get(humanFocus) ?? null : null;
  const textEntity = entities.get(TEXT_ID) ?? null;
  const selection = entities.get(SELECTION_ID) ?? null;
  const compilation = entities.get(COMPILATION_ID) ?? null;
  const activeCollection = compilation ?? selection;
  const selectedIds = activeCollection?.orderedEntityIds ?? [];
  const moments = [...entities.values()].filter((entity) => typeName(entity) === "Moment");
  const instructions = [...entities.values()]
    .filter((entity) => typeName(entity) === "Instruction")
    .sort((left, right) => (right.updatedAt ?? "").localeCompare(left.updatedAt ?? ""));
  const availableMoments = moments.filter((entity) => !selectedIds.includes(entity["@id"]));

  const acceptWorkspace = useCallback((value: WorkspaceProjection) => {
    workspaceRef.current = value;
    setWorkspace(value);
    setStatus("ready");
  }, []);

  const loadWorkspace = useCallback(async (template: TemplateId, background = false) => {
    if (!background) setStatus("loading");
    else setStatus("refreshing");
    try {
      const response = await fetch(`${api}/workspaces/${template}`, {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (!response.ok) throw new Error("World unavailable");
      acceptWorkspace(parseWorkspace(await response.json()));
    } catch {
      setStatus("error");
      setNotice("The canonical World is temporarily unavailable.");
    }
  }, [acceptWorkspace, api]);

  useEffect(() => {
    let active = true;
    fetch(`${api}/templates`, { headers: { Accept: "application/json" }, cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((value) => active && setTemplates(parseTemplates(value)))
      .catch(() => active && setNotice("Sentinelle cannot open a new World right now."))
      .finally(() => active && setStatus("ready"));
    const query = new URLSearchParams(window.location.search).get("world");
    if (query === "blank" || query === "lucia") setActiveTemplate(query);
    return () => { active = false; };
  }, [api]);

  useEffect(() => {
    if (!activeTemplate) return;
    void loadWorkspace(activeTemplate);
    window.history.replaceState(null, "", `/sentinelle?world=${activeTemplate}`);
    const events = new EventSource(`${api}/events/${activeTemplate}`);
    const refresh = () => void loadWorkspace(activeTemplate, true);
    events.addEventListener("world-changed", refresh);
    events.onerror = () => setNotice("Live updates are reconnecting…");
    const fallback = window.setInterval(refresh, 5_000);
    return () => {
      events.close();
      window.clearInterval(fallback);
    };
  }, [activeTemplate, api, loadWorkspace]);

  useEffect(() => {
    if (textEntity) {
      setTextDraft(String(nested(textEntity.state, "text", "value") ?? ""));
    }
  }, [textEntity?.worldVersion]);

  const mutate = useCallback(async (action: string, payload: Record<string, unknown>) => {
    if (!activeTemplate) return null;
    setNotice("");
    try {
      const response = await fetch(`${api}/workspaces/${activeTemplate}/actions/${action}`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store"
      });
      if (response.status === 409) {
        setNotice("The World changed first. Reloaded the canonical version.");
        await loadWorkspace(activeTemplate, true);
        return null;
      }
      if (!response.ok) throw new Error();
      const value = await response.json() as { workspace?: unknown };
      if (!value.workspace) throw new Error();
      const next = parseWorkspace(value.workspace);
      acceptWorkspace(next);
      return next;
    } catch {
      setNotice("This semantic action could not be applied to the World.");
      return null;
    }
  }, [acceptWorkspace, activeTemplate, api, loadWorkspace]);

  const focus = useCallback((entity: WorldEntity) => {
    if (!workspaceRef.current) return;
    const attention = workspaceRef.current.attention;
    void mutate("set-attention", {
      mutationId: mutationId("human-focus"),
      expectedVersion: attention.worldVersion,
      currentFocus: entity["@id"],
      currentSelection: activeCollection?.["@id"] ?? null,
      activeArtifact: compilation?.["@id"] ?? textEntity?.["@id"] ?? null
    });
  }, [activeCollection, compilation, mutate, textEntity]);

  const setCollection = useCallback((ids: string[], focusId: string | null = null) => {
    const collection = activeCollection;
    const action = compilation ? "set-compilation" : "set-selection";
    void mutate(action, {
      mutationId: mutationId(`human-${action}`),
      expectedVersion: collection?.worldVersion ?? 0,
      entityIds: ids,
      currentFocus: focusId
    });
  }, [activeCollection, compilation, mutate]);

  const previewEntity = useCallback(async (entity: WorldEntity) => {
    const resolved = await mutate("preview", { entityId: entity["@id"] });
    if (!resolved) return;
    setPreview(entity);
    focus(entity);
  }, [focus, mutate]);

  const addMoment = useCallback((entity: WorldEntity) => {
    if (selectedIds.length >= 12) return;
    setCollection([...selectedIds, entity["@id"]], entity["@id"]);
  }, [selectedIds, setCollection]);

  const removeMoment = useCallback((entity: WorldEntity) => {
    const next = selectedIds.filter((id) => id !== entity["@id"]);
    setCollection(next, next[0] ?? null);
  }, [selectedIds, setCollection]);

  const reorder = useCallback((source: string, target: string) => {
    if (source === target) return;
    const next = [...selectedIds];
    const from = next.indexOf(source);
    const to = next.indexOf(target);
    if (from < 0 || to < 0) return;
    next.splice(from, 1);
    next.splice(to, 0, source);
    setCollection(next, source);
  }, [selectedIds, setCollection]);

  const openTemplate = (template: TemplateId) => {
    setActiveTemplate(template);
    setWorkspace(null);
    setPreview(null);
    setNotice("");
  };

  if (!activeTemplate) {
    return <Landing templates={templates} loading={status === "loading"} onOpen={openTemplate} />;
  }

  if (!workspace) {
    return (
      <main className={styles.worldLoading}>
        <span>✦</span>
        <h1>Entering the World…</h1>
        {status === "error" ? <button onClick={() => void loadWorkspace(activeTemplate)}>Retry</button> : null}
      </main>
    );
  }

  const previewUrl = preview ? publicUrl(preview) : null;
  const previewSlug = previewUrl ? clipSlug(previewUrl) : null;
  const parent = typeof window !== "undefined" ? window.location.hostname : "adoptan.ai";
  const outcomeCount = Number(workspace.outcome?.checks[0]?.observed ?? 0);

  return (
    <main className={styles.workspaceShell}>
      <header className={styles.workspaceHeader}>
        <button type="button" className={styles.brandButton} onClick={() => {
          setActiveTemplate(null);
          setWorkspace(null);
          window.history.replaceState(null, "", "/sentinelle");
        }}><span>✦</span> Sentinelle</button>
        <div className={styles.worldTitle}>
          <span className={styles.liveDot} />
          <strong>{workspace.template.name}</strong>
          <small>canonical World</small>
        </div>
        <div className={styles.headerActions}>
          <button type="button" onClick={() => setSameReality((value) => !value)} aria-pressed={sameReality}>
            ◎ {sameReality ? "Hide semantic view" : "What Sentinelle sees"}
          </button>
          <span className={styles.presencePill}>✦ Sentinelle here</span>
        </div>
      </header>

      <aside className={styles.worldRail}>
        <div>
          <p className={styles.kicker}>World</p>
          <nav>
            <button className={styles.navActive}><span>◉</span> Objects <em>{workspace.graph.entities.length - 1}</em></button>
            {activeTemplate === "lucia" ? <button><span>◌</span> Moments <em>{moments.length}</em></button> : null}
            <button><span>↗</span> Sources</button>
          </nav>
        </div>
        <div className={styles.worldAddress}>
          <p>World address</p>
          <code>{workspace.world}</code>
        </div>
        <div className={styles.railDoctrine}>
          <span>●</span>
          <p><strong>Same reality.</strong><br />Different eyes.</p>
        </div>
      </aside>

      <section className={styles.worldCanvas}>
        <div className={styles.canvasHeading}>
          <div>
            <p className={styles.kicker}>{activeTemplate === "lucia" ? "Creative World" : "Open canvas"}</p>
            <h1>{activeTemplate === "lucia" ? "New York, in shared Moments" : "A place to begin together"}</h1>
          </div>
          <span className={styles.worldVersion}>{status === "refreshing" ? "Refreshing…" : "Live"}</span>
        </div>

        {notice ? <div className={styles.notice}>{notice}</div> : null}

        {activeTemplate === "blank" && textEntity ? (
          <section className={styles.blankCanvas}>
            <div className={styles.blankTopline}>
              <div><p className={styles.kicker}>Text #1</p><code>{TEXT_ID}</code></div>
              <span>World v{textEntity.worldVersion}</span>
            </div>
            <textarea
              value={textDraft}
              onFocus={() => focus(textEntity)}
              onChange={(event) => setTextDraft(event.target.value)}
              aria-label="Shared Text #1"
            />
            <div className={styles.blankActions}>
              <p>This draft becomes shared only when applied to the canonical Entity.</p>
              <button type="button" onClick={() => void mutate("set-text", {
                mutationId: mutationId("human-text"),
                expectedVersion: textEntity.worldVersion,
                value: textDraft
              })}>Apply to World</button>
            </div>
            <HumanEntityRenderer entity={textEntity} focused={humanFocus === TEXT_ID} onFocus={focus} />
          </section>
        ) : null}

        {activeTemplate === "lucia" ? (
          <>
            <section className={styles.videoStage}>
              <div className={styles.previewFrame}>
                {previewSlug ? (
                  <iframe
                    src={`https://clips.twitch.tv/embed?clip=${encodeURIComponent(previewSlug)}&parent=${encodeURIComponent(parent)}&autoplay=false`}
                    title={preview?.name ?? "Lucia Moment preview"}
                    allowFullScreen
                  />
                ) : (
                  <button type="button" onClick={() => moments[0] && previewEntity(moments[0])}>
                    <span>▶</span>
                    <strong>Preview a real Moment</strong>
                    <small>Select any card below</small>
                  </button>
                )}
              </div>
              <div className={styles.stageCopy}>
                <p className={styles.kicker}>Current focus</p>
                <h2>{preview?.name ?? focusedEntity?.name ?? "Lucia Video World"}</h2>
                <p>{focusedEntity ? "This exact Entity ID is now shared with the AI-DOM." : "Select an object. Sentinelle will receive its identity, not a screenshot."}</p>
                <code>{preview?.["@id"] ?? focusedEntity?.["@id"] ?? workspace.graph.root}</code>
              </div>
            </section>

            <section className={styles.collectionSection}>
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.kicker}>{compilation ? "Active artifact" : "Canonical selection"}</p>
                  <h2>{compilation ? "Compilation #12" : selection ? "Selection #44" : "Selected Moments"}</h2>
                </div>
                <div className={styles.collectionMeta}>
                  <span>{selectedIds.length} objects</span>
                  {selection && !compilation ? (
                    <button type="button" onClick={() => void mutate("set-compilation", {
                      mutationId: mutationId("human-create-compilation"),
                      expectedVersion: 0,
                      entityIds: selectedIds,
                      currentFocus: selectedIds[0] ?? null
                    })}>Create timeline</button>
                  ) : null}
                </div>
              </div>
              {selectedIds.length ? (
                <div className={styles.selectedGrid}>
                  {selectedIds.map((id) => entities.get(id)).filter(Boolean).map((entity) => (
                    <HumanEntityRenderer
                      key={entity!["@id"]}
                      entity={entity!}
                      focused={humanFocus === entity!["@id"]}
                      inCollection
                      onFocus={focus}
                      onPreview={previewEntity}
                      onRemove={removeMoment}
                    />
                  ))}
                </div>
              ) : (
                <div className={styles.emptyCollection}><span>＋</span><p>Sentinelle or you can add real Moment Entities here.</p></div>
              )}
              <div className={styles.timeline} aria-label="Canonical compilation timeline">
                <div className={styles.timelineTrack} />
                {selectedIds.map((id, index) => {
                  const entity = entities.get(id);
                  if (!entity) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      draggable
                      data-world-id={id}
                      className={humanFocus === id ? styles.timelineFocused : ""}
                      onDragStart={() => setDragging(id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => {
                        if (dragging) reorder(dragging, id);
                        setDragging(null);
                      }}
                      onClick={() => focus(entity)}
                    >
                      <span>0{index + 1}</span>
                      <strong>{entity.name}</strong>
                      <small>{id.slice(-8)}</small>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className={styles.availableSection}>
              <div className={styles.sectionHeading}><div><p className={styles.kicker}>World objects</p><h2>Available Moments</h2></div></div>
              <div className={styles.availableGrid}>
                {availableMoments.map((entity) => (
                  <HumanEntityRenderer
                    key={entity["@id"]}
                    entity={entity}
                    focused={humanFocus === entity["@id"]}
                    onFocus={focus}
                    onPreview={previewEntity}
                    onAdd={addMoment}
                  />
                ))}
              </div>
            </section>
          </>
        ) : null}

        <section className={styles.instructionComposer}>
          <div><span>✦</span><div><strong>Sentinelle</strong><small>The instruction becomes a World Entity.</small></div></div>
          <form onSubmit={(event) => {
            event.preventDefault();
            if (!instruction.trim()) return;
            void mutate("instruct", {
              mutationId: mutationId("human-instruction"),
              text: instruction.trim(),
              currentFocus: humanFocus
            }).then((next) => next && setInstruction(""));
          }}>
            <input value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder={activeTemplate === "lucia" ? "Fais-moi une compilation de trois Moments…" : "Écris quelque chose avec moi…"} />
            <button type="submit">Share in World ↗</button>
          </form>
        </section>
        {instructions.length ? (
          <section className={styles.instructionList} aria-label="Instructions shared in the World">
            {instructions.slice(0, 4).map((entity) => (
              <HumanEntityRenderer
                key={entity["@id"]}
                entity={entity}
                focused={humanFocus === entity["@id"]}
                onFocus={focus}
              />
            ))}
          </section>
        ) : null}
      </section>

      <aside className={`${styles.sentinelRail} ${sameReality ? styles.sentinelRailExpanded : ""}`}>
        <Presence workspace={workspace} entities={entities} />
        {activeTemplate === "lucia" && workspace.outcome ? (
          <section className={styles.goalCard}>
            <p className={styles.kicker}>Goal</p>
            <h3>Three Lucia NYC Moments</h3>
            <div className={styles.goalCount}><strong>{outcomeCount}</strong><span>/ 3</span></div>
            <div className={styles.goalBar}><span style={{ width: `${Math.min(100, outcomeCount / 3 * 100)}%` }} /></div>
            <p className={workspace.outcome.status === "SATISFIED" ? styles.goalSatisfied : styles.goalOpen}>{workspace.outcome.status}</p>
          </section>
        ) : null}
        <button type="button" className={styles.semanticToggle} onClick={() => setSameReality((value) => !value)}>
          ◎ What Sentinelle sees
        </button>
        {sameReality ? <SemanticPanel entity={focusedEntity} /> : null}
        <section className={styles.contextCard}>
          <p className={styles.kicker}>Shared context</p>
          <div><span>Focus</span><code>{humanFocus ?? "none"}</code></div>
          <div><span>Selection</span><code>{activeCollection?.["@id"] ?? "none"}</code></div>
          <div><span>Artifact</span><code>{compilation?.["@id"] ?? textEntity?.["@id"] ?? "none"}</code></div>
        </section>
      </aside>
    </main>
  );
}
