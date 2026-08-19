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
  "app/lucia/moment-public.ts",
  "app/lucia/clip-public.ts",
  "functions/api/lucia/v1/public/_shared.ts",
  "functions/api/lucia/v1/public/experience.ts",
  "functions/api/lucia/v1/public/ask.ts",
  "functions/api/lucia/v1/public/moments.ts",
  "functions/api/lucia/v1/public/moments/find.ts",
  "functions/api/lucia/v1/public/moments/ask.ts",
  "functions/api/lucia/v1/public/clips.ts",
  "functions/api/lucia/v1/public/clips/find.ts",
  "functions/api/lucia/v1/public/clips/ask.ts",
  "functions/api/lucia/v1/public/replay/sessions.ts",
  "functions/api/lucia/v1/public/replay/sessions/[sessionId].ts",
  "functions/api/lucia/v1/public/replay/sessions/[sessionId]/control.ts",
  "functions/api/lucia/v1/operator/_shared.ts",
  "functions/lucia/studio.ts"
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

function publicMoment() {
  return {
    id: `mom_${"a".repeat(32)}`,
    title: "Lucia chante à New York",
    summary: "Un passage musical relié à sa source.",
    category: "musique",
    status: "qualified",
    public: true,
    source: {
      creator: "luciamuccia",
      started_at: past,
      ended_at: cutoff,
      start_seconds: 125,
      end_seconds: 150,
      public_url: "https://www.twitch.tv/luciamuccia"
    },
    qualification: {
      hook: "Lucia commence à chanter.",
      reason: "Le passage a une amorce et une réaction nette.",
      score: 76,
      threshold: 70,
      score_semantics: "selection_score_not_confidence"
    },
    derivatives: [{
      id: `media_${"b".repeat(32)}`,
      kind: "twitch_clip",
      platform: "twitch",
      status: "created",
      public_url: "https://clips.twitch.tv/Example",
      duration_seconds: 25,
      format: "twitch-native",
      created_at: cutoff
    }],
    decisions: [],
    updated_at: cutoff
  };
}

function momentCollection() {
  return {
    schema_version: "moment-collection.v0",
    house_slug: "lucia",
    mode: "public",
    moments: [publicMoment()],
    categories: ["musique"],
    capabilities: { ask: true, find: true, do: false },
    generated_at: cutoff
  };
}

function clipCollection() {
  const categoryLabels = {
    musique: "Musique", "irl-voyage": "IRL & voyage", gaming: "Gaming",
    communaute: "Communauté", storytime: "Storytime", quotidien: "Quotidien"
  };
  const statusLabels = {
    ready_da_tiktok: "Prêt TikTok", rendered_without_da_tiktok: "Rendu",
    processing: "En cours", failed: "À revoir"
  };
  return {
    schema_version: "clip-collection-public.v0",
    house_slug: "lucia",
    scope: "public_twitch_clips",
    clips: [{
      id: "MusicalNewYorkClip",
      title: "Lucia chante à New York",
      created_at: cutoff,
      category: "musique",
      category_label: "Musique",
      status: "rendered_without_da_tiktok",
      status_label: "Rendu",
      public_url: "https://clips.twitch.tv/MusicalNewYorkClip",
      variant_count: 4,
      has_render: true,
      ready_tiktok: false,
      moment_id: null,
      match: null,
      transcript: "must disappear"
    }],
    categories: Object.entries(categoryLabels).map(([slug, label]) => ({ slug, label, count: slug === "musique" ? 1 : 0 })),
    statuses: Object.entries(statusLabels).map(([slug, label]) => ({ slug, label, count: slug === "rendered_without_da_tiktok" ? 1 : 0 })),
    totals: { public_clips: 1, matching_clips: 1 },
    filters: { query: "", category: "all", status: "all", offset: 0, limit: 24, next_offset: null },
    capabilities: { ask: true, find: true, do: false },
    world: null,
    category_basis: "derived_filter_v0",
    limitations: ["Recherche lexicale."],
    generated_at: cutoff
  };
}

function worldReceipt() {
  return {
    schema_version: "world-attach-receipt.v1",
    world: "https://api.adoptan.ai/v1/public/houses/lucia/world",
    runtime: "llm-route",
    attached_before_inference: true,
    binding_roles: ["workspace", "state", "context", "resources", "guidance", "skills", "extensions", "capabilities"],
    guidance_loaded: true,
    capabilities_mounted: false
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
  const momentModule = require(join(temporaryRoot, "app/lucia/moment-public.js"));
  const clipModule = require(join(temporaryRoot, "app/lucia/clip-public.js"));
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
  const safeClips = clipModule.parseClipCollectionPublicV0(clipCollection());
  assert.equal(safeClips.clips[0].title, "Lucia chante à New York");
  assert.equal("transcript" in safeClips.clips[0], false);
  assert.equal(safeClips.clips[0].match, null);
  assert.equal(safeClips.world, null);
  const attachedClips = clipModule.parseClipCollectionPublicV0({
    ...clipCollection(),
    world: worldReceipt()
  });
  assert.equal(attachedClips.world?.attached_before_inference, true);
  assert.equal(attachedClips.world?.capabilities_mounted, false);
  const safeMoment = momentModule.parseMomentCollectionV0({
    ...momentCollection(),
    private_memory: "must disappear"
  });
  assert.equal(safeMoment.moments[0].title, "Lucia chante à New York");
  assert.equal("private_memory" in safeMoment, false);
  assert.throws(() =>
    momentModule.parseMomentCollectionV0({
      ...momentCollection(),
      moments: [{ ...publicMoment(), public: false }]
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
  const momentsEndpoint = require(join(temporaryRoot, "functions/api/lucia/v1/public/moments.js"));
  const momentFindEndpoint = require(join(temporaryRoot, "functions/api/lucia/v1/public/moments/find.js"));
  const momentAskEndpoint = require(join(temporaryRoot, "functions/api/lucia/v1/public/moments/ask.js"));
  const clipsEndpoint = require(join(temporaryRoot, "functions/api/lucia/v1/public/clips.js"));
  const clipFindEndpoint = require(join(temporaryRoot, "functions/api/lucia/v1/public/clips/find.js"));
  const clipAskEndpoint = require(join(temporaryRoot, "functions/api/lucia/v1/public/clips/ask.js"));
  const studioGuard = require(join(temporaryRoot, "functions/lucia/studio.js"));

  const anonymousStudio = await studioGuard.onRequest({
    request: new Request("https://adoptan.ai/lucia/studio"),
    env: {
      CF_ACCESS_TEAM_DOMAIN: "maison-lucia.cloudflareaccess.com",
      CF_ACCESS_AUD: "lucia-studio-audience"
    },
    next: async () => new Response("private studio")
  });
  assert.equal(anonymousStudio.status, 200);
  assert.equal(
    (
      await studioGuard.onRequest({
        request: new Request("https://adoptan.ai/lucia/studio", { method: "POST" }),
        env: {},
        next: async () => new Response("private studio")
      })
    ).status,
    405
  );

  assert.equal((await callEndpoint(
    momentsEndpoint,
    new Request("https://adoptan.ai/api/lucia/v1/public/moments"),
    momentCollection()
  )).status, 200);

  assert.equal((await callEndpoint(
    clipsEndpoint,
    new Request("https://adoptan.ai/api/lucia/v1/public/clips"),
    clipCollection()
  )).status, 200);

  assert.equal((await callEndpoint(
    clipFindEndpoint,
    new Request("https://adoptan.ai/api/lucia/v1/public/clips/find", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "New York", category: "all", status: "all", offset: 0, limit: 24 })
    }),
    {
      ...clipCollection(),
      clips: clipCollection().clips.map((clip) => ({
        ...clip,
        match: {
          score: 0.75,
          score_semantics: "bounded_worker_relevance_not_quality",
          evidence: ["title", "transcript"],
          reasons: ["Lucia chante réellement dans les rues de New York, ce qui correspond directement au souvenir demandé."]
        },
        raw_transcript: "must disappear"
      })),
      filters: { ...clipCollection().filters, query: "New York" },
      world: worldReceipt()
    }
  )).status, 200);

  const clipAnswer = {
    schema_version: "clip-answer-public.v0",
    clip_id: "MusicalNewYorkClip",
    question: "pourquoi celui-ci ?",
    context_query: "New York",
    answer: {
      intent: "why_catalogued",
      text: "Ce clip a une source publique, sans qualification inventée.",
      sources: [{ label: "Clip Twitch public", url: "https://clips.twitch.tv/MusicalNewYorkClip", occurred_at: cutoff, at_seconds: null }],
      limitations: ["Aucune qualification inventée."]
    },
    world: worldReceipt(),
    generated_at: cutoff
  };
  assert.equal((await callEndpoint(
    clipAskEndpoint,
    new Request("https://adoptan.ai/api/lucia/v1/public/clips/ask", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clip_id: clipAnswer.clip_id, question: clipAnswer.question, context_query: clipAnswer.context_query })
    }),
    clipAnswer
  )).status, 200);

  const findProjection = {
    schema_version: "moment-find.v0",
    query: "retrouve quand Lucia chantait à New York",
    scope: "public_moments",
    results: [{ ...publicMoment(), match_score: 1 }],
    limitations: ["Contexte borné."],
    generated_at: cutoff
  };
  assert.equal((await callEndpoint(
    momentFindEndpoint,
    new Request("https://adoptan.ai/api/lucia/v1/public/moments/find", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: findProjection.query })
    }),
    findProjection
  )).status, 200);

  const answerProjection = {
    schema_version: "moment-answer.v0",
    moment_id: publicMoment().id,
    question: "pourquoi celui-ci a été retenu ?",
    answer: { intent: "why_selected", text: "Parce que la preuve est nette.", sources: [{ label: "Live Twitch de Lucia", url: "https://www.twitch.tv/luciamuccia", occurred_at: past, at_seconds: 125 }] },
    generated_at: cutoff
  };
  assert.equal((await callEndpoint(
    momentAskEndpoint,
    new Request("https://adoptan.ai/api/lucia/v1/public/moments/ask", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moment_id: answerProjection.moment_id, question: answerProjection.question })
    }),
    answerProjection
  )).status, 200);

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
    "/api/lucia/v1/public/moments",
    "/api/lucia/v1/public/moments/find",
    "/api/lucia/v1/public/moments/ask",
    "/api/lucia/v1/operator/moments",
    "/api/lucia/v1/operator/moments/find",
    "/api/lucia/v1/operator/moments/ask",
    "/api/lucia/v1/operator/moments/do",
    "/lucia/studio",
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
