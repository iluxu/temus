import { parseClipAnswerPublicV0 } from "../../../../../../app/lucia/clip-public";
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
  if (request.method !== "POST") {
    return jsonResponse({ error: { code: "method_not_allowed" } }, 405, { Allow: "POST" });
  }
  try {
    const body = await readPublicJsonRequest(request);
    assertExactKeys(body, ["clip_id", "question", "context_query"]);
    const contextQuery = body.context_query ?? null;
    if (
      typeof body.clip_id !== "string" || !/^[A-Za-z0-9_-]{3,180}$/.test(body.clip_id) ||
      typeof body.question !== "string" || !body.question.trim() || body.question.length > 600 ||
      (contextQuery !== null && (typeof contextQuery !== "string" || !contextQuery.trim() || contextQuery.length > 600))
    ) {
      throw new LuciaRequestError("invalid_request", "Clip Ask request is invalid");
    }
    const publicBody = {
      clip_id: body.clip_id,
      question: body.question.trim(),
      context_query: typeof contextQuery === "string" ? contextQuery.trim() : null
    };
    const projection = await fetchLuciaProjection({
      env,
      method: "mcp.creator.clips.public.ask",
      params: publicBody,
      publicPath: "/v1/public/houses/lucia/clips/ask",
      publicHttpMethod: "POST",
      publicBody,
      parse: parseClipAnswerPublicV0
    });
    if (
      projection.clip_id !== body.clip_id ||
      projection.question !== body.question.trim() ||
      projection.context_query !== publicBody.context_query
    ) {
      throw new LuciaRequestError("invalid_request", "Clip Ask response binding failed");
    }
    return jsonResponse(projection);
  } catch (error) {
    return luciaErrorResponse(error);
  }
}
