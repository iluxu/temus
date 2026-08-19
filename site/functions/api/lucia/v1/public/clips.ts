import { parseClipCollectionPublicV0 } from "../../../../../app/lucia/clip-public";
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
      method: "mcp.creator.clips.public.collection",
      params: { category: "all", status: "all", offset: 0, limit: 24 },
      publicPath: "/v1/public/houses/lucia/clips",
      publicHttpMethod: "GET",
      parse: parseClipCollectionPublicV0
    });
    const response = jsonResponse(projection);
    return request.method === "HEAD"
      ? new Response(null, { status: response.status, headers: response.headers })
      : response;
  } catch (error) {
    return luciaErrorResponse(error);
  }
}
