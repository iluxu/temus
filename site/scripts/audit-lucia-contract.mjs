import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const siteRoot = fileURLToPath(new URL("../", import.meta.url));
const temporaryRoot = await mkdtemp(join(tmpdir(), "maison-lucia-audit-"));

const sources = [
  "app/lucia/house-public.ts",
  "app/lucia/experience-public.ts",
  "functions/api/lucia/v1/public/_shared.ts",
  "functions/api/lucia/v1/public/experience.ts",
  "functions/api/lucia/v1/public/ask.ts",
  "functions/api/lucia/v1/public/replay/sessions.ts",
  "functions/api/lucia/v1/public/replay/sessions/[sessionId].ts",
  "functions/api/lucia/v1/public/replay/sessions/[sessionId]/control.ts"
];

const past = "2026-08-12T11:59:00.000Z";
const cutoff = "2026-08-12T12:00:00.000Z";
const future = "2026-08-12T12:01:00.000Z";
const sessionA = `rps_${"a".repeat(32)}`;
const sessionB = `rps_${"b".repeat(32)}`;

function publicHouse() {
  return {
    schema_version: "house-public.v1",
    slug: "lucia",
    revision: 1,
    projection_hash: "audit-projection",
    house: {
      name: "Maison Lucia",
      locale: "fr-FR",
      charter: {
        mission: "Observer le contexte public.",
        may: [],
        asks_before: [],
        never: [],
        success_means: []
      }
    },
    presence: { state: "watching", updated_at: past },
    now: {
      kind: "stream",
      status: "live",
      started_at: past,
      source: { label: "Twitch public", occurred_at: past }
    },
    rooms: [],
    changes: [],
    capabilities: { ask: false, find: false, participate: "unavailable" },
    generated_at: cutoff
  };
}

function publicAnswer() {
  return {
    intent: "live_topic",
    status: "answered",
    text: "Réponse publique vérifiée.",
    sources: [
      {
        label: "Twitch public",
        occurred_at: past,
        url: null,
        sha256: null,
        at_seconds: null
      }
    ],
    limitations: []
  };
}

function liveExperience(answer = null) {
  return {
    schema_version: "house-experience-public.v1",
    mode: "live",
    real_historical_data: false,
    side_effect_policy: "read_only",
    generated_at: cutoff,
    as_of: cutoff,
    house: publicHouse(),
    capabilities: {
      ask: true,
      replay: true,
      find: false,
      participate: "unavailable"
    },
    session: null,
    story: null,
    topic: null,
    clip_candidate: null,
    receipt: null,
    outcomes: [],
    answer,
    controls: null,
    limitations: []
  };
}

function replayExperience(answer = null) {
  return {
    ...liveExperience(answer),
    mode: "replay",
    real_historical_data: true,
    side_effect_policy: "historical_only",
    session: {
      id: sessionA,
      story_slug: "a-day-with-lucia",
      status: "paused",
      virtual_time: cutoff,
      from: past,
      to: cutoff,
      speed: 120,
      revision: 1
    },
    story: {
      slug: "a-day-with-lucia",
      title: "A day with Lucia",
      current_moment: "stream-started",
      moments: [
        {
          id: "stream-started",
          kind: "stream_started",
          label: "Le direct commence",
          occurred_at: past,
          state: "current",
          dwell_seconds: 10
        }
      ]
    },
    controls: {
      allowed: ["play"],
      seek_min: past,
      seek_max: cutoff,
      next_after_seconds: null
    }
  };
}

async function callEndpoint(handler, request, projection, params = {}) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify(projection), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  try {
    return await handler.onRequest({ request, env: {}, params });
  } finally {
    globalThis.fetch = originalFetch;
  }
}

try {
  for (const source of sources) {
    const input = await readFile(join(siteRoot, source), "utf8");
    const output = ts.transpileModule(input, {
      fileName: source,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true
      }
    }).outputText;
    const destination = join(temporaryRoot, source.replace(/\.ts$/, ".js"));
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, output);
  }

  const experienceModule = require(
    join(temporaryRoot, "app/lucia/experience-public.js")
  );
  const sharedModule = require(
    join(temporaryRoot, "functions/api/lucia/v1/public/_shared.js")
  );
  const parse = experienceModule.parseHouseExperiencePublicV1;
  const bind = sharedModule.assertLuciaExperienceBinding;

  const live = parse(liveExperience());
  const liveAnswer = parse(liveExperience(publicAnswer()));
  const replay = parse(replayExperience());
  assert.equal(bind(live, { mode: "live", answer: "forbidden" }), live);
  assert.equal(
    bind(liveAnswer, { mode: "live", answer: "required" }),
    liveAnswer
  );
  assert.equal(
    bind(replay, {
      mode: "replay",
      replaySessionId: sessionA,
      answer: "forbidden"
    }),
    replay
  );
  assert.throws(() => bind(live, { mode: "replay", answer: "forbidden" }));
  assert.throws(() => bind(live, { mode: "live", answer: "required" }));
  assert.throws(() =>
    bind(replay, {
      mode: "replay",
      replaySessionId: sessionB,
      answer: "forbidden"
    })
  );

  const experienceEndpoint = require(
    join(temporaryRoot, "functions/api/lucia/v1/public/experience.js")
  );
  const askEndpoint = require(
    join(temporaryRoot, "functions/api/lucia/v1/public/ask.js")
  );
  const createEndpoint = require(
    join(
      temporaryRoot,
      "functions/api/lucia/v1/public/replay/sessions.js"
    )
  );
  const getEndpoint = require(
    join(
      temporaryRoot,
      "functions/api/lucia/v1/public/replay/sessions/[sessionId].js"
    )
  );
  const controlEndpoint = require(
    join(
      temporaryRoot,
      "functions/api/lucia/v1/public/replay/sessions/[sessionId]/control.js"
    )
  );

  assert.equal(
    (
      await callEndpoint(
        experienceEndpoint,
        new Request("https://adoptan.ai/api/lucia/v1/public/experience"),
        liveExperience()
      )
    ).status,
    200
  );
  assert.equal(
    (
      await callEndpoint(
        experienceEndpoint,
        new Request("https://adoptan.ai/api/lucia/v1/public/experience"),
        replayExperience()
      )
    ).status,
    503
  );
  assert.equal(
    (
      await callEndpoint(
        askEndpoint,
        new Request("https://adoptan.ai/api/lucia/v1/public/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: "Que se passe-t-il ?" })
        }),
        liveExperience(publicAnswer())
      )
    ).status,
    200
  );
  assert.equal(
    (
      await callEndpoint(
        askEndpoint,
        new Request("https://adoptan.ai/api/lucia/v1/public/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: "Que se passe-t-il ?" })
        }),
        liveExperience()
      )
    ).status,
    503
  );
  assert.equal(
    (
      await callEndpoint(
        createEndpoint,
        new Request(
          "https://adoptan.ai/api/lucia/v1/public/replay/sessions",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ story_slug: "a-day-with-lucia" })
          }
        ),
        liveExperience()
      )
    ).status,
    503
  );

  const mismatchedReplay = replayExperience();
  mismatchedReplay.session.id = sessionB;
  assert.equal(
    (
      await callEndpoint(
        getEndpoint,
        new Request(
          `https://adoptan.ai/api/lucia/v1/public/replay/sessions/${sessionA}`
        ),
        mismatchedReplay,
        { sessionId: sessionA }
      )
    ).status,
    503
  );
  assert.equal(
    (
      await callEndpoint(
        controlEndpoint,
        new Request(
          `https://adoptan.ai/api/lucia/v1/public/replay/sessions/${sessionA}/control`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "play" })
          }
        ),
        mismatchedReplay,
        { sessionId: sessionA }
      )
    ).status,
    503
  );

  for (const mutate of [
    (value) => {
      value.house.presence.updated_at = future;
    },
    (value) => {
      value.house.now.started_at = future;
    },
    (value) => {
      value.house.now.ended_at = future;
    },
    (value) => {
      value.house.now.source.occurred_at = future;
    },
    (value) => {
      value.answer.sources[0].occurred_at = future;
    }
  ]) {
    const value = liveExperience(publicAnswer());
    mutate(value);
    assert.throws(() => parse(value), /future evidence/);
  }

  const worker = await readFile(join(siteRoot, ".pages-worker/index.js"), "utf8");
  for (const route of [
    "/api/lucia/v1/public/house",
    "/api/lucia/v1/public/experience",
    "/api/lucia/v1/public/ask",
    "/api/lucia/v1/public/replay/sessions",
    "/api/lucia/v1/public/replay/sessions/:sessionId",
    "/api/lucia/v1/public/replay/sessions/:sessionId/control"
  ]) {
    assert.ok(worker.includes(`routePath: "${route}"`), `missing route ${route}`);
  }

  const deployedWorker = await readFile(join(siteRoot, "out/_worker.js"), "utf8");
  assert.equal(deployedWorker, worker, "out/_worker.js is not the compiled Worker");

  const wrangler = await readFile(join(siteRoot, "wrangler.toml"), "utf8");
  assert.match(wrangler, /^compatibility_date = "2025-12-10"$/m);

  const client = await readFile(join(siteRoot, "app/lucia/LuciaHouse.tsx"), "utf8");
  assert.match(client, /PLAYING_POLL_INTERVAL_MS = 3_000/);
  assert.match(client, /const pollSequence = useRef\(0\)/);
  assert.match(client, /role="alert"/);

  console.log("Maison Lucia contract audit passed");
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
