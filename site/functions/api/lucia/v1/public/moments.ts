import { parseMomentCollectionV0 } from "../../../../../app/lucia/moment-public";
import {
  fetchLuciaProjection,
  jsonResponse,
  luciaErrorResponse,
  LuciaPagesEnv
} from "./_shared";

interface PagesContext { request: Request; env: LuciaPagesEnv }

export async function onRequest({ request, env }: PagesContext): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return jsonResponse({ error: { code: "method_not_allowed" } }, 405, { Allow: "GET, HEAD" });
  }
  try {
    const projection = await fetchLuciaProjection({
      env,
      method: "mcp.world.moment.collection",
      params: { house_slug: "lucia", limit: 60 },
      publicPath: "/v1/public/houses/lucia/moments",
      publicHttpMethod: "GET",
      parse: parseMomentCollectionV0
    });
    const response = jsonResponse(projection);
    return request.method === "HEAD"
      ? new Response(null, { status: response.status, headers: response.headers })
      : response;
  } catch (error) {
    return luciaErrorResponse(error);
  }
}
