interface PagesContext {
  request: Request;
  params: Record<string, string | string[]>;
}

const UPSTREAM_BASE = "https://api.adoptan.ai/clip-drafts/";
const ALLOWED_EXTENSIONS = new Set([".mp4", ".jpg", ".jpeg"]);
const FORWARDED_RESPONSE_HEADERS = [
  "accept-ranges",
  "cache-control",
  "content-length",
  "content-range",
  "content-type",
  "etag",
  "last-modified"
];

export async function onRequest({ request, params }: PagesContext): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, {
      status: 405,
      headers: { Allow: "GET, HEAD" }
    });
  }

  const pathValue = Array.isArray(params.path) ? params.path.join("/") : String(params.path || "");
  const segments = pathValue.split("/").filter(Boolean);
  if (
    segments.length < 2 ||
    segments.some((segment) => segment === "." || segment === "..") ||
    !ALLOWED_EXTENSIONS.has(extensionOf(segments.at(-1) || ""))
  ) {
    return new Response("Not found", { status: 404 });
  }

  const upstreamUrl = new URL(segments.map(encodeURIComponent).join("/"), UPSTREAM_BASE);
  const upstreamHeaders = new Headers();
  for (const name of ["range", "if-none-match", "if-modified-since"]) {
    const value = request.headers.get(name);
    if (value) {
      upstreamHeaders.set(name, value);
    }
  }

  const upstream = await fetch(upstreamUrl, {
    method: request.method,
    headers: upstreamHeaders,
    redirect: "manual"
  });
  if (upstream.status >= 300 && upstream.status < 400) {
    return new Response("Upstream redirects are not allowed", { status: 502 });
  }

  const responseHeaders = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Content-Disposition": "inline",
    "X-Content-Type-Options": "nosniff"
  });
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) {
      responseHeaders.set(name, value);
    }
  }

  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders
  });
}

function extensionOf(fileName: string) {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index).toLowerCase() : "";
}
