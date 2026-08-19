import { parseMomentCollectionV0 } from "../../../../../app/lucia/moment-public";
import { jsonResponse, LuciaPagesEnv } from "../public/_shared";
import { fetchLuciaOperatorProjection, operatorContext, operatorErrorResponse } from "./_shared";

interface PagesContext { request: Request; env: LuciaPagesEnv }
export async function onRequest({ request, env }: PagesContext): Promise<Response> {
  if (request.method !== "GET") return jsonResponse({ error: { code: "method_not_allowed" } }, 405, { Allow: "GET" });
  try {
    const identity = await operatorContext(request, env);
    const projection = await fetchLuciaOperatorProjection({
      env,
      method: "mcp.world.moment.operator.collection",
      params: { house_slug: "lucia", surface: identity.surface, external_subject: identity.externalSubject, limit: 60 },
      parse: parseMomentCollectionV0
    });
    if (projection.mode !== "operator") throw new Error("wrong projection mode");
    return jsonResponse(projection);
  } catch (error) { return operatorErrorResponse(error); }
}
