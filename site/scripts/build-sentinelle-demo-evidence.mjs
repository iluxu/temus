#!/usr/bin/env node
// Extrait les preuves du pipeline luciamuccia vers la démo /sentinelle/demo.
//
// Source privée (non versionnée) : /home/ubuntu/luciamuccia/.data
// Sorties versionnées :
//   app/sentinelle/demo/replay-data.ts        données du rejeu
//   public/sentinelle-demo/evidence-manifest.json   manifeste des preuves
//
// Le script ne copie que des champs publiables : aucun token, aucun secret,
// aucun lien privé d'approbation, aucune URL signée Twitch.
//
//   node scripts/build-sentinelle-demo-evidence.mjs

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DATA = process.env.LUCIA_DATA_DIR || "/home/ubuntu/luciamuccia/.data";
const CONFIG = process.env.LUCIA_CONFIG_DIR || "/home/ubuntu/luciamuccia/config";
const SITE = path.resolve(new URL("..", import.meta.url).pathname);

const STREAM_ID = "twitch-317634897634";
const BLOCK_ID = "block-mtmquybz-510952ca90";
const HERO_CLIP = "radar-twitch-317634897634-9880-10100-78";
const DESIGN = "lucia-clean-subtitles-v1-tiktok-ae4762e3";

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const readJsonl = (p) =>
  fs
    .readFileSync(p, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));

// Chaque item du bloc porte son slug d'asset local (posters déjà transcodés).
const POSTER_SLUGS = {
  "live-best-bambi-tilt-tv-77d7b242": "bambi-tilt",
  "live-best-resto-etoile-archives-de629ca7": "resto-etoile",
  "live-best-1000-euros-tv-20603993": "mille-euros",
  "live-best-demission-archives-1aed4bba": "demission",
  "live-best-iluxu-tv-34e3b48d": "iluxu",
  "live-best-souris-fromage-archives-2b20b2d0": "souris-fromage",
  "live-best-shy-tv-d7c3393e": "shy",
  "live-best-belgique-archives-a3c0cccc": "belgique"
};

function sha256File(p) {
  return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}

function main() {
  // ---------------------------------------------------------------- sources
  const radarState = readJson(path.join(DATA, "live-radar", STREAM_ID, "state.json"));
  const radarConfig = readJson(path.join(CONFIG, "radar.json"));
  const chunks = readJsonl(path.join(DATA, "live-radar", STREAM_ID, "chunks.jsonl"));
  const candidates = readJsonl(path.join(DATA, "live-radar", STREAM_ID, "candidates.jsonl"));
  const rawMeta = readJson(path.join(DATA, "clip-renders/clips", HERO_CLIP, "metadata.json"));
  const renderMeta = readJson(
    path.join(DATA, "clip-renders/clips", `${HERO_CLIP}--${DESIGN}`, "metadata.json")
  );
  const block = readJson(path.join(DATA, "tiktok-approval-blocks", `${BLOCK_ID}.json`));
  const discord = readJson(path.join(DATA, "discord-clip-notifications.json"));

  const candidate = rawMeta.candidate;

  // -------------------------------------------------- contexte du live (1)
  // Fenêtre de chunks autour du passage retenu, transcription réelle.
  const window = chunks
    .filter((c) => c.type === "transcript.chunk" && c.startSeconds >= 900 && c.startSeconds < 1030)
    .map((c) => ({
      index: c.chunkIndex,
      startSeconds: c.startSeconds,
      endSeconds: c.endSeconds,
      processedAt: c.processedAt,
      text: c.text,
      chatScore: c.chatHeat?.score ?? null,
      messageCount: c.chatHeat?.messageCount ?? null,
      uniqueChatters: c.chatHeat?.uniqueChatters ?? null
    }));

  // Courbe de chaleur du chat sur tout le live (une valeur par chunk de 10 s).
  const heat = chunks
    .filter((c) => c.type === "transcript.chunk" && typeof c.chatHeat?.score === "number")
    .map((c) => ({ t: c.startSeconds, score: Number(c.chatHeat.score.toFixed(2)) }));

  const scored = candidates.filter((c) => typeof c.score === "number");
  const scoreBuckets = {};
  for (const c of scored) {
    const bucket = Math.floor(c.score / 5) * 5;
    scoreBuckets[bucket] = (scoreBuckets[bucket] || 0) + 1;
  }

  // ------------------------------------------------------- le moment (2)
  const moment = {
    clipId: candidate.streamId ? rawMeta.clipId : rawMeta.clipId,
    title: candidate.title,
    hook: candidate.hook,
    angle: candidate.angle,
    reason: candidate.reason,
    risk: candidate.risk,
    signals: candidate.signals,
    score: candidate.score,
    recommendation: candidate.recommendation,
    minScore: radarConfig.scoring.minScore,
    scoringModel: radarConfig.scoring.model,
    transcriptionModel: radarConfig.transcription.model,
    scoringWindowSeconds: radarConfig.scoring.windowSeconds,
    chunkSeconds: radarConfig.source.chunkSeconds,
    clipStartSeconds: candidate.clipStartSeconds,
    clipEndSeconds: candidate.clipEndSeconds,
    clipDurationSeconds: candidate.clipDurationSeconds,
    vodOffsetSeconds: candidate.vodOffsetSeconds,
    detectedAt: candidate.detectedAt,
    streamStartedAt: candidate.streamStartedAt,
    radarStartedAt: candidate.radarStartedAt,
    transcriptPreview: candidate.transcriptPreview,
    chatHeat: {
      score: candidate.chatHeat.score,
      windowSeconds: candidate.chatHeat.windowSeconds,
      messageCount: candidate.chatHeat.messageCount,
      uniqueChatters: candidate.chatHeat.uniqueChatters,
      hotWordHits: candidate.chatHeat.hotWordHits,
      questionCount: candidate.chatHeat.questionCount,
      clipCommands: candidate.chatHeat.clipCommands
    },
    chat: candidate.chatHeat.recentMessages.map((m) => ({
      at: m.at,
      user: m.user,
      text: m.text
    })),
    bufferSegments: rawMeta.buffer.segments.length,
    bufferSegmentSeconds: radarConfig.buffer.segmentSeconds,
    bufferRetentionSeconds: radarConfig.buffer.retentionSeconds
  };

  // ------------------------------------------------------- le montage (3)
  const heroItem = block.items.find((i) => i.videoUrl.includes(HERO_CLIP));
  const render = {
    renderId: renderMeta.renderId,
    designVersion: renderMeta.designVersion,
    renderedAt: renderMeta.renderedAt,
    caption: renderMeta.caption,
    overlay: renderMeta.overlay,
    hook: renderMeta.hook,
    transcript: renderMeta.transcript,
    hashtags: renderMeta.creativePack.creative.hashtags,
    subtitlePreset: renderMeta.creativePack.creative.subtitlePreset,
    language: renderMeta.creativePack.transcript.language,
    subtitleWordCount: renderMeta.creativePack.transcript.subtitleWords.length,
    timedWordCoverage: renderMeta.creativePack.transcript.chunkedTranscription.timedWordCoverage,
    activeWordTracking: renderMeta.processingReport.subtitles.activeWordTracking,
    outputDurationSec: renderMeta.processingReport.editing.outputDurationSec,
    encoding: renderMeta.processingReport.encoding,
    media: heroItem.media,
    segments: renderMeta.creativePack.transcript.segments.map((s) => ({
      start: Number(s.start.toFixed(2)),
      end: Number(s.end.toFixed(2)),
      text: s.text
    })),
    words: renderMeta.creativePack.transcript.subtitleWords.map((w) => ({
      start: Number(w.start.toFixed(2)),
      end: Number(w.end.toFixed(2)),
      text: w.text
    }))
  };

  // ---------------------------------------------- caption + file d'attente (4)
  const queue = block.items.map((item) => {
    const receipt = item.receipt || {};
    return {
      id: item.id,
      slug: POSTER_SLUGS[item.id] || null,
      accountId: item.accountId,
      title: item.title,
      strategy: item.strategy,
      durationSec: item.media.durationSec,
      width: item.media.width,
      height: item.media.height,
      sha256: item.media.sha256,
      status: item.status,
      approvedAt: receipt.approvedAt || null,
      settings: receipt.settings || null,
      publishStatus: item.publishStatus?.status || null,
      postUrl: item.postUrl || null,
      analyticsRecordId: item.analyticsRecordId || null,
      sourceClipId: item.videoUrl.split("/clips/")[1]?.split("--")[0] || null
    };
  });

  // ------------------------------------------------------ publication (5)
  const publications = queue
    .filter((q) => q.analyticsRecordId)
    .map((q) => {
      const file = path.join(DATA, "tiktok-post-analytics", `${q.analyticsRecordId}.json`);
      if (!fs.existsSync(file)) return null;
      const a = readJson(file);
      return {
        itemId: q.id,
        accountId: a.accountId,
        postId: a.postId,
        confirmedAt: a.confirmedAt,
        // URL publique canonique, sans les paramètres utm de l'API.
        publicUrl: `https://www.tiktok.com/@${a.accountId}/video/${a.postId}`,
        source: a.source,
        snapshots: a.snapshots.map((s) => ({
          delayMinutes: s.delayMinutes,
          observedAt: s.observedAt,
          views: s.metrics.viewCount,
          likes: s.metrics.likeCount,
          comments: s.metrics.commentCount,
          shares: s.metrics.shareCount
        }))
      };
    })
    .filter(Boolean);

  // ------------------------------------------------------- continuité (6)
  const notifications = Object.values(discord.notifications);
  const byStatus = {};
  for (const n of notifications) byStatus[n.status] = (byStatus[n.status] || 0) + 1;

  const renderDir = path.join(DATA, "clip-renders/clips");
  const allRenders = fs.readdirSync(renderDir);

  const library = {
    renderedVariants: allRenders.filter((d) => d.includes(`--${DESIGN}`)).length,
    clipDirectories: allRenders.length,
    radarSessions: fs.readdirSync(path.join(DATA, "live-radar")).length,
    discordTotal: notifications.length,
    discordByStatus: byStatus,
    discordUpdatedAt: discord.updatedAt
  };

  // ------------------------------------------------------------ manifeste
  const mediaDir = path.join(SITE, "public/sentinelle-demo/media");
  const mediaFiles = fs
    .readdirSync(mediaDir)
    .sort()
    .map((name) => {
      const full = path.join(mediaDir, name);
      return {
        file: `/sentinelle-demo/media/${name}`,
        bytes: fs.statSync(full).size,
        sha256: sha256File(full)
      };
    });

  const manifest = {
    generatedAt: new Date().toISOString(),
    generator: "scripts/build-sentinelle-demo-evidence.mjs",
    caseStudy: {
      stream: STREAM_ID,
      streamStartedAt: candidate.streamStartedAt,
      block: BLOCK_ID,
      heroClip: HERO_CLIP,
      designVersion: DESIGN
    },
    sources: [
      `${DATA}/live-radar/${STREAM_ID}/state.json`,
      `${DATA}/live-radar/${STREAM_ID}/chunks.jsonl`,
      `${DATA}/live-radar/${STREAM_ID}/candidates.jsonl`,
      `${DATA}/clip-renders/clips/${HERO_CLIP}/metadata.json`,
      `${DATA}/clip-renders/clips/${HERO_CLIP}--${DESIGN}/metadata.json`,
      `${DATA}/tiktok-approval-blocks/${BLOCK_ID}.json`,
      `${DATA}/tiktok-approval-manifests/2026-09-04-live-best-unpublished-4x4.json`,
      `${DATA}/tiktok-review-api/approval-v_pub_url_v2-1.7681610566078892054.json`,
      ...queue.filter((q) => q.analyticsRecordId).map((q) => `${DATA}/tiktok-post-analytics/${q.analyticsRecordId}.json`),
      `${DATA}/discord-clip-notifications.json`,
      `${CONFIG}/radar.json`
    ],
    mediaTransform:
      "Clips réels ré-encodés pour le web (H.264, source 960px de large, vertical 540x960, CRF 30). Aucun recadrage, aucune coupe, aucun sous-titre ajouté ou retiré.",
    media: mediaFiles,
    counts: {
      chunksProcessed: radarState.processedChunks,
      candidates: radarState.candidates,
      queueItems: queue.length,
      published: queue.filter((q) => q.status === "published").length,
      measuredPublications: publications.length
    }
  };

  // ------------------------------------------------------------- écriture
  const data = {
    stream: {
      id: STREAM_ID,
      startedAt: candidate.streamStartedAt,
      radarStartedAt: candidate.radarStartedAt,
      radarStoppedAt: radarState.updatedAt,
      processedChunks: radarState.processedChunks,
      candidates: radarState.candidates,
      transcriptionModel: radarState.transcription.model,
      transcriptionTransport: radarState.transcription.transport,
      chunkSeconds: radarConfig.source.chunkSeconds
    },
    window,
    heat,
    scoreBuckets,
    moment,
    render,
    block: {
      id: block.id,
      title: block.title,
      createdAt: block.createdAt,
      expiresAt: block.expiresAt,
      status: block.status
    },
    queue,
    publications,
    library
  };

  const outTs = path.join(SITE, "app/sentinelle/demo/replay-data.ts");
  fs.mkdirSync(path.dirname(outTs), { recursive: true });
  fs.writeFileSync(
    outTs,
    `// Généré par scripts/build-sentinelle-demo-evidence.mjs — ne pas éditer à la main.\n` +
      `// Toutes les valeurs proviennent des journaux réels du pipeline luciamuccia.\n` +
      `// Voir /sentinelle-demo/evidence-manifest.json pour les fichiers sources.\n\n` +
      `export const replayData = ${JSON.stringify(data, null, 2)} as const;\n\n` +
      `export type ReplayData = typeof replayData;\n`,
    "utf8"
  );

  const outManifest = path.join(SITE, "public/sentinelle-demo/evidence-manifest.json");
  fs.writeFileSync(outManifest, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(`replay-data.ts       ${fs.statSync(outTs).size} octets`);
  console.log(`evidence-manifest    ${mediaFiles.length} médias`);
  console.log(`chunks ${data.stream.processedChunks} · candidats ${data.stream.candidates} · file ${queue.length} · publiés ${manifest.counts.published} · mesurés ${publications.length}`);
}

main();
