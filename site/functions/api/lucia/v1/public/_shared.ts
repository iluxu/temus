import {
  HousePublicValidationError,
  parseHousePublicV1
} from "../../../../../app/lucia/house-public";

export interface LuciaPagesEnv {
  LLMBASEDOS_API_ORIGIN?: string;
  LLMBASEDOS_PUBLIC_API_KEY?: string;
  LLMBASEDOS_LUCIA_HOUSE_PATH?: string;
}

const MAX_UPSTREAM_BYTES = 128 * 1024;
const UPSTREAM_TIMEOUT_MS = 5_000;

export const PUBLIC_SECURITY_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff"
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

function configuredUpstream(env: LuciaPagesEnv): {
  url: URL;
  apiKey: string;
} {
  const rawOrigin = env.LLMBASEDOS_API_ORIGIN?.trim();
  const apiKey = env.LLMBASEDOS_PUBLIC_API_KEY?.trim();
  const path =
    env.LLMBASEDOS_LUCIA_HOUSE_PATH?.trim() || "/v1/mcp/call";

  if (!rawOrigin || !apiKey) {
    throw new LuciaUpstreamError(
      "configuration",
      "Lucia public upstream is not configured"
    );
  }
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("?") ||
    path.includes("#") ||
    path.includes("\\")
  ) {
    throw new LuciaUpstreamError(
      "configuration",
      "Lucia public upstream path is invalid"
    );
  }

  let origin: URL;
  try {
    origin = new URL(rawOrigin);
  } catch {
    throw new LuciaUpstreamError(
      "configuration",
      "Lucia public upstream origin is invalid"
    );
  }

  const localDevelopment =
    origin.protocol === "http:" &&
    (origin.hostname === "localhost" || origin.hostname === "127.0.0.1");
  if (origin.protocol !== "https:" && !localDevelopment) {
    throw new LuciaUpstreamError(
      "configuration",
      "Lucia public upstream must use HTTPS"
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
      "Lucia public upstream origin must be an origin"
    );
  }

  return {
    url: new URL(path, origin),
    apiKey
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

export async function fetchLuciaHouseProjection(
  env: LuciaPagesEnv,
  fetchImpl: typeof fetch = fetch
) {
  const upstream = configuredUpstream(env);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetchImpl(upstream.url.toString(), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-API-Key": upstream.apiKey
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "lucia-house",
        method: "mcp.world.audience.snapshot",
        params: [{ house_slug: "lucia" }]
      }),
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

    body = await readLimitedText(response, MAX_UPSTREAM_BYTES);
  } finally {
    clearTimeout(timeout);
  }

  try {
    const envelope = JSON.parse(body) as unknown;
    if (typeof envelope !== "object" || envelope === null || Array.isArray(envelope)) {
      throw new HousePublicValidationError("JSON-RPC response is invalid");
    }
    const rpc = envelope as Record<string, unknown>;
    if (
      rpc.jsonrpc !== "2.0" ||
      rpc.id !== "lucia-house" ||
      "error" in rpc ||
      !("result" in rpc)
    ) {
      throw new HousePublicValidationError("JSON-RPC response is invalid");
    }
    return parseHousePublicV1(rpc.result);
  } catch (error) {
    if (error instanceof HousePublicValidationError || error instanceof SyntaxError) {
      throw new LuciaUpstreamError(
        "invalid_projection",
        "Lucia public projection is invalid"
      );
    }
    throw error;
  }
}

async function readLimitedText(response: Response, maximum: number): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
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
