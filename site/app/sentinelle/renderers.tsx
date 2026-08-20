import { WorldEntity, nested, typeName } from "./world";
import styles from "./sentinelle.module.css";

export type EntityRendererProps = {
  entity: WorldEntity;
  focused: boolean;
  inCollection?: boolean;
  onFocus: (entity: WorldEntity) => void;
  onPreview?: (entity: WorldEntity) => void;
  onAdd?: (entity: WorldEntity) => void;
  onRemove?: (entity: WorldEntity) => void;
};

type EntityRenderer = (props: EntityRendererProps) => JSX.Element;

function ChangeHint({ entity }: { entity: WorldEntity }) {
  if (entity.lastChangeKind === "sentinelle") {
    return <span className={styles.sentinelChange}>✦ changed by Sentinelle</span>;
  }
  if (entity.lastChangeKind === "human") {
    return <span className={styles.humanChange}>● changed by you</span>;
  }
  return null;
}

function MomentRenderer({
  entity,
  focused,
  inCollection,
  onFocus,
  onPreview,
  onAdd,
  onRemove
}: EntityRendererProps) {
  const location = String(nested(entity.state, "moment", "location") ?? "Moment");
  return (
    <article
      className={`${styles.momentCard} ${focused ? styles.entityFocused : ""}`}
      data-world-id={entity["@id"]}
      onClick={() => onFocus(entity)}
    >
      <div className={styles.momentVisual}>
        <span>{location}</span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onPreview?.(entity);
          }}
          aria-label={`Preview ${entity.name}`}
        >
          ▶
        </button>
      </div>
      <div className={styles.momentBody}>
        <p className={styles.entityType}>Moment</p>
        <h3>{entity.name}</h3>
        <code>{entity["@id"]}</code>
        <ChangeHint entity={entity} />
        <div className={styles.cardActions}>
          <button type="button" onClick={() => onPreview?.(entity)}>
            Preview
          </button>
          {inCollection ? (
            <button type="button" onClick={() => onRemove?.(entity)}>
              Remove
            </button>
          ) : (
            <button type="button" onClick={() => onAdd?.(entity)}>
              Add
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function TextBlockRenderer({ entity, focused, onFocus }: EntityRendererProps) {
  return (
    <article
      className={`${styles.textObjectCard} ${focused ? styles.entityFocused : ""}`}
      data-world-id={entity["@id"]}
      onClick={() => onFocus(entity)}
    >
      <p className={styles.entityType}>Text Block</p>
      <h3>{entity.name}</h3>
      <p>{String(nested(entity.state, "text", "value") ?? "")}</p>
      <code>{entity["@id"]}</code>
      <ChangeHint entity={entity} />
    </article>
  );
}

function InstructionRenderer({ entity, focused, onFocus }: EntityRendererProps) {
  return (
    <article
      className={`${styles.instructionCard} ${focused ? styles.entityFocused : ""}`}
      data-world-id={entity["@id"]}
      onClick={() => onFocus(entity)}
    >
      <span>✦</span>
      <div>
        <p className={styles.entityType}>Shared instruction</p>
        <p>{String(nested(entity.state, "instruction", "text") ?? entity.name)}</p>
      </div>
    </article>
  );
}

function GenericEntityRenderer({ entity, focused, onFocus }: EntityRendererProps) {
  const important = Object.entries(entity.state).slice(0, 3);
  return (
    <article
      className={`${styles.genericCard} ${focused ? styles.entityFocused : ""}`}
      data-world-id={entity["@id"]}
      onClick={() => onFocus(entity)}
    >
      <p className={styles.entityType}>{typeName(entity)}</p>
      <h3>{entity.name}</h3>
      {important.map(([key, value]) => (
        <p key={key}>
          <span>{key}</span> {typeof value === "string" ? value : JSON.stringify(value)}
        </p>
      ))}
      <code>{entity["@id"]}</code>
      <ChangeHint entity={entity} />
    </article>
  );
}

const rendererRegistry: Record<string, EntityRenderer> = {
  Moment: MomentRenderer,
  TextBlock: TextBlockRenderer,
  Instruction: InstructionRenderer
};

export function HumanEntityRenderer(props: EntityRendererProps) {
  const Renderer = rendererRegistry[typeName(props.entity)] ?? GenericEntityRenderer;
  return <Renderer {...props} />;
}

export function registeredRendererTypes(): string[] {
  return Object.keys(rendererRegistry);
}
