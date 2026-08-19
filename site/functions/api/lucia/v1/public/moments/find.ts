import { parseMomentFindV0 } from "../../../../../../app/lucia/moment-public";
import {
  assertExactKeys,
  fetchLuciaProjection,
  jsonResponse,
  luciaErrorResponse,
  LuciaPagesEnv,
  LuciaRequestError,
  readPublicJsonRequest
} from "../_shared";

interface PagesContext { request: Request; env: LuciaPagesEnv }

export async function onRequest({ request, env }: PagesContext): Promise<Response> {
  if (request.method !== "POST") return jsonResponse({ error: { code: "method_not_allowed" } }, 405, { Allow: "POST" });
  try {
    const body = await readPublicJsonRequest(request);
    assertExactKeys(body, ["query", "limit"]);
    if (typeof body.query !== "string" || !body.query.trim() || body.query.length > 600) {
      throw new LuciaRequestError("invalid_request", "Query is invalid");
    }
    const limit = body.limit ?? 12;
    if (!Number.isInteger(limit) || Number(limit) < 1 || Number(limit) > 25) {
      throw new LuciaRequestError("invalid_request", "Limit is invalid");
    }
    const publicBody = { query: body.query, limit };
    const projection = await fetchLuciaProjection({
      env,
      method: "mcp.world.moment.find",
      params: { house_slug: "lucia", ...publicBody },
      publicPath: "/v1/public/houses/lucia/moments/find",
      publicHttpMethod: "POST",
      publicBody,
      parse: (value) => parseMomentFindV0(value, "public")
    });
    return jsonResponse(projection);
  } catch (error) {
    return luciaErrorResponse(error);
  }
}
