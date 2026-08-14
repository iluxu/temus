import {
  HousePublicValidationError,
  HousePublicV1,
  parseHousePublicV1
} from "../../../../../app/lucia/house-public";
import {
  HouseExperiencePublicV1,
  HouseExperienceValidationError,
  parseHouseExperiencePublicV1
} from "../../../../../app/lucia/experience-public";

export interface LuciaPagesEnv {
  LLMBASEDOS_API_ORIGIN?: string;
  LLMBASEDOS_PUBLIC_API_KEY?: string;
  LLMBASEDOS_LUCIA_HOUSE_PATH?: string;
}

const MAX_UPSTREAM_BYTES = 128 * 1024;
const MAX_REQUEST_BYTES = 8 * 1024;
const UPSTREAM_TIMEOUT_MS = 5_000;
const PUBLIC_API_ORIGIN = "https://api.adoptan.ai";

export const PUBLIC_SECURITY_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Security-Policy":
    "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  "Content-Type": "application/json; charset=utf-8",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex"
} as const;

export class LuciaUpstreamError extends Error {
  readonly code: "configuration" | "unavailable" | "invalid_projection";

  constructor(
    code: "configuration" | "unavailable" | "invalid_projection",
    message: string
  ) {
    super(message);
    this.name = "LuciaUpstreamError";
    this.code = code;
  }
}

export class LuciaRequestError extends Error {
  readonly code: "invalid_request" | "origin_forbidden";

  constructor(code: "invalid_request" | "origin_forbidden", message: string) {
    super(message);
    this.name = "LuciaRequestError";
    this.code = code;
  }
}

type ProjectionParser<T> = (value: unknown) => T;
type PublicHttpMethod = "GET" | "POST";

interface ProjectionRequest<T> {
  env: LuciaPagesEnv;
  method: string;
  params: Record<string, unknown>;
  publicPath: string;
  publicHttpMethod: PublicHttpMethod;
  publicBody?: Record<string, unknown>;
  parse: ProjectionParser<T>;
  fetchImpl?: typeof fetch;
}

function configuredUpstream(
  env: LuciaPagesEnv,
  publicPath: string
): {
  url: URL;
  apiKey?: string;
  responseShape: "json_rpc" | "direct";
} {
  if (
    !publicPath.startsWith("/v1/public/houses/lucia") ||
    publicPath.includes("?") ||
    publicPath.includes("#") ||
    publicPath.includes("\\")
  ) {
    throw new LuciaUpstreamError(
      "configuration",
      "Lucia public path is invalid"
    );
  }

  const rawOrigin = env.LLMBASEDOS_API_ORIGIN?.trim();
  const apiKey = env.LLMBASEDOS_PUBLIC_API_KEY?.trim();
  const rpcPath =
    env.LLMBASEDOS_LUCIA_HOUSE_PATH?.trim() || "/v1/mcp/call";

  if (!rawOrigin && !apiKey) {
    return {
      url: new URL(publicPath, PUBLIC_API_ORIGIN),
      responseShape: "direct"
    };
  }
  if (!rawOrigin || !apiKey) {
    throw new LuciaUpstreamError(
      "configuration",
      "Lucia authenticated upstream is only partially configured"
    );
  }
  if (
    !rpcPath.startsWith("/") ||
    rpcPath.startsWith("//") ||
    rpcPath.includes("?") ||
    rpcPath.includes("#") ||
    rpcPath.includes("\\")
  ) {
    throw new LuciaUpstreamError(
      "configuration",
      "Lucia authenticated upstream path is invalid"
    );
  }

  let origin: URL;
  try {
    origin = new URL(rawOrigin);
  } catch {
    throw new LuciaUpstreamError(
      "configuration",
      "Lucia authenticated upstream origin is invalid"
    );
  }
  const localDevelopment =
    origin.protocol === "http:" &&
    (origin.hostname === "localhost" || origin.hostname === "127.0.0.1");
  if (origin.protocol !== "https:" && !localDevelopment) {
    throw new LuciaUpstreamError(
      "configuration",
      "Lucia authenticated upstream must use HTTPS"
    );
  }
  if (
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash ||
    (origin.pathname !== "/" && origin.pathname !== "")
  ) {
    throw new LuciaUpstreamError(
      "configuration",
      "Lucia authenticated upstream origin must be an origin"
    );
  }

  return {
    url: new URL(rpcPath, origin),
    apiKey,
    responseShape: "json_rpc"
  };
}

export function jsonResponse(
  payload: unknown,
  status = 200,
  extraHeaders?: Record<string, string>
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...PUBLIC_SECURITY_HEADERS,
      ...extraHeaders
    }
  });
}

export function luciaErrorResponse(error: unknown): Response {
  if (error instanceof LuciaRequestError) {
    const forbidden = error.code === "origin_forbidden";
    return jsonResponse(
      {
        error: {
          code: forbidden ? "origin_forbidden" : "invalid_request",
          message: forbidden ? "Origin forbidden" : "Invalid request"
        }
      },
      forbidden ? 403 : 400
    );
  }
  const configurationError =
    error instanceof LuciaUpstreamError && error.code === "configuration";
  return jsonResponse(
    {
      error: {
        code: configurationError
          ? "service_not_configured"
          : "projection_unavailable",
        message: "Maison Lucia is temporarily unavailable"
      }
    },
    503,
    { "Retry-After": configurationError ? "300" : "15" }
  );
}

export async function readPublicJsonRequest(
  request: Request
): Promise<Record<string, unknown>> {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    throw new LuciaRequestError(
      "origin_forbidden",
      "Cross-origin Lucia requests are forbidden"
    );
  }
  const contentType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    throw new LuciaRequestError(
      "invalid_request",
      "Lucia request must be JSON"
    );
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_REQUEST_BYTES
  ) {
    throw new LuciaRequestError(
      "invalid_request",
      "Lucia request is too large"
    );
  }
  const raw = await readLimitedText(request, MAX_REQUEST_BYTES, "invalid_request");
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new LuciaRequestError(
      "invalid_request",
      "Lucia request JSON is invalid"
    );
  }
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new LuciaRequestError(
      "invalid_request",
      "Lucia request body is invalid"
    );
  }
  return payload as Record<string, unknown>;
}

export function assertExactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[]
) {
  if (Object.keys(value).some((key) => !allowed.includes(key))) {
    throw new LuciaRequestError(
      "invalid_request",
      "Lucia request contains unknown fields"
    );
  }
}

export function assertLuciaExperienceBinding(
  experience: HouseExperiencePublicV1,
  expected: {
    mode: "live" | "replay";
    replaySessionId?: string;
    answer: "required" | "forbidden";
  }
): HouseExperiencePublicV1 {
  const correctMode = experience.mode === expected.mode;
  const correctSession =
    expected.mode === "live"
      ? experience.session === null && expected.replaySessionId === undefined
      : experience.session !== null &&
        (expected.replaySessionId === undefined ||
          experience.session.id === expected.replaySessionId);
  const correctAnswer =
    expected.answer === "required"
      ? experience.answer !== null
      : experience.answer === null;

  if (!correctMode || !correctSession || !correctAnswer) {
    throw new LuciaUpstreamError(
      "invalid_projection",
      "Lucia public projection does not match the requested operation"
    );
  }
  return experience;
}

export async function fetchLuciaProjection<T>({
  env,
  method,
  params,
  publicPath,
  publicHttpMethod,
  publicBody,
  parse,
  fetchImpl = fetch
}: ProjectionRequest<T>): Promise<T> {
  const upstream = configuredUpstream(env, publicPath);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  const requestId = `lucia-${crypto.randomUUID()}`;
  const authenticated = upstream.responseShape === "json_rpc";

  let response: Response;
  try {
    response = await fetchImpl(upstream.url.toString(), {
      method: authenticated ? "POST" : publicHttpMethod,
      headers: authenticated
        ? {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-API-Key": upstream.apiKey as string
          }
        : publicHttpMethod === "POST"
          ? { Accept: "application/json", "Content-Type": "application/json" }
          : { Accept: "application/json" },
      body: authenticated
        ? JSON.stringify({
            jsonrpc: "2.0",
            id: requestId,
            method,
            params: [params]
          })
        : publicHttpMethod === "POST"
          ? JSON.stringify(publicBody ?? {})
          : undefined,
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal
    });
  } catch {
    clearTimeout(timeout);
    throw new LuciaUpstreamError("unavailable", "Lucia public upstream failed");
  }

  let body: string;
  try {
    if (!response.ok || response.type === "opaqueredirect") {
      throw new LuciaUpstreamError(
        "unavailable",
        "Lucia public upstream returned an error"
      );
    }
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("application/json")) {
      throw new LuciaUpstreamError(
        "invalid_projection",
        "Lucia public upstream returned a non-JSON response"
      );
    }
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_UPSTREAM_BYTES) {
      throw new LuciaUpstreamError(
        "invalid_projection",
        "Lucia public projection is too large"
      );
    }
    body = await readLimitedText(
      response,
      MAX_UPSTREAM_BYTES,
      "invalid_projection"
    );
  } finally {
    clearTimeout(timeout);
  }

  try {
    const payload = JSON.parse(body) as unknown;
    if (!authenticated) return parse(payload);
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
      throw new HouseExperienceValidationError("JSON-RPC response is invalid");
    }
    const rpc = payload as Record<string, unknown>;
    if (
      rpc.jsonrpc !== "2.0" ||
      rpc.id !== requestId ||
      "error" in rpc ||
      !("result" in rpc)
    ) {
      throw new HouseExperienceValidationError("JSON-RPC response is invalid");
    }
    return parse(rpc.result);
  } catch (error) {
    if (
      error instanceof HousePublicValidationError ||
      error instanceof HouseExperienceValidationError ||
      error instanceof SyntaxError
    ) {
      throw new LuciaUpstreamError(
        "invalid_projection",
        "Lucia public projection is invalid"
      );
    }
    throw error;
  }
}

export function fetchLuciaHouseProjection(
  env: LuciaPagesEnv,
  fetchImpl: typeof fetch = fetch
): Promise<HousePublicV1> {
  return fetchLuciaProjection({
    env,
    method: "mcp.world.audience.snapshot",
    params: { house_slug: "lucia" },
    publicPath: "/v1/public/houses/lucia",
    publicHttpMethod: "GET",
    parse: parseHousePublicV1,
    fetchImpl
  });
}

export async function fetchLuciaExperience(
  env: LuciaPagesEnv,
  fetchImpl: typeof fetch = fetch
): Promise<HouseExperiencePublicV1> {
  const experience = await fetchLuciaProjection({
    env,
    method: "mcp.world.audience.experience",
    params: { house_slug: "lucia" },
    publicPath: "/v1/public/houses/lucia/experience",
    publicHttpMethod: "GET",
    parse: parseHouseExperiencePublicV1,
    fetchImpl
  });
  return assertLuciaExperienceBinding(experience, {
    mode: "live",
    answer: "forbidden"
  });
}

async function readLimitedText(
  source: Request | Response,
  maximum: number,
  failureCode: "invalid_request" | "invalid_projection"
): Promise<string> {
  if (!source.body) return "";
  const reader = source.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let body = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maximum) {
        await reader.cancel();
        if (failureCode === "invalid_request") {
          throw new LuciaRequestError("invalid_request", "Lucia request is too large");
        }
        throw new LuciaUpstreamError(
          "invalid_projection",
          "Lucia public projection is too large"
        );
      }
      body += decoder.decode(value, { stream: true });
    }
    return body + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}
