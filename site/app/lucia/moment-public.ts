export type MomentMode = "public" | "operator";

export type MomentDerivativeV0 = {
  id: string;
  kind:
    | "source_clip"
    | "twitch_clip"
    | "tiktok_vertical"
    | "shorts_vertical"
    | "reels_vertical";
  platform: string;
  status: "created" | "rendered" | "published" | "failed";
  public_url: string | null;
  duration_seconds: number | null;
  format: string | null;
  created_at: string;
};

export type MomentV0 = {
  id: string;
  title: string;
  summary: string;
  category: string;
  status: string;
  public: boolean;
  source: {
    creator: string;
    started_at: string;
    ended_at: string;
    start_seconds: number;
    end_seconds: number;
    public_url: string;
  };
  qualification: {
    hook: string;
    reason: string;
    score: number;
    threshold: number;
    risk: string | null;
    score_semantics: "selection_score_not_confidence";
  };
  audience_reaction: Record<string, number> | null;
  derivatives: MomentDerivativeV0[];
  decisions: Array<{
    id: string | null;
    title: string;
    action: string;
    status: string;
    decided_at: string | null;
    receipts: Array<{ status: string; connector: string; executed_at: string }>;
    outcomes: Array<{
      kind: string;
      status: string;
      metrics: Record<string, number>;
      observed_at: string;
    }>;
  }>;
  updated_at: string;
  match_score?: number;
};

export type MomentCollectionV0 = {
  schema_version: "moment-collection.v0";
  house_slug: "lucia";
  mode: MomentMode;
  moments: MomentV0[];
  categories: string[];
  capabilities: { ask: true; find: true; do: boolean };
  generated_at: string;
};

export type MomentFindV0 = {
  schema_version: "moment-find.v0";
  query: string;
  scope: "public_moments" | "authorized_moments";
  results: MomentV0[];
  limitations: string[];
  generated_at: string;
};

export type MomentAnswerV0 = {
  schema_version: "moment-answer.v0";
  moment_id: string;
  question: string;
  answer: {
    intent: "why_selected" | "source" | "derivatives" | "summary";
    text: string;
    sources: Array<{
      label: string;
      url: string;
      occurred_at: string;
      at_seconds: number;
    }>;
  };
  generated_at: string;
};

export type MomentDoV0 = {
  schema_version: "moment-do.v0";
  moment_id: string;
  status: "needs_lucia";
  decision: { id: string; title: string; status: string; effect: string };
  authority: { requesting_principal: string; owner_approval_required: true };
};

export class MomentValidationError extends Error {}

function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new MomentValidationError(`${field} must be an object`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string, maximum = 2000): string {
  if (typeof value !== "string" || !value.trim() || value.length > maximum) {
    throw new MomentValidationError(`${field} is invalid`);
  }
  return value;
}

function optionalText(value: unknown, field: string, maximum = 2000): string | null {
  return value === null || value === undefined ? null : text(value, field, maximum);
}

function numberValue(value: unknown, field: string, maximum = 1_000_000_000): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > maximum) {
    throw new MomentValidationError(`${field} is invalid`);
  }
  return value;
}

function iso(value: unknown, field: string): string {
  const result = text(value, field, 64);
  if (Number.isNaN(Date.parse(result))) throw new MomentValidationError(`${field} is invalid`);
  return result;
}

function httpsUrl(value: unknown, field: string): string {
  const result = text(value, field, 2048);
  try {
    const parsed = new URL(result);
    const host = parsed.hostname.toLowerCase();
    const allowed = host === "adoptan.ai" || host === "youtu.be" ||
      ["twitch.tv", "tiktok.com", "youtube.com", "instagram.com"].some(
        (domain) => host === domain || host.endsWith(`.${domain}`)
      );
    if (parsed.protocol !== "https:" || !allowed) throw new Error();
  } catch {
    throw new MomentValidationError(`${field} is invalid`);
  }
  return result;
}

function array(value: unknown, field: string, maximum: number): unknown[] {
  if (!Array.isArray(value) || value.length > maximum) {
    throw new MomentValidationError(`${field} is invalid`);
  }
  return value;
}

function parseDerivative(value: unknown, field: string): MomentDerivativeV0 {
  const source = record(value, field);
  const kind = text(source.kind, `${field}.kind`, 40) as MomentDerivativeV0["kind"];
  const status = text(source.status, `${field}.status`, 24) as MomentDerivativeV0["status"];
  if (!["source_clip", "twitch_clip", "tiktok_vertical", "shorts_vertical", "reels_vertical"].includes(kind)) {
    throw new MomentValidationError(`${field}.kind is invalid`);
  }
  if (!["created", "rendered", "published", "failed"].includes(status)) {
    throw new MomentValidationError(`${field}.status is invalid`);
  }
  return {
    id: text(source.id, `${field}.id`, 128),
    kind,
    platform: text(source.platform, `${field}.platform`, 32),
    status,
    public_url: source.public_url == null ? null : httpsUrl(source.public_url, `${field}.public_url`),
    duration_seconds:
      source.duration_seconds == null
        ? null
        : numberValue(source.duration_seconds, `${field}.duration_seconds`, 3600),
    format: optionalText(source.format, `${field}.format`, 80),
    created_at: iso(source.created_at, `${field}.created_at`)
  };
}

function parseMoment(value: unknown, field: string, mode: MomentMode): MomentV0 {
  const source = record(value, field);
  const origin = record(source.source, `${field}.source`);
  const qualification = record(source.qualification, `${field}.qualification`);
  const decisions = array(source.decisions, `${field}.decisions`, 24).map((entry, index) => {
    const decision = record(entry, `${field}.decisions[${index}]`);
    return {
      id: mode === "operator" ? text(decision.id, "decision.id", 128) : null,
      title: text(decision.title, "decision.title", 240),
      action: text(decision.action, "decision.action", 120),
      status: text(decision.status, "decision.status", 40),
      decided_at: decision.decided_at == null ? null : iso(decision.decided_at, "decision.decided_at"),
      receipts: array(decision.receipts, "decision.receipts", 24).map((item) => {
        const receipt = record(item, "receipt");
        return {
          status: text(receipt.status, "receipt.status", 40),
          connector: text(receipt.connector, "receipt.connector", 120),
          executed_at: iso(receipt.executed_at, "receipt.executed_at")
        };
      }),
      outcomes: array(decision.outcomes, "decision.outcomes", 48).map((item) => {
        const outcome = record(item, "outcome");
        const metricsSource = record(outcome.metrics, "outcome.metrics");
        const metrics: Record<string, number> = {};
        for (const [key, metric] of Object.entries(metricsSource)) {
          metrics[key] = numberValue(metric, `outcome.metrics.${key}`);
        }
        return {
          kind: text(outcome.kind, "outcome.kind", 80),
          status: text(outcome.status, "outcome.status", 40),
          metrics,
          observed_at: iso(outcome.observed_at, "outcome.observed_at")
        };
      })
    };
  });
  const audience = mode === "operator" ? record(source.audience_reaction, `${field}.audience_reaction`) : null;
  const audienceReaction: Record<string, number> | null = audience ? {} : null;
  if (audience && audienceReaction) {
    for (const [key, metric] of Object.entries(audience)) {
      audienceReaction[key] = numberValue(metric, `${field}.audience_reaction.${key}`, 100_000);
    }
  }
  const risk = mode === "operator" ? text(qualification.risk, `${field}.qualification.risk`, 80) : null;
  const scoreSemantics = text(qualification.score_semantics, "qualification.score_semantics", 80);
  if (scoreSemantics !== "selection_score_not_confidence") {
    throw new MomentValidationError("qualification.score_semantics is invalid");
  }
  if (mode === "public" && source.public !== true) {
    throw new MomentValidationError("public Moment must be explicitly public");
  }
  return {
    id: text(source.id, `${field}.id`, 128),
    title: text(source.title, `${field}.title`, 180),
    summary: text(source.summary, `${field}.summary`, 800),
    category: text(source.category, `${field}.category`, 80),
    status: text(source.status, `${field}.status`, 40),
    public: source.public === true,
    source: {
      creator: text(origin.creator, `${field}.source.creator`, 80),
      started_at: iso(origin.started_at, `${field}.source.started_at`),
      ended_at: iso(origin.ended_at, `${field}.source.ended_at`),
      start_seconds: numberValue(origin.start_seconds, `${field}.source.start_seconds`, 43_200),
      end_seconds: numberValue(origin.end_seconds, `${field}.source.end_seconds`, 43_200),
      public_url: httpsUrl(origin.public_url, `${field}.source.public_url`)
    },
    qualification: {
      hook: text(qualification.hook, `${field}.qualification.hook`, 400),
      reason: text(qualification.reason, `${field}.qualification.reason`, 1000),
      score: numberValue(qualification.score, `${field}.qualification.score`, 100),
      threshold: numberValue(qualification.threshold, `${field}.qualification.threshold`, 100),
      risk,
      score_semantics: "selection_score_not_confidence"
    },
    audience_reaction: audienceReaction,
    derivatives: array(source.derivatives, `${field}.derivatives`, 24).map((item, index) =>
      parseDerivative(item, `${field}.derivatives[${index}]`)
    ),
    decisions,
    updated_at: iso(source.updated_at, `${field}.updated_at`),
    ...(source.match_score === undefined
      ? {}
      : { match_score: numberValue(source.match_score, `${field}.match_score`, 1) })
  };
}

export function parseMomentCollectionV0(value: unknown): MomentCollectionV0 {
  const source = record(value, "response");
  const mode = text(source.mode, "mode", 16) as MomentMode;
  if (source.schema_version !== "moment-collection.v0" || source.house_slug !== "lucia" || !["public", "operator"].includes(mode)) {
    throw new MomentValidationError("Moment collection identity is invalid");
  }
  const capabilities = record(source.capabilities, "capabilities");
  if (capabilities.ask !== true || capabilities.find !== true || capabilities.do !== (mode === "operator")) {
    throw new MomentValidationError("Moment collection capabilities are invalid");
  }
  return {
    schema_version: "moment-collection.v0",
    house_slug: "lucia",
    mode,
    moments: array(source.moments, "moments", 100).map((item, index) => parseMoment(item, `moments[${index}]`, mode)),
    categories: array(source.categories, "categories", 100).map((item) => text(item, "category", 80)),
    capabilities: { ask: true, find: true, do: mode === "operator" },
    generated_at: iso(source.generated_at, "generated_at")
  };
}

export function parseMomentFindV0(value: unknown, mode: MomentMode): MomentFindV0 {
  const source = record(value, "response");
  const expectedScope = mode === "operator" ? "authorized_moments" : "public_moments";
  if (source.schema_version !== "moment-find.v0" || source.scope !== expectedScope) {
    throw new MomentValidationError("Moment Find scope is invalid");
  }
  return {
    schema_version: "moment-find.v0",
    query: text(source.query, "query", 600),
    scope: expectedScope,
    results: array(source.results, "results", 25).map((item, index) => parseMoment(item, `results[${index}]`, mode)),
    limitations: array(source.limitations, "limitations", 16).map((item) => text(item, "limitation", 600)),
    generated_at: iso(source.generated_at, "generated_at")
  };
}

export function parseMomentAnswerV0(value: unknown): MomentAnswerV0 {
  const source = record(value, "response");
  const answer = record(source.answer, "answer");
  const intent = text(answer.intent, "answer.intent", 40) as MomentAnswerV0["answer"]["intent"];
  if (source.schema_version !== "moment-answer.v0" || !["why_selected", "source", "derivatives", "summary"].includes(intent)) {
    throw new MomentValidationError("Moment answer identity is invalid");
  }
  return {
    schema_version: "moment-answer.v0",
    moment_id: text(source.moment_id, "moment_id", 128),
    question: text(source.question, "question", 600),
    answer: {
      intent,
      text: text(answer.text, "answer.text", 2000),
      sources: array(answer.sources, "answer.sources", 12).map((item) => {
        const evidence = record(item, "answer.source");
        return {
          label: text(evidence.label, "answer.source.label", 160),
          url: httpsUrl(evidence.url, "answer.source.url"),
          occurred_at: iso(evidence.occurred_at, "answer.source.occurred_at"),
          at_seconds: numberValue(evidence.at_seconds, "answer.source.at_seconds", 43_200)
        };
      })
    },
    generated_at: iso(source.generated_at, "generated_at")
  };
}

export function parseMomentDoV0(value: unknown): MomentDoV0 {
  const source = record(value, "response");
  const decision = record(source.decision, "decision");
  const authority = record(source.authority, "authority");
  if (source.schema_version !== "moment-do.v0" || source.status !== "needs_lucia" || authority.owner_approval_required !== true) {
    throw new MomentValidationError("Moment Do result is invalid");
  }
  return {
    schema_version: "moment-do.v0",
    moment_id: text(source.moment_id, "moment_id", 128),
    status: "needs_lucia",
    decision: {
      id: text(decision.id, "decision.id", 128),
      title: text(decision.title, "decision.title", 240),
      status: text(decision.status, "decision.status", 40),
      effect: text(decision.effect, "decision.effect", 400)
    },
    authority: {
      requesting_principal: text(authority.requesting_principal, "authority.requesting_principal", 128),
      owner_approval_required: true
    }
  };
}
