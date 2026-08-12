import {
  fetchLuciaHouseProjection,
  jsonResponse,
  LuciaPagesEnv,
  LuciaUpstreamError
} from "./_shared";

interface PagesContext {
  request: Request;
  env: LuciaPagesEnv;
}

export async function onRequest({ request, env }: PagesContext): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return jsonResponse(
      { error: { code: "method_not_allowed", message: "Method not allowed" } },
      405,
      { Allow: "GET, HEAD" }
    );
  }

  try {
    const projection = await fetchLuciaHouseProjection(env);
    const response = jsonResponse(projection, 200, {
      "X-Lucia-Projection-Revision": String(projection.revision)
    });
    if (request.method === "HEAD") {
      return new Response(null, {
        status: response.status,
        headers: response.headers
      });
    }
    return response;
  } catch (error) {
    const configurationError =
      error instanceof LuciaUpstreamError && error.code === "configuration";
    return jsonResponse(
      {
        error: {
          code: configurationError ? "service_not_configured" : "projection_unavailable",
          message: "Maison Lucia is temporarily unavailable"
        }
      },
      503,
      { "Retry-After": configurationError ? "300" : "15" }
    );
  }
}
