import { MouseEvent } from "react";
import { WorldEntity, nested, typeName } from "./world";
import styles from "./sentinelle.module.css";

export type EntityRendererProps = {
  entity: WorldEntity;
  focused: boolean;
  selected?: boolean;
  compact?: boolean;
  inCollection?: boolean;
  onFocus: (entity: WorldEntity, additive?: boolean) => void;
  onPreview?: (entity: WorldEntity) => void;
  onAdd?: (entity: WorldEntity) => void;
  onRemove?: (entity: WorldEntity) => void;
  onDelete?: (entity: WorldEntity) => void;
  onEdit?: (entity: WorldEntity) => void;
  onInspect?: (entity: WorldEntity) => void;
};

type EntityRenderer = (props: EntityRendererProps) => JSX.Element;

function selectFromClick(
  event: MouseEvent<HTMLElement>,
  entity: WorldEntity,
  onFocus: EntityRendererProps["onFocus"]
) {
  onFocus(entity, event.metaKey || event.ctrlKey || event.shiftKey);
}

function ChangeHint({ entity }: { entity: WorldEntity }) {
  if (entity.lastChangeKind === "sentinelle") {
    return <span className={styles.sentinelChange}>✦ modifié par Sentinelle</span>;
  }
  if (entity.lastChangeKind === "human") {
    return <span className={styles.humanChange}>● modifié par vous</span>;
  }
  return null;
}

function CardActions({
  entity,
  onDelete,
  onEdit,
  onInspect
}: Pick<EntityRendererProps, "entity" | "onDelete" | "onEdit" | "onInspect">) {
  return (
    <div className={styles.objectActions} onClick={(event) => event.stopPropagation()}>
      {onEdit ? <button type="button" onClick={() => onEdit(entity)}>Modifier</button> : null}
      {onInspect ? <button type="button" onClick={() => onInspect(entity)}>Inspecter</button> : null}
      {onDelete ? <button type="button" onClick={() => onDelete(entity)}>Supprimer</button> : null}
    </div>
  );
}

function cardClass(props: EntityRendererProps, extra = "") {
  return [
    styles.entityCard,
    extra,
    props.focused ? styles.entityFocused : "",
    props.selected ? styles.entitySelected : "",
    props.compact ? styles.entityCompact : ""
  ].filter(Boolean).join(" ");
}

function TextBlockRenderer(props: EntityRendererProps) {
  const value = String(nested(props.entity.state, "text", "value") ?? "");
  return (
    <article
      className={cardClass(props, styles.textCard)}
      data-world-id={props.entity["@id"]}
      onClick={(event) => selectFromClick(event, props.entity, props.onFocus)}
    >
      <div className={styles.entityHead}>
        <span className={styles.typeIcon}>Aa</span>
        <span>Texte</span>
      </div>
      <h3>{props.entity.name}</h3>
      <p className={styles.textPreview}>{value || "Texte vide"}</p>
      <ChangeHint entity={props.entity} />
      <CardActions entity={props.entity} onEdit={props.onEdit} onInspect={props.onInspect} onDelete={props.onDelete} />
    </article>
  );
}

function ImageRenderer(props: EntityRendererProps) {
  return (
    <article
      className={cardClass(props, styles.imageCard)}
      data-world-id={props.entity["@id"]}
      onClick={(event) => selectFromClick(event, props.entity, props.onFocus)}
    >
      {props.entity.contentUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={props.entity.contentUrl} alt={props.entity.name} />
      ) : <div className={styles.fileVisual}>Image</div>}
      <div className={styles.cardBody}>
        <div className={styles.entityHead}><span>Image</span></div>
        <h3>{props.entity.name}</h3>
        <ChangeHint entity={props.entity} />
        <CardActions entity={props.entity} onInspect={props.onInspect} onDelete={props.onDelete} />
      </div>
    </article>
  );
}

function FileRenderer(props: EntityRendererProps) {
  const kind = typeName(props.entity);
  const mediaType = String(nested(props.entity.state, "resource", "media_type") ?? "Fichier");
  const size = Number(nested(props.entity.state, "resource", "size") ?? 0);
  return (
    <article
      className={cardClass(props, styles.fileCard)}
      data-world-id={props.entity["@id"]}
      onClick={(event) => selectFromClick(event, props.entity, props.onFocus)}
    >
      <div className={styles.fileVisual}>{kind === "Document" ? "PDF" : "FILE"}</div>
      <div className={styles.cardBody}>
        <div className={styles.entityHead}><span>{kind === "Document" ? "Document" : "Fichier"}</span></div>
        <h3>{props.entity.name}</h3>
        <p className={styles.metaLine}>{mediaType}{size ? ` · ${Math.max(1, Math.round(size / 1024))} Ko` : ""}</p>
        <ChangeHint entity={props.entity} />
        <div className={styles.objectActions} onClick={(event) => event.stopPropagation()}>
          {props.entity.contentUrl ? <a href={props.entity.contentUrl} target="_blank" rel="noreferrer">Ouvrir</a> : null}
          {props.onInspect ? <button type="button" onClick={() => props.onInspect?.(props.entity)}>Inspecter</button> : null}
          {props.onDelete ? <button type="button" onClick={() => props.onDelete?.(props.entity)}>Supprimer</button> : null}
        </div>
      </div>
    </article>
  );
}

function LinkRenderer(props: EntityRendererProps) {
  const url = String(nested(props.entity.state, "link", "url") ?? "");
  const host = String(nested(props.entity.state, "link", "host") ?? "Lien");
  return (
    <article
      className={cardClass(props, styles.linkCard)}
      data-world-id={props.entity["@id"]}
      onClick={(event) => selectFromClick(event, props.entity, props.onFocus)}
    >
      <div className={styles.entityHead}><span className={styles.typeIcon}>↗</span><span>{host}</span></div>
      <h3>{props.entity.name}</h3>
      <p className={styles.metaLine}>{url}</p>
      <ChangeHint entity={props.entity} />
      <div className={styles.objectActions} onClick={(event) => event.stopPropagation()}>
        {url ? <a href={url} target="_blank" rel="noreferrer">Ouvrir</a> : null}
        {props.onInspect ? <button type="button" onClick={() => props.onInspect?.(props.entity)}>Inspecter</button> : null}
        {props.onDelete ? <button type="button" onClick={() => props.onDelete?.(props.entity)}>Supprimer</button> : null}
      </div>
    </article>
  );
}

function TableRenderer(props: EntityRendererProps) {
  const columns = (nested(props.entity.state, "table", "columns") as unknown[] | undefined) ?? [];
  const rows = (nested(props.entity.state, "table", "rows") as unknown[][] | undefined) ?? [];
  const rowCount = Number(nested(props.entity.state, "table", "row_count") ?? rows.length);
  return (
    <article
      className={cardClass(props, styles.tableCard)}
      data-world-id={props.entity["@id"]}
      onClick={(event) => selectFromClick(event, props.entity, props.onFocus)}
    >
      <div className={styles.entityHead}><span className={styles.typeIcon}>T</span><span>Table · {rowCount} lignes</span></div>
      <h3>{props.entity.name}</h3>
      <div className={styles.tablePreview}>
        <table><thead><tr>{columns.slice(0, 4).map((column, index) => <th key={index}>{String(column)}</th>)}</tr></thead>
        <tbody>{rows.slice(0, 3).map((row, rowIndex) => <tr key={rowIndex}>{row.slice(0, 4).map((cell, index) => <td key={index}>{String(cell)}</td>)}</tr>)}</tbody></table>
      </div>
      <ChangeHint entity={props.entity} />
      <CardActions entity={props.entity} onInspect={props.onInspect} onDelete={props.onDelete} />
    </article>
  );
}

function ResultRenderer(props: EntityRendererProps) {
  const value = String(nested(props.entity.state, "result", "value") ?? "");
  return (
    <article
      className={cardClass(props, styles.resultCard)}
      data-world-id={props.entity["@id"]}
      onClick={(event) => selectFromClick(event, props.entity, props.onFocus)}
    >
      <div className={styles.entityHead}><span className={styles.sentinelMark}>✦</span><span>Résultat Sentinelle</span></div>
      <h3>{props.entity.name}</h3>
      <p className={styles.resultText}>{value}</p>
      <ChangeHint entity={props.entity} />
      <CardActions entity={props.entity} onInspect={props.onInspect} onDelete={props.onDelete} />
    </article>
  );
}

function InstructionRenderer(props: EntityRendererProps) {
  const status = String(nested(props.entity.state, "instruction", "status") ?? "open");
  const message = String(nested(props.entity.state, "instruction", "message") ?? "");
  return (
    <article className={cardClass(props, styles.instructionCard)} data-world-id={props.entity["@id"]} onClick={(event) => selectFromClick(event, props.entity, props.onFocus)}>
      <span className={status === "working" || status === "open" ? styles.pulseMark : styles.sentinelMark}>✦</span>
      <div><p>{props.entity.name}</p>{message ? <small>{message}</small> : null}</div>
    </article>
  );
}

function MomentRenderer(props: EntityRendererProps) {
  const location = String(nested(props.entity.state, "moment", "location") ?? "Moment");
  return (
    <article className={cardClass(props, styles.momentCard)} data-world-id={props.entity["@id"]} onClick={(event) => selectFromClick(event, props.entity, props.onFocus)}>
      <div className={styles.momentVisual}><span>{location}</span><button type="button" onClick={(event) => { event.stopPropagation(); props.onPreview?.(props.entity); }}>▶</button></div>
      <div className={styles.cardBody}>
        <div className={styles.entityHead}><span>Moment</span></div>
        <h3>{props.entity.name}</h3>
        <ChangeHint entity={props.entity} />
        <div className={styles.objectActions} onClick={(event) => event.stopPropagation()}>
          <button type="button" onClick={() => props.onPreview?.(props.entity)}>Aperçu</button>
          {props.inCollection ? <button type="button" onClick={() => props.onRemove?.(props.entity)}>Retirer</button> : <button type="button" onClick={() => props.onAdd?.(props.entity)}>Ajouter</button>}
        </div>
      </div>
    </article>
  );
}

function GenericEntityRenderer(props: EntityRendererProps) {
  return (
    <article className={cardClass(props, styles.genericCard)} data-world-id={props.entity["@id"]} onClick={(event) => selectFromClick(event, props.entity, props.onFocus)}>
      <div className={styles.entityHead}><span className={styles.typeIcon}>·</span><span>{typeName(props.entity)}</span></div>
      <h3>{props.entity.name}</h3>
      <p className={styles.metaLine}>Objet partagé</p>
      <ChangeHint entity={props.entity} />
      <CardActions entity={props.entity} onInspect={props.onInspect} onDelete={props.onDelete} />
    </article>
  );
}

const rendererRegistry: Record<string, EntityRenderer> = {
  Moment: MomentRenderer,
  TextBlock: TextBlockRenderer,
  Image: ImageRenderer,
  Document: FileRenderer,
  File: FileRenderer,
  Link: LinkRenderer,
  Table: TableRenderer,
  Result: ResultRenderer,
  Instruction: InstructionRenderer
};

export function HumanEntityRenderer(props: EntityRendererProps) {
  const Renderer = rendererRegistry[typeName(props.entity)] ?? GenericEntityRenderer;
  return <Renderer {...props} />;
}

export function registeredRendererTypes(): string[] {
  return Object.keys(rendererRegistry);
}
