import { HousePublicV1, parseHousePublicV1 } from "./house-public";

export const HOUSE_EXPERIENCE_SCHEMA_VERSION =
  "house-experience-public.v1" as const;

export type LuciaExperienceMode = "live" | "replay";
export type ReplayControlAction =
  | "play"
  | "pause"
  | "next"
  | "seek"
  | "restart";

export interface PublicEvidenceV1 {
  label: string;
  occurred_at: string;
  url: string | null;
  sha256: string | null;
}

export interface PublicTopicV1 {
  kind: "derived";
  label: "DERIVED";
  title: string;
  summary: string;
  window: {
    start_seconds: number;
    end_seconds: number;
    started_at: string;
    ended_at: string;
  };
  source: PublicEvidenceV1;
  limitations: string[];
}

export interface PublicClipCandidateV1 {
  title: string;
  reason: string;
  score: number;
  threshold: number;
  status: "historical_automation_selected";
  public_url: null;
  window: { start_seconds: number; end_seconds: number };
  decision: {
    kind: "historical_automation";
    allowed: true;
    owner_decision_recorded: false;
  };
  source: PublicEvidenceV1;
}

export interface PublicReceiptV1 {
  kind: "execution_observation";
  status: "created";
  public_url: string;
  asset_created_at: string;
  occurred_at: string;
  governed_decision_recorded: false;
  source: PublicEvidenceV1;
}

export interface PublicOutcomeV1 {
  kind: "performance";
  target_milestone_seconds: number;
  observed_age_seconds: number;
  age_basis: "twitch_reported_sample_age";
  view_count: number;
  retention_available: false;
  attribution: "observational";
  occurred_at: string;
  source: PublicEvidenceV1;
}

export interface PublicAnswerSourceV1 extends PublicEvidenceV1 {
  at_seconds: number | null;
}

export interface PublicAnswerV1 {
  intent:
    | "live_topic"
    | "clip_why"
    | "what_happened_after"
    | "keep"
    | "unsupported";
  status: "answered" | "unavailable" | "would_request_approval";
  text: string;
  sources: PublicAnswerSourceV1[];
  limitations: string[];
}

export interface ReplaySessionPublicV1 {
  id: string;
  story_slug: "a-day-with-lucia";
  status: "ready" | "playing" | "paused" | "completed";
  virtual_time: string;
  from: string;
  to: string;
  speed: number;
  revision: number;
}

export interface ReplayMomentPublicV1 {
  id: string;
  kind:
    | "stream_started"
    | "topic_derived"
    | "clip_candidate"
    | "automation_selected"
    | "clip_created"
    | "performance_observed"
    | "stream_ended";
  label: string;
  occurred_at: string;
  state: "past" | "current";
  dwell_seconds: number;
}

export interface ReplayStoryPublicV1 {
  slug: "a-day-with-lucia";
  title: string;
  current_moment: string;
  moments: ReplayMomentPublicV1[];
}

export interface HouseExperiencePublicV1 {
  schema_version: typeof HOUSE_EXPERIENCE_SCHEMA_VERSION;
  mode: LuciaExperienceMode;
  real_historical_data: boolean;
  side_effect_policy: "read_only" | "historical_only";
  generated_at: string;
  as_of: string;
  house: HousePublicV1;
  capabilities: {
    ask: true;
    replay: true;
    find: false;
    participate: "unavailable";
  };
  session: ReplaySessionPublicV1 | null;
  story: ReplayStoryPublicV1 | null;
  topic: PublicTopicV1 | null;
  clip_candidate: PublicClipCandidateV1 | null;
  receipt: PublicReceiptV1 | null;
  outcomes: PublicOutcomeV1[];
  answer: PublicAnswerV1 | null;
  controls: {
    allowed: ReplayControlAction[];
    seek_min: string;
    seek_max: string;
    next_after_seconds: number | null;
  } | null;
  limitations: string[];
}

export class HouseExperienceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HouseExperienceValidationError";
  }
}

type UnknownRecord = Record<string, unknown>;

export const LUCIA_REPLAY_SESSION_ID_RE = /^rps_[a-f0-9]{32}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA256_RE = /^[0-9a-f]{64}$/;

function record(value: unknown, field: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new HouseExperienceValidationError(`${field} must be an object`);
  }
  return value as UnknownRecord;
}

function literal<T>(value: unknown, expected: T, field: string): T {
  if (value !== expected) {
    throw new HouseExperienceValidationError(`${field} is invalid`);
  }
  return expected;
}

function oneOf<T extends readonly string[]>(
  value: unknown,
  options: T,
  field: string
): T[number] {
  if (typeof value !== "string" || !options.includes(value)) {
    throw new HouseExperienceValidationError(`${field} is invalid`);
  }
  return value as T[number];
}

function text(value: unknown, field: string, maximum = 900): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > maximum
  ) {
    throw new HouseExperienceValidationError(`${field} is invalid`);
  }
  return value;
}

function iso(value: unknown, field: string): string {
  const parsed = text(value, field, 64);
  if (!Number.isFinite(Date.parse(parsed))) {
    throw new HouseExperienceValidationError(`${field} is invalid`);
  }
  return parsed;
}

function numberValue(
  value: unknown,
  field: string,
  minimum = 0,
  maximum = 1_000_000_000
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new HouseExperienceValidationError(`${field} is invalid`);
  }
  return value;
}

function integer(
  value: unknown,
  field: string,
  minimum = 0,
  maximum = 1_000_000_000
): number {
  const parsed = numberValue(value, field, minimum, maximum);
  if (!Number.isInteger(parsed)) {
    throw new HouseExperienceValidationError(`${field} is invalid`);
  }
  return parsed;
}

function twitchUrl(value: unknown, field: string): string {
  const raw = text(value, field, 2048);
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new HouseExperienceValidationError(`${field} is invalid`);
  }
  if (
    parsed.protocol !== "https:" ||
    !["twitch.tv", "www.twitch.tv", "clips.twitch.tv"].includes(
      parsed.hostname
    )
  ) {
    throw new HouseExperienceValidationError(`${field} is invalid`);
  }
  return parsed.toString();
}

function nullableTwitchUrl(value: unknown, field: string): string | null {
  return value === null ? null : twitchUrl(value, field);
}

function nullableSha256(value: unknown, field: string): string | null {
  if (value === null) return null;
  const parsed = text(value, field, 64).toLowerCase();
  if (!SHA256_RE.test(parsed)) {
    throw new HouseExperienceValidationError(`${field} is invalid`);
  }
  return parsed;
}

function textList(value: unknown, field: string, maximum = 16): string[] {
  if (!Array.isArray(value) || value.length > maximum) {
    throw new HouseExperienceValidationError(`${field} is invalid`);
  }
  return value.map((item, index) => text(item, `${field}[${index}]`));
}

function evidence(value: unknown, field: string): PublicEvidenceV1 {
  const source = record(value, field);
  return {
    label: text(source.label, `${field}.label`, 160),
    occurred_at: iso(source.occurred_at, `${field}.occurred_at`),
    url: nullableTwitchUrl(source.url, `${field}.url`),
    sha256: nullableSha256(source.sha256, `${field}.sha256`)
  };
}

function topic(value: unknown): PublicTopicV1 | null {
  if (value === null) return null;
  const source = record(value, "topic");
  const window = record(source.window, "topic.window");
  return {
    kind: literal(source.kind, "derived", "topic.kind"),
    label: literal(source.label, "DERIVED", "topic.label"),
    title: text(source.title, "topic.title", 180),
    summary: text(source.summary, "topic.summary"),
    window: {
      start_seconds: numberValue(
        window.start_seconds,
        "topic.window.start_seconds",
        0,
        86_400
      ),
      end_seconds: numberValue(
        window.end_seconds,
        "topic.window.end_seconds",
        0,
        86_400
      ),
      started_at: iso(window.started_at, "topic.window.started_at"),
      ended_at: iso(window.ended_at, "topic.window.ended_at")
    },
    source: evidence(source.source, "topic.source"),
    limitations: textList(source.limitations, "topic.limitations")
  };
}

function candidate(value: unknown): PublicClipCandidateV1 | null {
  if (value === null) return null;
  const source = record(value, "clip_candidate");
  const window = record(source.window, "clip_candidate.window");
  const decision = record(source.decision, "clip_candidate.decision");
  const sourceEvidence = evidence(source.source, "clip_candidate.source");
  if (sourceEvidence.url !== null) {
    throw new HouseExperienceValidationError(
      "clip candidate cannot expose a future public URL"
    );
  }
  return {
    title: text(source.title, "clip_candidate.title", 180),
    reason: text(source.reason, "clip_candidate.reason"),
    score: numberValue(source.score, "clip_candidate.score", 0, 100),
    threshold: numberValue(source.threshold, "clip_candidate.threshold", 0, 100),
    status: literal(
      source.status,
      "historical_automation_selected",
      "clip_candidate.status"
    ),
    public_url: literal(source.public_url, null, "clip_candidate.public_url"),
    window: {
      start_seconds: numberValue(
        window.start_seconds,
        "clip_candidate.window.start_seconds",
        0,
        86_400
      ),
      end_seconds: numberValue(
        window.end_seconds,
        "clip_candidate.window.end_seconds",
        0,
        86_400
      )
    },
    decision: {
      kind: literal(
        decision.kind,
        "historical_automation",
        "clip_candidate.decision.kind"
      ),
      allowed: literal(
        decision.allowed,
        true,
        "clip_candidate.decision.allowed"
      ),
      owner_decision_recorded: literal(
        decision.owner_decision_recorded,
        false,
        "clip_candidate.decision.owner_decision_recorded"
      )
    },
    source: sourceEvidence
  };
}

function receipt(value: unknown): PublicReceiptV1 | null {
  if (value === null) return null;
  const source = record(value, "receipt");
  const publicUrl = twitchUrl(source.public_url, "receipt.public_url");
  const sourceEvidence = evidence(source.source, "receipt.source");
  if (sourceEvidence.url !== publicUrl) {
    throw new HouseExperienceValidationError(
      "receipt source URL does not match its public URL"
    );
  }
  return {
    kind: literal(source.kind, "execution_observation", "receipt.kind"),
    status: literal(source.status, "created", "receipt.status"),
    public_url: publicUrl,
    asset_created_at: iso(source.asset_created_at, "receipt.asset_created_at"),
    occurred_at: iso(source.occurred_at, "receipt.occurred_at"),
    governed_decision_recorded: literal(
      source.governed_decision_recorded,
      false,
      "receipt.governed_decision_recorded"
    ),
    source: sourceEvidence
  };
}

function outcomes(value: unknown): PublicOutcomeV1[] {
  if (!Array.isArray(value) || value.length > 12) {
    throw new HouseExperienceValidationError("outcomes is invalid");
  }
  return value.map((raw, index) => {
    const source = record(raw, `outcomes[${index}]`);
    return {
      kind: literal(source.kind, "performance", `outcomes[${index}].kind`),
      target_milestone_seconds: integer(
        source.target_milestone_seconds,
        `outcomes[${index}].target_milestone_seconds`,
        0,
        7 * 86_400
      ),
      observed_age_seconds: integer(
        source.observed_age_seconds,
        `outcomes[${index}].observed_age_seconds`,
        0,
        7 * 86_400
      ),
      age_basis: literal(
        source.age_basis,
        "twitch_reported_sample_age",
        `outcomes[${index}].age_basis`
      ),
      view_count: integer(source.view_count, `outcomes[${index}].view_count`),
      retention_available: literal(
        source.retention_available,
        false,
        `outcomes[${index}].retention_available`
      ),
      attribution: literal(
        source.attribution,
        "observational",
        `outcomes[${index}].attribution`
      ),
      occurred_at: iso(source.occurred_at, `outcomes[${index}].occurred_at`),
      source: evidence(source.source, `outcomes[${index}].source`)
    };
  });
}

function answer(value: unknown): PublicAnswerV1 | null {
  if (value === null) return null;
  const source = record(value, "answer");
  if (!Array.isArray(source.sources) || source.sources.length > 8) {
    throw new HouseExperienceValidationError("answer.sources is invalid");
  }
  return {
    intent: oneOf(
      source.intent,
      [
        "live_topic",
        "clip_why",
        "what_happened_after",
        "keep",
        "unsupported"
      ] as const,
      "answer.intent"
    ),
    status: oneOf(
      source.status,
      ["answered", "unavailable", "would_request_approval"] as const,
      "answer.status"
    ),
    text: text(source.text, "answer.text", 1400),
    sources: source.sources.map((raw, index) => {
      const item = record(raw, `answer.sources[${index}]`);
      return {
        ...evidence(item, `answer.sources[${index}]`),
        at_seconds:
          item.at_seconds === null
            ? null
            : numberValue(
                item.at_seconds,
                `answer.sources[${index}].at_seconds`,
                0,
                86_400
              )
      };
    }),
    limitations: textList(source.limitations, "answer.limitations")
  };
}

function assertNoFutureEvidence(
  experience: Pick<
    HouseExperiencePublicV1,
    | "as_of"
    | "house"
    | "topic"
    | "clip_candidate"
    | "receipt"
    | "outcomes"
    | "answer"
  >
) {
  const cutoff = Date.parse(experience.as_of);
  const visibleTimes: string[] = [experience.house.presence.updated_at];
  if (experience.house.now) {
    const { started_at, ended_at, source } = experience.house.now;
    if (started_at) visibleTimes.push(started_at);
    if (ended_at) visibleTimes.push(ended_at);
    if (source.occurred_at) visibleTimes.push(source.occurred_at);
  }
  if (experience.topic) {
    visibleTimes.push(
      experience.topic.window.ended_at,
      experience.topic.source.occurred_at
    );
  }
  if (experience.clip_candidate) {
    visibleTimes.push(experience.clip_candidate.source.occurred_at);
  }
  if (experience.receipt) {
    visibleTimes.push(
      experience.receipt.asset_created_at,
      experience.receipt.occurred_at,
      experience.receipt.source.occurred_at
    );
  }
  for (const outcome of experience.outcomes) {
    visibleTimes.push(outcome.occurred_at, outcome.source.occurred_at);
  }
  if (experience.answer) {
    for (const source of experience.answer.sources) {
      visibleTimes.push(source.occurred_at);
    }
  }
  if (visibleTimes.some((value) => Date.parse(value) > cutoff)) {
    throw new HouseExperienceValidationError(
      "future evidence leaked into experience snapshot"
    );
  }
}

export function parseHouseExperiencePublicV1(
  value: unknown
): HouseExperiencePublicV1 {
  const source = record(value, "response");
  const mode = oneOf(source.mode, ["live", "replay"] as const, "mode");
  const asOf = iso(source.as_of, "as_of");
  const parsedTopic = topic(source.topic);
  const parsedCandidate = candidate(source.clip_candidate);
  const parsedReceipt = receipt(source.receipt);
  const parsedOutcomes = outcomes(source.outcomes);

  let session: ReplaySessionPublicV1 | null = null;
  let story: ReplayStoryPublicV1 | null = null;
  let controls: HouseExperiencePublicV1["controls"] = null;

  if (mode === "live") {
    literal(source.real_historical_data, false, "real_historical_data");
    literal(source.side_effect_policy, "read_only", "side_effect_policy");
    literal(source.session, null, "session");
    literal(source.story, null, "story");
    literal(source.controls, null, "controls");
    if (parsedCandidate || parsedReceipt || parsedOutcomes.length > 0) {
      throw new HouseExperienceValidationError(
        "live experience contains historical clip state"
      );
    }
  } else {
    literal(source.real_historical_data, true, "real_historical_data");
    literal(source.side_effect_policy, "historical_only", "side_effect_policy");

    const rawSession = record(source.session, "session");
    const id = text(rawSession.id, "session.id", 180);
    if (!LUCIA_REPLAY_SESSION_ID_RE.test(id)) {
      throw new HouseExperienceValidationError("session.id is invalid");
    }
    session = {
      id,
      story_slug: literal(
        rawSession.story_slug,
        "a-day-with-lucia",
        "session.story_slug"
      ),
      status: oneOf(
        rawSession.status,
        ["ready", "playing", "paused", "completed"] as const,
        "session.status"
      ),
      virtual_time: iso(rawSession.virtual_time, "session.virtual_time"),
      from: iso(rawSession.from, "session.from"),
      to: iso(rawSession.to, "session.to"),
      speed: numberValue(rawSession.speed, "session.speed", 0.1, 1000),
      revision: integer(rawSession.revision, "session.revision", 1)
    };
    if (Date.parse(session.virtual_time) !== Date.parse(asOf)) {
      throw new HouseExperienceValidationError(
        "session.virtual_time must match as_of"
      );
    }

    const rawStory = record(source.story, "story");
    if (
      !Array.isArray(rawStory.moments) ||
      rawStory.moments.length === 0 ||
      rawStory.moments.length > 24
    ) {
      throw new HouseExperienceValidationError("story.moments is invalid");
    }
    const seen = new Set<string>();
    const moments = rawStory.moments.map((raw, index): ReplayMomentPublicV1 => {
      const item = record(raw, `story.moments[${index}]`);
      const momentId = text(item.id, `story.moments[${index}].id`, 80);
      if (!SLUG_RE.test(momentId) || seen.has(momentId)) {
        throw new HouseExperienceValidationError(
          `story.moments[${index}].id is invalid`
        );
      }
      seen.add(momentId);
      const occurredAt = iso(
        item.occurred_at,
        `story.moments[${index}].occurred_at`
      );
      if (Date.parse(occurredAt) > Date.parse(asOf)) {
        throw new HouseExperienceValidationError(
          "future story moment leaked into replay snapshot"
        );
      }
      return {
        id: momentId,
        kind: oneOf(
          item.kind,
          [
            "stream_started",
            "topic_derived",
            "clip_candidate",
            "automation_selected",
            "clip_created",
            "performance_observed",
            "stream_ended"
          ] as const,
          `story.moments[${index}].kind`
        ),
        label: text(item.label, `story.moments[${index}].label`, 180),
        occurred_at: occurredAt,
        state: oneOf(
          item.state,
          ["past", "current"] as const,
          `story.moments[${index}].state`
        ),
        dwell_seconds: integer(
          item.dwell_seconds,
          `story.moments[${index}].dwell_seconds`,
          1,
          120
        )
      };
    });
    const currentMoment = text(
      rawStory.current_moment,
      "story.current_moment",
      80
    );
    if (!seen.has(currentMoment)) {
      throw new HouseExperienceValidationError("story.current_moment is invalid");
    }
    story = {
      slug: literal(rawStory.slug, "a-day-with-lucia", "story.slug"),
      title: text(rawStory.title, "story.title", 180),
      current_moment: currentMoment,
      moments
    };

    const rawControls = record(source.controls, "controls");
    if (
      !Array.isArray(rawControls.allowed) ||
      rawControls.allowed.length > 5 ||
      new Set(rawControls.allowed).size !== rawControls.allowed.length
    ) {
      throw new HouseExperienceValidationError("controls.allowed is invalid");
    }
    controls = {
      allowed: rawControls.allowed.map((item, index) =>
        oneOf(
          item,
          ["play", "pause", "next", "seek", "restart"] as const,
          `controls.allowed[${index}]`
        )
      ),
      seek_min: iso(rawControls.seek_min, "controls.seek_min"),
      seek_max: iso(rawControls.seek_max, "controls.seek_max"),
      next_after_seconds:
        rawControls.next_after_seconds === null
          ? null
          : integer(
              rawControls.next_after_seconds,
              "controls.next_after_seconds",
              0,
              120
            )
    };
    if (session.status === "playing" && controls.next_after_seconds === null) {
      throw new HouseExperienceValidationError(
        "playing replay is missing its server countdown"
      );
    }
    if (session.status !== "playing" && controls.next_after_seconds !== null) {
      throw new HouseExperienceValidationError(
        "paused replay cannot expose an active countdown"
      );
    }
  }

  const parsed: HouseExperiencePublicV1 = {
    schema_version: literal(
      source.schema_version,
      HOUSE_EXPERIENCE_SCHEMA_VERSION,
      "schema_version"
    ),
    mode,
    real_historical_data: mode === "replay",
    side_effect_policy: mode === "replay" ? "historical_only" : "read_only",
    generated_at: iso(source.generated_at, "generated_at"),
    as_of: asOf,
    house: parseHousePublicV1(source.house),
    capabilities: {
      ask: literal(
        record(source.capabilities, "capabilities").ask,
        true,
        "capabilities.ask"
      ),
      replay: literal(
        record(source.capabilities, "capabilities").replay,
        true,
        "capabilities.replay"
      ),
      find: literal(
        record(source.capabilities, "capabilities").find,
        false,
        "capabilities.find"
      ),
      participate: literal(
        record(source.capabilities, "capabilities").participate,
        "unavailable",
        "capabilities.participate"
      )
    },
    session,
    story,
    topic: parsedTopic,
    clip_candidate: parsedCandidate,
    receipt: parsedReceipt,
    outcomes: parsedOutcomes,
    answer: answer(source.answer),
    controls,
    limitations: textList(source.limitations, "limitations")
  };

  if (parsed.receipt && !parsed.clip_candidate) {
    throw new HouseExperienceValidationError(
      "receipt is missing its historical candidate"
    );
  }
  if (parsed.outcomes.length > 0 && !parsed.receipt) {
    throw new HouseExperienceValidationError(
      "outcomes are missing their historical receipt"
    );
  }
  assertNoFutureEvidence(parsed);
  return parsed;
}
