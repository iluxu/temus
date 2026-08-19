import {
  fetchLuciaProjection,
  jsonResponse,
  LuciaPagesEnv,
  LuciaRequestError,
  LuciaUpstreamError
} from "../public/_shared";

type Parser<T> = (value: unknown) => T;
type AccessJsonWebKey = JsonWebKey & { kid?: string };

export class LuciaOperatorAuthError extends Error {}

function decodeSegment(segment: string): Uint8Array {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  let decoded: string;
  try {
    decoded = atob(padded);
  } catch {
    throw new LuciaOperatorAuthError("Access token is invalid");
  }
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

function exactArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function decodeJson(segment: string): Record<string, unknown> {
  try {
    const bytes = decodeSegment(segment);
    const value = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new LuciaOperatorAuthError("Access token is invalid");
  }
}

async function accessSubject(request: Request, env: LuciaPagesEnv): Promise<string> {
  const team = env.CF_ACCESS_TEAM_DOMAIN?.trim().toLowerCase();
  const expectedAudience = env.CF_ACCESS_AUD?.trim();
  const assertion = request.headers.get("Cf-Access-Jwt-Assertion")?.trim();
  if (!team || !expectedAudience) throw new LuciaUpstreamError("configuration", "Cloudflare Access is not configured");
  if (!/^[a-z0-9.-]+\.cloudflareaccess\.com$/.test(team) || !assertion) {
    throw new LuciaOperatorAuthError("Operator authentication is required");
  }
  const parts = assertion.split(".");
  if (parts.length !== 3) throw new LuciaOperatorAuthError("Access token is invalid");
  const header = decodeJson(parts[0]);
  const payload = decodeJson(parts[1]);
  if (header.alg !== "RS256" || typeof header.kid !== "string") {
    throw new LuciaOperatorAuthError("Access token algorithm is invalid");
  }
  const issuer = `https://${team}`;
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  const now = Math.floor(Date.now() / 1000);
  if (
    payload.iss !== issuer ||
    !audiences.includes(expectedAudience) ||
    typeof payload.exp !== "number" || payload.exp <= now ||
    (typeof payload.nbf === "number" && payload.nbf > now + 30) ||
    typeof payload.sub !== "string" || !payload.sub.trim() || payload.sub.length > 256
  ) {
    throw new LuciaOperatorAuthError("Access token claims are invalid");
  }
  let response: Response;
  try {
    response = await fetch(`${issuer}/cdn-cgi/access/certs`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      redirect: "error"
    });
  } catch {
    throw new LuciaOperatorAuthError("Access verification is unavailable");
  }
  if (!response.ok) throw new LuciaOperatorAuthError("Access verification is unavailable");
  const certificates = (await response.json()) as { keys?: AccessJsonWebKey[] };
  const key = certificates.keys?.find((candidate) => candidate.kid === header.kid);
  if (!key) throw new LuciaOperatorAuthError("Access signing key is unavailable");
  try {
    const cryptoKey = await crypto.subtle.importKey(
      "jwk",
      key,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      exactArrayBuffer(decodeSegment(parts[2])),
      exactArrayBuffer(new TextEncoder().encode(`${parts[0]}.${parts[1]}`))
    );
    if (!valid) throw new Error();
  } catch {
    throw new LuciaOperatorAuthError("Access token signature is invalid");
  }
  return payload.sub;
}

export async function operatorContext(request: Request, env: LuciaPagesEnv) {
  return {
    externalSubject: await accessSubject(request, env),
    surface: "browser" as const
  };
}

export function fetchLuciaOperatorProjection<T>(args: {
  env: LuciaPagesEnv;
  method: string;
  params: Record<string, unknown>;
  parse: Parser<T>;
}): Promise<T> {
  const apiKey = args.env.LLMBASEDOS_MOMENT_STUDIO_API_KEY?.trim();
  if (!apiKey) throw new LuciaUpstreamError("configuration", "Moment Studio upstream is not configured");
  return fetchLuciaProjection({
    env: {
      LLMBASEDOS_API_ORIGIN: args.env.LLMBASEDOS_API_ORIGIN,
      LLMBASEDOS_PUBLIC_API_KEY: apiKey,
      LLMBASEDOS_LUCIA_HOUSE_PATH: args.env.LLMBASEDOS_LUCIA_HOUSE_PATH
    },
    method: args.method,
    params: args.params,
    publicPath: "/v1/public/houses/lucia/moments",
    publicHttpMethod: "GET",
    parse: args.parse
  });
}

export function operatorErrorResponse(error: unknown): Response {
  if (error instanceof LuciaOperatorAuthError) {
    return jsonResponse({ error: { code: "operator_auth_required", message: "Operator authentication required" } }, 401);
  }
  if (error instanceof LuciaRequestError) {
    return jsonResponse({ error: { code: "invalid_request", message: "Invalid request" } }, 400);
  }
  const configuration = error instanceof LuciaUpstreamError && error.code === "configuration";
  return jsonResponse(
    { error: { code: configuration ? "operator_not_configured" : "projection_unavailable", message: "Moment Studio is temporarily unavailable" } },
    503,
    { "Retry-After": configuration ? "300" : "15" }
  );
}
