import {
  fetchLuciaExperience,
  jsonResponse,
  luciaErrorResponse,
  LuciaPagesEnv
} from "./_shared";

interface PagesContext {
  request: Request;
  env: LuciaPagesEnv;
}

export async function onRequest({ request, env }: PagesContext): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return jsonResponse(
      { error: { code: "method_not_allowed", message: "Method not allowed" } },
      405,
      { Allow: "GET, HEAD" }
    );
  }
  try {
    const experience = await fetchLuciaExperience(env);
    const response = jsonResponse(experience, 200, {
      "X-Lucia-Mode": experience.mode,
      "X-Lucia-As-Of": experience.as_of
    });
    return request.method === "HEAD"
      ? new Response(null, { status: response.status, headers: response.headers })
      : response;
  } catch (error) {
    return luciaErrorResponse(error);
  }
}
