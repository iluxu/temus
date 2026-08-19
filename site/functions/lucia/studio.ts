import { LuciaPagesEnv } from "../api/lucia/v1/public/_shared";

interface PagesContext {
  request: Request;
  env: LuciaPagesEnv;
  next: () => Promise<Response>;
}

export async function onRequest({ request, next }: PagesContext): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, {
      status: 405,
      headers: { Allow: "GET, HEAD" }
    });
  }
  // The static Studio shell contains only the audience-safe Twitch catalogue.
  // Every privileged Do endpoint remains independently protected by Access.
  return await next();
}
