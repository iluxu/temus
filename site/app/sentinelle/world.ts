export type TemplateId = "blank" | "lucia";

export type WorldTemplate = {
  id: string;
  name: string;
  description: string;
  available: boolean;
  accent: string;
};

export type WorldLink = { rel: string; href: string };
export type WorldAffordanceRef = { "@id": string };

export type WorldEntity = {
  "@id": string;
  "@type": string;
  name: string;
  worldVersion?: number;
  updatedAt?: string | null;
  lastActor?: string | null;
  lastChangeKind?: "human" | "sentinelle" | "service";
  state: Record<string, unknown>;
  links: WorldLink[];
  affordances: WorldAffordanceRef[];
  orderedEntityIds?: string[];
  currentFocus?: string | null;
  contentUrl?: string | null;
};

export type WorkspaceProjection = {
  schema: "sentinelle-workspace.v1";
  product: "Sentinelle";
  mode: "full";
  template: WorldTemplate;
  world: string;
  graph: {
    "@id": string;
    root: string;
    entities: WorldEntity[];
    affordances: Array<Record<string, unknown>>;
  };
  attention: WorldEntity;
  presence: Array<{
    actor: "human" | "sentinelle";
    label: string;
    mark: string;
    focus: string | null;
  }>;
  goal: Record<string, unknown> | null;
  outcome: {
    goal: string;
    status: "SATISFIED" | "UNSATISFIED" | "INDETERMINATE";
    candidate: string | null;
    checks: Array<{
      name: string;
      status: string;
      observed?: unknown;
      reason?: string | null;
    }>;
  } | null;
};

class ProjectionError extends Error {}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ProjectionError(`${label} is invalid`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string, maximum = 4096): string {
  if (typeof value !== "string" || !value || value.length > maximum) {
    throw new ProjectionError(`${label} is invalid`);
  }
  return value;
}

function optionalText(value: unknown, label: string): string | null {
  if (value === null || value === undefined) return null;
  return text(value, label);
}

function integer(value: unknown, label: string): number {
  if (!Number.isInteger(value) || Number(value) < 0) {
    throw new ProjectionError(`${label} is invalid`);
  }
  return Number(value);
}

function list(value: unknown, label: string, maximum = 200): unknown[] {
  if (!Array.isArray(value) || value.length > maximum) {
    throw new ProjectionError(`${label} is invalid`);
  }
  return value;
}

function parseTemplate(value: unknown): WorldTemplate {
  const source = record(value, "template");
  return {
    id: text(source.id, "template.id", 48),
    name: text(source.name, "template.name", 100),
    description: text(source.description, "template.description", 300),
    available: source.available === true,
    accent: text(source.accent, "template.accent", 32)
  };
}

function parseEntity(value: unknown): WorldEntity {
  const source = record(value, "entity");
  const links = list(source.links ?? [], "entity.links", 100).map((item) => {
    const link = record(item, "link");
    return { rel: text(link.rel, "link.rel"), href: text(link.href, "link.href") };
  });
  const affordances = list(source.affordances ?? [], "entity.affordances", 40).map(
    (item) => {
      const affordance = record(item, "affordance");
      return { "@id": text(affordance["@id"], "affordance.@id") };
    }
  );
  const ordered = source.orderedEntityIds;
  return {
    "@id": text(source["@id"], "entity.@id"),
    "@type": text(source["@type"], "entity.@type"),
    name: text(source.name, "entity.name", 500),
    ...(source.worldVersion === undefined
      ? {}
      : { worldVersion: integer(source.worldVersion, "entity.worldVersion") }),
    updatedAt: optionalText(source.updatedAt, "entity.updatedAt"),
    lastActor: optionalText(source.lastActor, "entity.lastActor"),
    lastChangeKind:
      source.lastChangeKind === "human" ||
      source.lastChangeKind === "sentinelle" ||
      source.lastChangeKind === "service"
        ? source.lastChangeKind
        : undefined,
    state: record(source.state ?? {}, "entity.state"),
    links,
    affordances,
    ...(ordered === undefined
      ? {}
      : {
          orderedEntityIds: list(ordered, "entity.orderedEntityIds", 40).map(
            (item) => text(item, "entity.orderedEntityIds[]")
          )
        }),
    currentFocus: optionalText(source.currentFocus, "entity.currentFocus"),
    contentUrl: optionalText(source.contentUrl, "entity.contentUrl")
  };
}

export function parseTemplates(value: unknown): WorldTemplate[] {
  const source = record(value, "templates");
  if (source.schema !== "sentinelle-templates.v1" || source.product !== "Sentinelle") {
    throw new ProjectionError("template projection is incompatible");
  }
  return list(source.templates, "templates.templates", 20).map(parseTemplate);
}

export function parseWorkspace(value: unknown): WorkspaceProjection {
  const source = record(value, "workspace");
  if (
    source.schema !== "sentinelle-workspace.v1" ||
    source.product !== "Sentinelle" ||
    source.mode !== "full"
  ) {
    throw new ProjectionError("workspace projection is incompatible");
  }
  const graph = record(source.graph, "workspace.graph");
  const entities = list(graph.entities, "workspace.graph.entities", 500).map(parseEntity);
  const attention = parseEntity(source.attention);
  const presence = list(source.presence, "workspace.presence", 10).map((item) => {
    const entry = record(item, "presence");
    if (entry.actor !== "human" && entry.actor !== "sentinelle") {
      throw new ProjectionError("presence.actor is invalid");
    }
    const actor: "human" | "sentinelle" = entry.actor;
    return {
      actor,
      label: text(entry.label, "presence.label", 80),
      mark: text(entry.mark, "presence.mark", 8),
      focus: optionalText(entry.focus, "presence.focus")
    };
  });
  let outcome: WorkspaceProjection["outcome"] = null;
  if (source.outcome !== null && source.outcome !== undefined) {
    const rawOutcome = record(source.outcome, "workspace.outcome");
    if (
      rawOutcome.status !== "SATISFIED" &&
      rawOutcome.status !== "UNSATISFIED" &&
      rawOutcome.status !== "INDETERMINATE"
    ) {
      throw new ProjectionError("workspace.outcome.status is invalid");
    }
    outcome = {
      goal: text(rawOutcome.goal, "workspace.outcome.goal"),
      status: rawOutcome.status,
      candidate: optionalText(rawOutcome.candidate, "workspace.outcome.candidate"),
      checks: list(rawOutcome.checks, "workspace.outcome.checks", 40).map((item) => {
        const check = record(item, "outcome.check");
        return {
          name: text(check.name, "outcome.check.name", 200),
          status: text(check.status, "outcome.check.status", 40),
          observed: check.observed,
          reason: optionalText(check.reason, "outcome.check.reason")
        };
      })
    };
  }
  return {
    schema: "sentinelle-workspace.v1",
    product: "Sentinelle",
    mode: "full",
    template: parseTemplate(source.template),
    world: text(source.world, "workspace.world"),
    graph: {
      "@id": text(graph["@id"], "workspace.graph.@id"),
      root: text(graph.root, "workspace.graph.root"),
      entities,
      affordances: list(graph.affordances ?? [], "workspace.graph.affordances", 50).map(
        (item) => record(item, "workspace.graph.affordance")
      )
    },
    attention,
    presence,
    goal: source.goal === null ? null : record(source.goal, "workspace.goal"),
    outcome
  };
}

export function sentinelleApiBase(): string {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://127.0.0.1:8044/v1/sentinelle";
    }
  }
  return "https://api.adoptan.ai/v1/sentinelle";
}

export function typeName(entity: WorldEntity): string {
  const parts = entity["@type"].split(/[\/#]/);
  return parts[parts.length - 1] || "Entity";
}

export function nested(
  value: Record<string, unknown>,
  ...path: string[]
): unknown {
  let current: unknown = value;
  for (const segment of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}
