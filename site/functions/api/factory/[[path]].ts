interface Context { request: Request; params: Record<string, string | string[]> }

export async function onRequest({ request, params }: Context): Promise<Response> {
  const value = Array.isArray(params.path) ? params.path.join("/") : String(params.path || "");
  if (!/^[a-zA-Z0-9/_-]+$/.test(value) || !["GET", "POST", "HEAD"].includes(request.method)) return new Response(null, { status: 404 });
  const target = new URL(`https://api.adoptan.ai/sentinelle-factory/${value}`);
  target.search = new URL(request.url).search;
  const headers = new Headers();
  for (const name of ["content-type", "content-length", "cookie", "origin", "range"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const upstream = await fetch(target, { method: request.method, headers, body: request.method === "POST" ? request.body : undefined, redirect: "manual" });
    const outgoing = new Headers({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    for (const name of ["content-type", "set-cookie", "content-range", "accept-ranges"]) {
      const value = upstream.headers.get(name);
      if (value) outgoing.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers: outgoing });
  } catch {
    return Response.json({ ok: false, message: "Le studio est momentanement indisponible. Reessaie dans quelques instants." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
