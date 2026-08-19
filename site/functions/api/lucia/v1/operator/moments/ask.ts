import { parseMomentAnswerV0 } from "../../../../../../app/lucia/moment-public";
import { assertExactKeys, jsonResponse, LuciaPagesEnv, LuciaRequestError, readPublicJsonRequest } from "../../public/_shared";
import { fetchLuciaOperatorProjection, operatorContext, operatorErrorResponse } from "../_shared";

interface PagesContext { request: Request; env: LuciaPagesEnv }
export async function onRequest({ request, env }: PagesContext): Promise<Response> {
  if (request.method !== "POST") return jsonResponse({ error: { code: "method_not_allowed" } }, 405, { Allow: "POST" });
  try {
    const identity = await operatorContext(request, env);
    const body = await readPublicJsonRequest(request);
    assertExactKeys(body, ["moment_id", "question"]);
    if (typeof body.moment_id !== "string" || !body.moment_id.trim() || body.moment_id.length > 128 || typeof body.question !== "string" || !body.question.trim() || body.question.length > 600) throw new LuciaRequestError("invalid_request", "Moment Ask request is invalid");
    const projection = await fetchLuciaOperatorProjection({
      env,
      method: "mcp.world.moment.operator.ask",
      params: { house_slug: "lucia", surface: identity.surface, external_subject: identity.externalSubject, moment_id: body.moment_id, question: body.question },
      parse: parseMomentAnswerV0
    });
    if (projection.moment_id !== body.moment_id || projection.question !== body.question) throw new Error("wrong answer binding");
    return jsonResponse(projection);
  } catch (error) { return operatorErrorResponse(error); }
}
