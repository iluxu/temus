# RunMesh RAG HTTP API (Docs Q&A)

## Base

- Base URL: `RAG_BASE_URL` (example: `https://rag.example.com`)
- Auth (optional): `Authorization: Bearer $RAG_API_KEY`

## GET /api/status

Returns readiness and chunk metadata.

Example response:

```json
{
  "ready": true,
  "chunks": 1234,
  "source": "r2",
  "lastRefresh": "2025-12-31T10:42:00.000Z",
  "error": null,
  "state": "ready",
  "pagesCrawled": null,
  "lastCrawledUrl": null
}
```

## POST /api/ask

### Request body

```json
{
  "prompt": "How do I customize the table component?",
  "limit": 6,
  "sessionId": "codex",
  "project": {
    "name": "MyApp",
    "text": "We use EUI 21.x with a custom theme."
  },
  "messages": [
    { "role": "user", "content": "We are on EUI 21.x" },
    { "role": "assistant", "content": "Got it. What are you trying to do?" }
  ],
  "images": [
    {
      "name": "screenshot.png",
      "type": "image/png",
      "dataUrl": "data:image/png;base64,iVBORw0KGgo..."
    }
  ]
}
```

Notes:

- `limit` is clamped to 1..10 on the server.
- `sessionId` is used for rate limits.
- `images` accepts up to 3 entries. `dataUrl` must be png/jpg/webp.

### Response body

```json
{
  "response": "You can customize the table by ...",
  "sources": [
    {
      "id": "chunk-123",
      "url": "https://euidev.ecdevops.eu/components/table",
      "title": "Table",
      "section": "Customization",
      "sectionPath": "Components > Table",
      "anchor": "customization",
      "breadcrumbs": ["Components", "Table"],
      "kind": "api",
      "version": "21.x",
      "generatedAt": "2025-12-01T10:00:00.000Z",
      "lang": "en",
      "tokens": 412,
      "text": "...",
      "embedding": []
    }
  ]
}
```

## Optional streaming

Some deployments expose `POST /api/ask/stream` for streamed responses. Use it only if the client supports streaming.
