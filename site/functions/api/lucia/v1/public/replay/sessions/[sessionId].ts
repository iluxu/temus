import {
  LUCIA_REPLAY_SESSION_ID_RE,
  parseHouseExperiencePublicV1
} from "../../../../../../../app/lucia/experience-public";
import {
  assertLuciaExperienceBinding,
  fetchLuciaProjection,
  jsonResponse,
  luciaErrorResponse,
  LuciaPagesEnv,
  LuciaRequestError
} from "../../_shared";

interface PagesContext {
  request: Request;
  env: LuciaPagesEnv;
  params: { sessionId?: string };
}

export async function onRequest({
  request,
  env,
  params
}: PagesContext): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return jsonResponse(
      { error: { code: "method_not_allowed", message: "Method not allowed" } },
      405,
      { Allow: "GET, HEAD" }
    );
  }
  try {
    const sessionId = params.sessionId;
    if (
      typeof sessionId !== "string" ||
      !LUCIA_REPLAY_SESSION_ID_RE.test(sessionId)
    ) {
      throw new LuciaRequestError("invalid_request", "Replay session is invalid");
    }
    const experience = assertLuciaExperienceBinding(
      await fetchLuciaProjection({
        env,
        method: "mcp.world.replay.session.get",
        params: { house_slug: "lucia", session_id: sessionId },
        publicPath: `/v1/public/houses/lucia/replay/sessions/${sessionId}`,
        publicHttpMethod: "GET",
        parse: parseHouseExperiencePublicV1
      }),
      {
        mode: "replay",
        replaySessionId: sessionId,
        answer: "forbidden"
      }
    );
    const response = jsonResponse(experience, 200, {
      "X-Lucia-Mode": "replay",
      "X-Lucia-As-Of": experience.as_of
    });
    return request.method === "HEAD"
      ? new Response(null, { status: response.status, headers: response.headers })
      : response;
  } catch (error) {
    return luciaErrorResponse(error);
  }
}
