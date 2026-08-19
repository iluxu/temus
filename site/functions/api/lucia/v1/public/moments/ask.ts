import { parseMomentAnswerV0 } from "../../../../../../app/lucia/moment-public";
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
    assertExactKeys(body, ["moment_id", "question"]);
    if (typeof body.moment_id !== "string" || !body.moment_id.trim() || body.moment_id.length > 128 ||
        typeof body.question !== "string" || !body.question.trim() || body.question.length > 600) {
      throw new LuciaRequestError("invalid_request", "Moment Ask request is invalid");
    }
    const publicBody = { moment_id: body.moment_id, question: body.question };
    const projection = await fetchLuciaProjection({
      env,
      method: "mcp.world.moment.ask",
      params: { house_slug: "lucia", ...publicBody },
      publicPath: "/v1/public/houses/lucia/moments/ask",
      publicHttpMethod: "POST",
      publicBody,
      parse: parseMomentAnswerV0
    });
    if (projection.moment_id !== body.moment_id || projection.question !== body.question) {
      throw new LuciaRequestError("invalid_request", "Moment Ask response binding failed");
    }
    return jsonResponse(projection);
  } catch (error) {
    return luciaErrorResponse(error);
  }
}
