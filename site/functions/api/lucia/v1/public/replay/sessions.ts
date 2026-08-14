import { parseHouseExperiencePublicV1 } from "../../../../../../app/lucia/experience-public";
import {
  assertExactKeys,
  assertLuciaExperienceBinding,
  fetchLuciaProjection,
  jsonResponse,
  luciaErrorResponse,
  LuciaPagesEnv,
  LuciaRequestError,
  readPublicJsonRequest
} from "../_shared";

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
    assertExactKeys(body, ["story_slug"]);
    const storySlug = body.story_slug ?? "a-day-with-lucia";
    if (storySlug !== "a-day-with-lucia") {
      throw new LuciaRequestError("invalid_request", "Replay story is invalid");
    }
    const publicBody = { story_slug: storySlug };
    const experience = assertLuciaExperienceBinding(
      await fetchLuciaProjection({
        env,
        method: "mcp.world.replay.session.create",
        params: { house_slug: "lucia", ...publicBody },
        publicPath: "/v1/public/houses/lucia/replay/sessions",
        publicHttpMethod: "POST",
        publicBody,
        parse: parseHouseExperiencePublicV1
      }),
      { mode: "replay", answer: "forbidden" }
    );
    return jsonResponse(experience, 201, {
      "X-Lucia-Mode": "replay",
      "X-Lucia-As-Of": experience.as_of
    });
  } catch (error) {
    return luciaErrorResponse(error);
  }
}
