import {
  LUCIA_REPLAY_SESSION_ID_RE,
  parseHouseExperiencePublicV1
} from "../../../../../app/lucia/experience-public";
import {
  assertExactKeys,
  assertLuciaExperienceBinding,
  fetchLuciaProjection,
  jsonResponse,
  luciaErrorResponse,
  LuciaPagesEnv,
  LuciaRequestError,
  readPublicJsonRequest
} from "./_shared";

interface PagesContext {
  request: Request;
  env: LuciaPagesEnv;
}

export async function onRequest({ request, env }: PagesContext): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse(
      { error: { code: "method_not_allowed", message: "Method not allowed" } },
      405,
      { Allow: "POST" }
    );
  }
  try {
    const body = await readPublicJsonRequest(request);
    assertExactKeys(body, ["question", "replay_session_id"]);
    if (
      typeof body.question !== "string" ||
      body.question.trim().length === 0 ||
      body.question.length > 500
    ) {
      throw new LuciaRequestError("invalid_request", "Question is invalid");
    }
    if (
      body.replay_session_id !== undefined &&
      (typeof body.replay_session_id !== "string" ||
        !LUCIA_REPLAY_SESSION_ID_RE.test(body.replay_session_id))
    ) {
      throw new LuciaRequestError("invalid_request", "Replay session is invalid");
    }
    const publicBody = {
      question: body.question,
      ...(typeof body.replay_session_id === "string"
        ? { replay_session_id: body.replay_session_id }
        : {})
    };
    const replaySessionId =
      typeof body.replay_session_id === "string"
        ? body.replay_session_id
        : undefined;
    const experience = assertLuciaExperienceBinding(
      await fetchLuciaProjection({
        env,
        method: "mcp.world.audience.ask",
        params: { house_slug: "lucia", ...publicBody },
        publicPath: "/v1/public/houses/lucia/ask",
        publicHttpMethod: "POST",
        publicBody,
        parse: parseHouseExperiencePublicV1
      }),
      replaySessionId
        ? {
            mode: "replay",
            replaySessionId,
            answer: "required"
          }
        : { mode: "live", answer: "required" }
    );
    return jsonResponse(experience, 200, {
      "X-Lucia-Mode": experience.mode,
      "X-Lucia-As-Of": experience.as_of
    });
  } catch (error) {
    return luciaErrorResponse(error);
  }
}
