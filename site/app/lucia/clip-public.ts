export type ClipCategorySlug =
  | "musique"
  | "irl-voyage"
  | "gaming"
  | "communaute"
  | "storytime"
  | "quotidien";

export type ClipStatusSlug =
  | "ready_da_tiktok"
  | "rendered_without_da_tiktok"
  | "processing"
  | "failed";

export type ClipMatchV0 = {
  score: number;
  score_semantics: "bounded_worker_relevance_not_quality";
  evidence: Array<"title" | "editorial" | "transcript">;
  reasons: string[];
};

export type ClipPublicV0 = {
  id: string;
  title: string;
  created_at: string;
  category: ClipCategorySlug;
  category_label: string;
  status: ClipStatusSlug;
  status_label: string;
  public_url: string;
  variant_count: number;
  has_render: boolean;
  ready_tiktok: boolean;
  moment_id: null;
  match: ClipMatchV0 | null;
};

export type ClipFacetV0 = { slug: string; label: string; count: number };

export type WorldAttachReceiptV1 = {
  schema_version: "world-attach-receipt.v1";
  world: "https://api.adoptan.ai/v1/public/houses/lucia/world";
  runtime: "llm-route";
  attached_before_inference: true;
  binding_roles: Array<
    "workspace" | "state" | "context" | "resources" | "guidance" | "skills" | "extensions" | "capabilities"
  >;
  guidance_loaded: true;
  capabilities_mounted: false;
};

export type ClipCollectionPublicV0 = {
  schema_version: "clip-collection-public.v0";
  house_slug: "lucia";
  scope: "public_twitch_clips";
  clips: ClipPublicV0[];
  categories: ClipFacetV0[];
  statuses: ClipFacetV0[];
  totals: { public_clips: number; matching_clips: number };
  filters: {
    query: string;
    category: "all" | ClipCategorySlug;
    status: "all" | ClipStatusSlug;
    offset: number;
    limit: number;
    next_offset: number | null;
  };
  capabilities: { ask: true; find: true; do: false };
  world: WorldAttachReceiptV1 | null;
  category_basis: "derived_filter_v0";
  limitations: string[];
  generated_at: string;
};

export type ClipAnswerPublicV0 = {
  schema_version: "clip-answer-public.v0";
  clip_id: string;
  question: string;
  context_query: string | null;
  answer: {
    intent: "why_catalogued" | "source" | "derivatives" | "summary";
    text: string;
    sources: Array<{
      label: string;
      url: string;
      occurred_at: string;
      at_seconds: null;
    }>;
    limitations: string[];
  };
  world: WorldAttachReceiptV1 | null;
  generated_at: string;
};

export class ClipPublicValidationError extends Error {}

const categories: Record<ClipCategorySlug, string> = {
  musique: "Musique",
  "irl-voyage": "IRL & voyage",
  gaming: "Gaming",
  communaute: "Communauté",
  storytime: "Storytime",
  quotidien: "Quotidien"
};

const statuses: Record<ClipStatusSlug, string> = {
  ready_da_tiktok: "Prêt TikTok",
  rendered_without_da_tiktok: "Rendu",
  processing: "En cours",
  failed: "À revoir"
};

function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ClipPublicValidationError(`${field} must be an object`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string, maximum = 2000): string {
  if (typeof value !== "string" || !value.trim() || value.length > maximum) {
    throw new ClipPublicValidationError(`${field} is invalid`);
  }
  return value;
}

function integer(value: unknown, field: string, maximum = 100_000): number {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > maximum) {
    throw new ClipPublicValidationError(`${field} is invalid`);
  }
  return value as number;
}

function iso(value: unknown, field: string): string {
  const result = text(value, field, 64);
  if (Number.isNaN(Date.parse(result))) throw new ClipPublicValidationError(`${field} is invalid`);
  return result;
}

function twitchUrl(value: unknown, field: string): string {
  const result = text(value, field, 2048);
  try {
    const parsed = new URL(result);
    if (parsed.protocol !== "https:" || !["twitch.tv", "www.twitch.tv", "clips.twitch.tv"].includes(parsed.hostname.toLowerCase())) {
      throw new Error();
    }
  } catch {
    throw new ClipPublicValidationError(`${field} is invalid`);
  }
  return result;
}

function list(value: unknown, field: string, maximum: number): unknown[] {
  if (!Array.isArray(value) || value.length > maximum) {
    throw new ClipPublicValidationError(`${field} is invalid`);
  }
  return value;
}

const worldRoles: WorldAttachReceiptV1["binding_roles"] = [
  "workspace", "state", "context", "resources", "guidance", "skills", "extensions", "capabilities"
];

function parseWorldReceipt(value: unknown): WorldAttachReceiptV1 | null {
  if (value === null || value === undefined) return null;
  const source = record(value, "world");
  const roles = list(source.binding_roles, "world.binding_roles", worldRoles.length);
  if (
    source.schema_version !== "world-attach-receipt.v1" ||
    source.world !== "https://api.adoptan.ai/v1/public/houses/lucia/world" ||
    source.runtime !== "llm-route" ||
    source.attached_before_inference !== true ||
    source.guidance_loaded !== true ||
    source.capabilities_mounted !== false ||
    roles.length !== worldRoles.length ||
    roles.some((role, index) => role !== worldRoles[index])
  ) {
    throw new ClipPublicValidationError("WORLD attachment receipt is invalid");
  }
  return {
    schema_version: "world-attach-receipt.v1",
    world: "https://api.adoptan.ai/v1/public/houses/lucia/world",
    runtime: "llm-route",
    attached_before_inference: true,
    binding_roles: [...worldRoles],
    guidance_loaded: true,
    capabilities_mounted: false
  };
}

function parseMatch(value: unknown, field: string): ClipMatchV0 | null {
  if (value === null) return null;
  const source = record(value, field);
  if (
    typeof source.score !== "number" || !Number.isFinite(source.score) ||
    source.score < 0 || source.score > 1 ||
    source.score_semantics !== "bounded_worker_relevance_not_quality"
  ) {
    throw new ClipPublicValidationError(`${field} is invalid`);
  }
  const evidence = list(source.evidence, `${field}.evidence`, 3).map((item) => {
    if (!(["title", "editorial", "transcript"] as unknown[]).includes(item)) {
      throw new ClipPublicValidationError(`${field}.evidence is invalid`);
    }
    return item as "title" | "editorial" | "transcript";
  });
  if (!evidence.length || new Set(evidence).size !== evidence.length) {
    throw new ClipPublicValidationError(`${field}.evidence is invalid`);
  }
  const reasons = list(source.reasons, `${field}.reasons`, 6).map((item, index) =>
    text(item, `${field}.reasons[${index}]`, 500)
  );
  if (
    !reasons.length ||
    reasons.some((reason) => /\b(?:marqueurs?|lexical|transcript(?:ion)?|score|candidat|mod[eè]le)\b/i.test(reason))
  ) {
    throw new ClipPublicValidationError(`${field}.reasons is invalid`);
  }
  return {
    score: source.score,
    score_semantics: "bounded_worker_relevance_not_quality",
    evidence,
    reasons
  };
}

function parseClip(value: unknown, field: string): ClipPublicV0 {
  const source = record(value, field);
  const category = text(source.category, `${field}.category`, 80) as ClipCategorySlug;
  const status = text(source.status, `${field}.status`, 80) as ClipStatusSlug;
  if (!(category in categories) || source.category_label !== categories[category]) {
    throw new ClipPublicValidationError(`${field}.category is invalid`);
  }
  if (!(status in statuses) || source.status_label !== statuses[status]) {
    throw new ClipPublicValidationError(`${field}.status is invalid`);
  }
  if (source.moment_id !== null || typeof source.has_render !== "boolean" || typeof source.ready_tiktok !== "boolean") {
    throw new ClipPublicValidationError(`${field}.canonical state is invalid`);
  }
  if (source.ready_tiktok && (!source.has_render || status !== "ready_da_tiktok")) {
    throw new ClipPublicValidationError(`${field}.render state is invalid`);
  }
  return {
    id: text(source.id, `${field}.id`, 180),
    title: text(source.title, `${field}.title`, 240),
    created_at: iso(source.created_at, `${field}.created_at`),
    category,
    category_label: categories[category],
    status,
    status_label: statuses[status],
    public_url: twitchUrl(source.public_url, `${field}.public_url`),
    variant_count: integer(source.variant_count, `${field}.variant_count`, 100),
    has_render: source.has_render,
    ready_tiktok: source.ready_tiktok,
    moment_id: null,
    match: parseMatch(source.match, `${field}.match`)
  };
}

function parseFacets(value: unknown, expected: Record<string, string>, field: string): ClipFacetV0[] {
  const raw = list(value, field, Object.keys(expected).length);
  if (raw.length !== Object.keys(expected).length) throw new ClipPublicValidationError(`${field} is invalid`);
  const seen = new Set<string>();
  return raw.map((entry, index) => {
    const source = record(entry, `${field}[${index}]`);
    const slug = text(source.slug, `${field}[${index}].slug`, 80);
    if (!(slug in expected) || seen.has(slug) || source.label !== expected[slug]) {
      throw new ClipPublicValidationError(`${field}[${index}] is invalid`);
    }
    seen.add(slug);
    return { slug, label: expected[slug], count: integer(source.count, `${field}[${index}].count`) };
  });
}

export function parseClipCollectionPublicV0(value: unknown): ClipCollectionPublicV0 {
  const source = record(value, "response");
  const totals = record(source.totals, "totals");
  const filters = record(source.filters, "filters");
  const capabilities = record(source.capabilities, "capabilities");
  const category = text(filters.category, "filters.category", 80);
  const status = text(filters.status, "filters.status", 80);
  if (
    source.schema_version !== "clip-collection-public.v0" ||
    source.house_slug !== "lucia" ||
    source.scope !== "public_twitch_clips" ||
    source.category_basis !== "derived_filter_v0" ||
    !["all", ...Object.keys(categories)].includes(category) ||
    !["all", ...Object.keys(statuses)].includes(status) ||
    capabilities.ask !== true || capabilities.find !== true || capabilities.do !== false
  ) {
    throw new ClipPublicValidationError("Clip collection identity is invalid");
  }
  const nextOffset = filters.next_offset === null ? null : integer(filters.next_offset, "filters.next_offset", 20_000);
  const query = typeof filters.query === "string" && filters.query.length <= 600 ? filters.query : null;
  if (query === null) throw new ClipPublicValidationError("filters.query is invalid");
  const clips = list(source.clips, "clips", 48).map((entry, index) => parseClip(entry, `clips[${index}]`));
  if (clips.some((clip) => query.trim() ? clip.match === null : clip.match !== null)) {
    throw new ClipPublicValidationError("clips match context is invalid");
  }
  const matchingClips = integer(totals.matching_clips, "totals.matching_clips");
  if (query.trim() && (matchingClips !== clips.length || nextOffset !== null)) {
    throw new ClipPublicValidationError("Find selection is not bounded");
  }
  return {
    schema_version: "clip-collection-public.v0",
    house_slug: "lucia",
    scope: "public_twitch_clips",
    clips,
    categories: parseFacets(source.categories, categories, "categories"),
    statuses: parseFacets(source.statuses, statuses, "statuses"),
    totals: {
      public_clips: integer(totals.public_clips, "totals.public_clips"),
      matching_clips: matchingClips
    },
    filters: {
      query,
      category: category as "all" | ClipCategorySlug,
      status: status as "all" | ClipStatusSlug,
      offset: integer(filters.offset, "filters.offset", 20_000),
      limit: integer(filters.limit, "filters.limit", 48),
      next_offset: nextOffset
    },
    capabilities: { ask: true, find: true, do: false },
    world: parseWorldReceipt(source.world),
    category_basis: "derived_filter_v0",
    limitations: list(source.limitations, "limitations", 16).map((item) => text(item, "limitation", 600)),
    generated_at: iso(source.generated_at, "generated_at")
  };
}

export function parseClipAnswerPublicV0(value: unknown): ClipAnswerPublicV0 {
  const source = record(value, "response");
  const answer = record(source.answer, "answer");
  const intent = text(answer.intent, "answer.intent", 40) as ClipAnswerPublicV0["answer"]["intent"];
  if (source.schema_version !== "clip-answer-public.v0" || !["why_catalogued", "source", "derivatives", "summary"].includes(intent)) {
    throw new ClipPublicValidationError("Clip answer identity is invalid");
  }
  const contextQuery = source.context_query === null
    ? null
    : typeof source.context_query === "string" && source.context_query.trim() && source.context_query.length <= 600
      ? source.context_query
      : null;
  if (source.context_query !== null && contextQuery === null) {
    throw new ClipPublicValidationError("context_query is invalid");
  }
  return {
    schema_version: "clip-answer-public.v0",
    clip_id: text(source.clip_id, "clip_id", 180),
    question: text(source.question, "question", 600),
    context_query: contextQuery,
    answer: {
      intent,
      text: text(answer.text, "answer.text", 2000),
      sources: list(answer.sources, "answer.sources", 4).map((item, index) => {
        const evidence = record(item, `answer.sources[${index}]`);
        if (evidence.at_seconds !== null) throw new ClipPublicValidationError("source offset is invalid");
        return {
          label: text(evidence.label, "source.label", 160),
          url: twitchUrl(evidence.url, "source.url"),
          occurred_at: iso(evidence.occurred_at, "source.occurred_at"),
          at_seconds: null
        };
      }),
      limitations: list(answer.limitations, "answer.limitations", 16).map((item) => text(item, "limitation", 600))
    },
    world: parseWorldReceipt(source.world),
    generated_at: iso(source.generated_at, "generated_at")
  };
}
