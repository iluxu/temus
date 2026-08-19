import { parseMomentDoV0 } from "../../../../../../app/lucia/moment-public";
import { assertExactKeys, jsonResponse, LuciaPagesEnv, LuciaRequestError, readPublicJsonRequest } from "../../public/_shared";
import { fetchLuciaOperatorProjection, operatorContext, operatorErrorResponse } from "../_shared";

interface PagesContext { request: Request; env: LuciaPagesEnv }
export async function onRequest({ request, env }: PagesContext): Promise<Response> {
  if (request.method !== "POST") return jsonResponse({ error: { code: "method_not_allowed" } }, 405, { Allow: "POST" });
  try {
    const identity = await operatorContext(request, env);
    const body = await readPublicJsonRequest(request);
    assertExactKeys(body, ["moment_id", "command", "message_id"]);
    if (typeof body.moment_id !== "string" || !body.moment_id.trim() || body.moment_id.length > 128 || typeof body.command !== "string" || !body.command.trim() || body.command.length > 600 || typeof body.message_id !== "string" || !body.message_id.trim() || body.message_id.length > 256) throw new LuciaRequestError("invalid_request", "Moment Do request is invalid");
    const projection = await fetchLuciaOperatorProjection({
      env,
      method: "mcp.world.moment.do",
      params: {
        house_slug: "lucia", surface: identity.surface, external_subject: identity.externalSubject,
        moment_id: body.moment_id, command: body.command,
        source: { message_id: body.message_id, observed_at: new Date().toISOString() }
      },
      parse: parseMomentDoV0
    });
    if (projection.moment_id !== body.moment_id) throw new Error("wrong action binding");
    return jsonResponse(projection);
  } catch (error) { return operatorErrorResponse(error); }
}
