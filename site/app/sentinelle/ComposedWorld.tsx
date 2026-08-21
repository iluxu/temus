"use client";

import { CSSProperties, useState } from "react";
import { WorldEntity, nested } from "./world";
import styles from "./sentinelle.module.css";

type Props = {
  world: WorldEntity;
  entities: Map<string, WorldEntity>;
  focusedId: string | null;
  onBack: () => void;
  onFocus: (moment: WorldEntity, section: WorldEntity) => void;
  onChange: (section: WorldEntity, ids: string[], focusId: string | null) => void;
};

type Dragged = { sectionId: string; entityId: string } | null;

const visualClasses: Record<string, string> = {
  stage: styles.surfaceStage,
  gallery: styles.surfaceGallery,
  sequence: styles.surfaceSequence,
  "ranked-list": styles.surfaceRanking,
  comparison: styles.surfaceComparison,
  lanes: styles.surfaceLanes,
  timeline: styles.surfaceTimeline
};

function cleanName(value: string): string {
  return value.replace(/^Radar\s+\d+\s*[-–—]\s*/i, "").trim();
}

function annotation(section: WorldEntity, entityId: string): Record<string, unknown> {
  const value = nested(section.state, "collection", "annotations");
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const item = (value as Record<string, unknown>)[entityId];
  return item && typeof item === "object" && !Array.isArray(item)
    ? item as Record<string, unknown>
    : {};
}

function MomentTile({
  moment,
  section,
  index,
  focused,
  visual,
  onFocus,
  onRemove,
  onDrag,
  onDrop,
  scoreScale
}: {
  moment: WorldEntity;
  section: WorldEntity;
  index: number;
  focused: boolean;
  visual: string;
  onFocus: () => void;
  onRemove: () => void;
  onDrag: () => void;
  onDrop: () => void;
  scoreScale: number;
}) {
  const note = annotation(section, moment["@id"]);
  const score = typeof note.score === "number" ? Math.round(note.score) : null;
  const label = String(note.label ?? "");
  const description = String(note.note ?? nested(moment.state, "moment", "hook") ?? "");
  const location = String(nested(moment.state, "moment", "location") ?? "Lucia");
  const ranking = visual === "ranked-list";
  const sourceUrl = String(nested(moment.state, "moment", "public_url") ?? "");
  return (
    <article
      className={`${styles.surfaceMoment} ${focused ? styles.surfaceMomentFocused : ""}`}
      data-semantic-world-id={moment["@id"]}
      draggable
      onDragStart={onDrag}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => { event.preventDefault(); onDrop(); }}
      onClick={onFocus}
    >
      <div className={styles.surfaceMedia}>
        {moment.contentUrl ? (
          <video
            src={moment.contentUrl}
            playsInline
            muted
            preload="metadata"
            onClick={(event) => {
              event.stopPropagation();
              if (event.currentTarget.paused) void event.currentTarget.play();
              else event.currentTarget.pause();
            }}
          />
        ) : sourceUrl ? (
          <a className={styles.surfaceSourcePreview} href={sourceUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
            <span>▶</span><small>Voir le clip source</small>
          </a>
        ) : <span>✦</span>}
        <i>{ranking ? `#${index + 1}` : String(index + 1).padStart(2, "0")}</i>
      </div>
      <div className={styles.surfaceMomentCopy}>
        <div>
          {label ? <span>{label}</span> : null}
          <h3>{cleanName(moment.name)}</h3>
        </div>
        {description ? <p>{description}</p> : null}
        <small>{location}</small>
      </div>
      {score !== null ? <strong className={styles.surfaceScore}>{score}<small>/{scoreScale}</small></strong> : null}
      <button
        type="button"
        className={styles.surfaceRemove}
        onClick={(event) => { event.stopPropagation(); onRemove(); }}
        aria-label={`Retirer ${cleanName(moment.name)}`}
      >×</button>
    </article>
  );
}

export default function ComposedWorld({
  world,
  entities,
  focusedId,
  onBack,
  onFocus,
  onChange
}: Props) {
  const [dragged, setDragged] = useState<Dragged>(null);
  const surface = (nested(world.state, "surface") as Record<string, unknown>) ?? {};
  const sectionIds = Array.isArray(surface.section_ids)
    ? surface.section_ids.map(String)
    : world.orderedEntityIds ?? [];
  const sections = sectionIds.map((id) => entities.get(id)).filter(Boolean) as WorldEntity[];
  const accent = /^#[0-9a-f]{6}$/i.test(String(surface.accent ?? ""))
    ? String(surface.accent)
    : "#d2ff74";

  const dropInto = (section: WorldEntity, targetId: string) => {
    if (!dragged || dragged.sectionId !== section["@id"] || dragged.entityId === targetId) return;
    const next = [...(section.orderedEntityIds ?? [])];
    const from = next.indexOf(dragged.entityId);
    const to = next.indexOf(targetId);
    if (from < 0 || to < 0) return;
    next.splice(from, 1);
    next.splice(to, 0, dragged.entityId);
    setDragged(null);
    onChange(section, next, dragged.entityId);
  };

  return (
    <section
      className={styles.surfaceWorld}
      style={{ "--surface-accent": accent } as CSSProperties}
      data-semantic-world-id={world["@id"]}
    >
      <header className={styles.surfaceHero}>
        <button type="button" onClick={onBack} className={styles.surfaceBack}>← Moments</button>
        <div className={styles.surfaceLiving}><span>●</span><span>✦</span><b>World vivant</b></div>
        <h1>{world.name}</h1>
        {surface.subtitle ? <p>{String(surface.subtitle)}</p> : null}
        <small>{sections.length} vues · {Array.isArray(surface.source_entity_ids) ? surface.source_entity_ids.length : 0} Moments canoniques</small>
      </header>

      <div className={styles.surfaceSections}>
        {sections.map((section) => {
          const visual = String(nested(section.state, "surface", "visual") ?? "gallery");
          const subtitle = String(nested(section.state, "surface", "subtitle") ?? "");
          const ids = section.orderedEntityIds ?? [];
          const items = ids.map((id) => entities.get(id)).filter(Boolean) as WorldEntity[];
          const scores = ids.map((id) => annotation(section, id).score).filter((value): value is number => typeof value === "number");
          const scoreScale = scores.length && Math.max(...scores) <= 10 ? 10 : 100;
          return (
            <section key={section["@id"]} className={styles.surfaceSection} data-semantic-world-id={section["@id"]}>
              <header>
                <div><span>{visual.replace("-", " ")}</span><h2>{section.name}</h2>{subtitle ? <p>{subtitle}</p> : null}</div>
                <b>{items.length}</b>
              </header>
              <div className={`${styles.surfaceItems} ${visualClasses[visual] ?? styles.surfaceGallery}`}>
                {items.map((moment, index) => (
                  <MomentTile
                    key={moment["@id"]}
                    moment={moment}
                    section={section}
                    index={index}
                    focused={focusedId === moment["@id"]}
                    visual={visual}
                    onFocus={() => onFocus(moment, section)}
                    onRemove={() => onChange(section, ids.filter((id) => id !== moment["@id"]), null)}
                    onDrag={() => setDragged({ sectionId: section["@id"], entityId: moment["@id"] })}
                    onDrop={() => dropInto(section, moment["@id"])}
                    scoreScale={scoreScale}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
