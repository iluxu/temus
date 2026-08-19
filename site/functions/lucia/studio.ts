import {
  operatorContext,
  operatorErrorResponse
} from "../api/lucia/v1/operator/_shared";
import { LuciaPagesEnv } from "../api/lucia/v1/public/_shared";

interface PagesContext {
  request: Request;
  env: LuciaPagesEnv;
  next: () => Promise<Response>;
}

export async function onRequest({ request, env, next }: PagesContext): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, {
      status: 405,
      headers: { Allow: "GET, HEAD" }
    });
  }
  try {
    await operatorContext(request, env);
    return await next();
  } catch (error) {
    return operatorErrorResponse(error);
  }
}
