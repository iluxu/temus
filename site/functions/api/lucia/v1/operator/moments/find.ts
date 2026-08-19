import { parseMomentFindV0 } from "../../../../../../app/lucia/moment-public";
import { assertExactKeys, jsonResponse, LuciaPagesEnv, LuciaRequestError, readPublicJsonRequest } from "../../public/_shared";
import { fetchLuciaOperatorProjection, operatorContext, operatorErrorResponse } from "../_shared";

interface PagesContext { request: Request; env: LuciaPagesEnv }
export async function onRequest({ request, env }: PagesContext): Promise<Response> {
  if (request.method !== "POST") return jsonResponse({ error: { code: "method_not_allowed" } }, 405, { Allow: "POST" });
  try {
    const identity = await operatorContext(request, env);
    const body = await readPublicJsonRequest(request);
    assertExactKeys(body, ["query"]);
    if (typeof body.query !== "string" || !body.query.trim() || body.query.length > 600) throw new LuciaRequestError("invalid_request", "Query is invalid");
    const projection = await fetchLuciaOperatorProjection({
      env,
      method: "mcp.world.moment.operator.find",
      params: { house_slug: "lucia", surface: identity.surface, external_subject: identity.externalSubject, query: body.query, limit: 12 },
      parse: (value) => parseMomentFindV0(value, "operator")
    });
    if (projection.query !== body.query) throw new Error("wrong query binding");
    return jsonResponse(projection);
  } catch (error) { return operatorErrorResponse(error); }
}
