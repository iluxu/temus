import { parseClipCollectionPublicV0 } from "../../../../../../app/lucia/clip-public";
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
const categories = ["all", "musique", "irl-voyage", "gaming", "communaute", "storytime", "quotidien"];
const statuses = ["all", "ready_da_tiktok", "rendered_without_da_tiktok", "processing", "failed"];

export async function onRequest({ request, env }: PagesContext): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: { code: "method_not_allowed" } }, 405, { Allow: "POST" });
  }
  try {
    const body = await readPublicJsonRequest(request);
    assertExactKeys(body, ["query", "category", "status", "offset", "limit"]);
    const query = body.query ?? "";
    const category = body.category ?? "all";
    const status = body.status ?? "all";
    const offset = body.offset ?? 0;
    const limit = body.limit ?? 24;
    if (
      typeof query !== "string" || query.length > 600 ||
      typeof category !== "string" || !categories.includes(category) ||
      typeof status !== "string" || !statuses.includes(status) ||
      !Number.isInteger(offset) || (offset as number) < 0 || (offset as number) > 20_000 ||
      !Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 48
    ) {
      throw new LuciaRequestError("invalid_request", "Clip Find request is invalid");
    }
    const publicBody = { query: query.trim(), category, status, offset, limit };
    const projection = await fetchLuciaProjection({
      env,
      method: "mcp.creator.clips.public.find",
      params: publicBody,
      publicPath: "/v1/public/houses/lucia/clips/find",
      publicHttpMethod: "POST",
      publicBody,
      parse: parseClipCollectionPublicV0,
      timeoutMs: 45_000
    });
    return jsonResponse(projection);
  } catch (error) {
    return luciaErrorResponse(error);
  }
}
