import {
  LUCIA_REPLAY_SESSION_ID_RE,
  parseHouseExperiencePublicV1
} from "../../../../../../../../app/lucia/experience-public";
import {
  assertExactKeys,
  assertLuciaExperienceBinding,
  fetchLuciaProjection,
  jsonResponse,
  luciaErrorResponse,
  LuciaPagesEnv,
  LuciaRequestError,
  readPublicJsonRequest
} from "../../../_shared";

interface PagesContext {
  request: Request;
  env: LuciaPagesEnv;
  params: { sessionId?: string };
}

const ACTIONS = ["play", "pause", "next", "seek", "restart"] as const;

export async function onRequest({
  request,
  env,
  params
}: PagesContext): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse(
      { error: { code: "method_not_allowed", message: "Method not allowed" } },
      405,
      { Allow: "POST" }
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
    const body = await readPublicJsonRequest(request);
    assertExactKeys(body, ["action", "virtual_time"]);
    if (typeof body.action !== "string" || !ACTIONS.includes(body.action as never)) {
      throw new LuciaRequestError("invalid_request", "Replay action is invalid");
    }
    if (body.action === "seek") {
      if (
        typeof body.virtual_time !== "string" ||
        !Number.isFinite(Date.parse(body.virtual_time))
      ) {
        throw new LuciaRequestError("invalid_request", "Replay time is invalid");
      }
    } else if (body.virtual_time !== undefined) {
      throw new LuciaRequestError(
        "invalid_request",
        "Replay time is allowed only for seek"
      );
    }
    const publicBody = {
      action: body.action,
      ...(body.action === "seek" ? { virtual_time: body.virtual_time } : {})
    };
    const experience = assertLuciaExperienceBinding(
      await fetchLuciaProjection({
        env,
        method: "mcp.world.replay.session.control",
        params: {
          house_slug: "lucia",
          session_id: sessionId,
          ...publicBody
        },
        publicPath: `/v1/public/houses/lucia/replay/sessions/${sessionId}/control`,
        publicHttpMethod: "POST",
        publicBody,
        parse: parseHouseExperiencePublicV1
      }),
      {
        mode: "replay",
        replaySessionId: sessionId,
        answer: "forbidden"
      }
    );
    return jsonResponse(experience, 200, {
      "X-Lucia-Mode": "replay",
      "X-Lucia-As-Of": experience.as_of
    });
  } catch (error) {
    return luciaErrorResponse(error);
  }
}
