export const HOUSE_PUBLIC_SCHEMA_VERSION = "house-public.v1" as const;

export type LuciaPresenceState =
  | "watching"
  | "working"
  | "waiting"
  | "sleeping";

export interface HousePublicCharterV1 {
  mission: string;
  may: string[];
  asks_before: string[];
  never: string[];
  success_means: string[];
}

export interface HousePublicRoomV1 {
  slug: string;
  name: string;
  summary: string;
  visibility: "public";
}

export interface HousePublicNowV1 {
  kind: "stream";
  title?: string;
  category?: string;
  status: "live" | "offline";
  started_at?: string;
  ended_at?: string;
  public_url?: string;
  source: {
    label: string;
    url?: string;
    occurred_at?: string;
  };
}

export interface HousePublicV1 {
  schema_version: typeof HOUSE_PUBLIC_SCHEMA_VERSION;
  slug: "lucia";
  revision: number;
  projection_hash: string;
  house: {
    name: string;
    locale: string;
    charter: HousePublicCharterV1;
  };
  presence: {
    state: LuciaPresenceState;
    updated_at: string;
  };
  now: HousePublicNowV1 | null;
  rooms: HousePublicRoomV1[];
  changes: [];
  capabilities: {
    ask: false;
    find: false;
    participate: "unavailable";
  };
  generated_at: string;
}

export class HousePublicValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HousePublicValidationError";
  }
}

type UnknownRecord = Record<string, unknown>;

const LIMITS = {
  short: 120,
  copy: 900,
  hash: 256,
  charterItems: 16,
  rooms: 12
} as const;

function record(value: unknown, field: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new HousePublicValidationError(`${field} must be an object`);
  }
  return value as UnknownRecord;
}

function literal<T extends string>(
  value: unknown,
  expected: T,
  field: string
): T {
  if (value !== expected) {
    throw new HousePublicValidationError(`${field} is invalid`);
  }
  return expected;
}

function oneOf<T extends readonly string[]>(
  value: unknown,
  options: T,
  field: string
): T[number] {
  if (typeof value !== "string" || !options.includes(value)) {
    throw new HousePublicValidationError(`${field} is invalid`);
  }
  return value as T[number];
}

function textValue(
  value: unknown,
  field: string,
  maxLength: number = LIMITS.copy
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > maxLength
  ) {
    throw new HousePublicValidationError(`${field} is invalid`);
  }
  return value;
}

function optionalText(
  value: unknown,
  field: string,
  maxLength: number = LIMITS.copy
): string | undefined {
  if (value === undefined) return undefined;
  return textValue(value, field, maxLength);
}

function isoDate(value: unknown, field: string): string {
  const parsed = textValue(value, field, 64);
  if (!Number.isFinite(Date.parse(parsed))) {
    throw new HousePublicValidationError(`${field} is invalid`);
  }
  return parsed;
}

function optionalIsoDate(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  return isoDate(value, field);
}

function publicUrl(value: unknown, field: string): string {
  const raw = textValue(value, field, 2048);
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new HousePublicValidationError(`${field} is invalid`);
  }
  if (parsed.protocol !== "https:") {
    throw new HousePublicValidationError(`${field} is invalid`);
  }
  return parsed.toString();
}

function twitchUrl(value: unknown, field: string): string {
  const parsed = new URL(publicUrl(value, field));
  if (
    parsed.hostname !== "twitch.tv" &&
    parsed.hostname !== "www.twitch.tv"
  ) {
    throw new HousePublicValidationError(`${field} is invalid`);
  }
  return parsed.toString();
}

function textList(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length > LIMITS.charterItems) {
    throw new HousePublicValidationError(`${field} is invalid`);
  }
  return value.map((item, index) =>
    textValue(item, `${field}[${index}]`, LIMITS.copy)
  );
}

function parseCharter(value: unknown): HousePublicCharterV1 {
  const source = record(value, "house.charter");
  return {
    mission: textValue(source.mission, "house.charter.mission"),
    may: textList(source.may, "house.charter.may"),
    asks_before: textList(
      source.asks_before,
      "house.charter.asks_before"
    ),
    never: textList(source.never, "house.charter.never"),
    success_means: textList(
      source.success_means,
      "house.charter.success_means"
    )
  };
}

function parseNow(value: unknown): HousePublicNowV1 | null {
  if (value === null) return null;

  const source = record(value, "now");
  const evidence = record(source.source, "now.source");
  const result: HousePublicNowV1 = {
    kind: literal(source.kind, "stream", "now.kind"),
    status: oneOf(source.status, ["live", "offline"] as const, "now.status"),
    source: {
      label: textValue(evidence.label, "now.source.label", LIMITS.short)
    }
  };

  const title = optionalText(source.title, "now.title");
  const category = optionalText(source.category, "now.category", LIMITS.short);
  const startedAt = optionalIsoDate(source.started_at, "now.started_at");
  const endedAt = optionalIsoDate(source.ended_at, "now.ended_at");
  const url = source.public_url === undefined
    ? undefined
    : twitchUrl(source.public_url, "now.public_url");
  const sourceUrl = evidence.url === undefined
    ? undefined
    : twitchUrl(evidence.url, "now.source.url");
  const occurredAt = optionalIsoDate(
    evidence.occurred_at,
    "now.source.occurred_at"
  );

  if (title !== undefined) result.title = title;
  if (category !== undefined) result.category = category;
  if (startedAt !== undefined) result.started_at = startedAt;
  if (endedAt !== undefined) result.ended_at = endedAt;
  if (url !== undefined) result.public_url = url;
  if (sourceUrl !== undefined) result.source.url = sourceUrl;
  if (occurredAt !== undefined) result.source.occurred_at = occurredAt;

  return result;
}

function parseRooms(value: unknown): HousePublicRoomV1[] {
  if (!Array.isArray(value) || value.length > LIMITS.rooms) {
    throw new HousePublicValidationError("rooms is invalid");
  }

  const slugs = new Set<string>();
  return value.map((item, index) => {
    const room = record(item, `rooms[${index}]`);
    const slug = textValue(room.slug, `rooms[${index}].slug`, 64);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slugs.has(slug)) {
      throw new HousePublicValidationError(`rooms[${index}].slug is invalid`);
    }
    slugs.add(slug);
    return {
      slug,
      name: textValue(room.name, `rooms[${index}].name`, LIMITS.short),
      summary: textValue(room.summary, `rooms[${index}].summary`),
      visibility: literal(
        room.visibility,
        "public",
        `rooms[${index}].visibility`
      )
    };
  });
}

/**
 * Validates and rebuilds the DTO field by field. Unknown upstream keys are
 * deliberately discarded so private backend fields can never pass through.
 */
export function parseHousePublicV1(value: unknown): HousePublicV1 {
  const source = record(value, "response");
  const house = record(source.house, "house");
  const presence = record(source.presence, "presence");
  const capabilities = record(source.capabilities, "capabilities");

  if (!Number.isSafeInteger(source.revision) || Number(source.revision) < 0) {
    throw new HousePublicValidationError("revision is invalid");
  }
  if (!Array.isArray(source.changes) || source.changes.length !== 0) {
    throw new HousePublicValidationError("changes is invalid");
  }
  if (
    capabilities.ask !== false ||
    capabilities.find !== false ||
    capabilities.participate !== "unavailable"
  ) {
    throw new HousePublicValidationError("capabilities are invalid");
  }

  return {
    schema_version: literal(
      source.schema_version,
      HOUSE_PUBLIC_SCHEMA_VERSION,
      "schema_version"
    ),
    slug: literal(source.slug, "lucia", "slug"),
    revision: Number(source.revision),
    projection_hash: textValue(
      source.projection_hash,
      "projection_hash",
      LIMITS.hash
    ),
    house: {
      name: textValue(house.name, "house.name", LIMITS.short),
      locale: textValue(house.locale, "house.locale", 32),
      charter: parseCharter(house.charter)
    },
    presence: {
      state: oneOf(
        presence.state,
        ["watching", "working", "waiting", "sleeping"] as const,
        "presence.state"
      ),
      updated_at: isoDate(presence.updated_at, "presence.updated_at")
    },
    now: parseNow(source.now),
    rooms: parseRooms(source.rooms),
    changes: [],
    capabilities: {
      ask: false,
      find: false,
      participate: "unavailable"
    },
    generated_at: isoDate(source.generated_at, "generated_at")
  };
}
