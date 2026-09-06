#!/usr/bin/env node
/* Parcours complet de la Factory : prompt → worker → montage → aperçus.
 *
 *   node src/sentinelle-factory-server.js      # dans /home/ubuntu/luciamuccia
 *   npm run demo:serve                         # dans site/
 *   npm run factory:test
 *
 * Ne clique jamais « Publier » : ce test vérifie la chaîne jusqu'aux aperçus.
 * La publication réelle se déclenche à la main, sur un moteur lancé --live.
 */

import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.DEMO_BASE || "http://127.0.0.1:4310";
const URL = `${BASE}/sentinelle/factory`;
const SHOTS = path.join(SITE, "review-assets", "sentinelle-factory");
const PROMPT =
  process.env.FACTORY_PROMPT || "Trouve 3 extraits où Bambi perturbe le live et publie-les";

const results = [];
const check = (pass, name, detail = "") => results.push({ pass, name, detail });

async function overflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

async function runOn(browser, label, contextOptions, { full = false } = {}) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  page.on("pageerror", (error) => errors.push(String(error)));

  await page.goto(URL, { waitUntil: "networkidle" });

  const engineUp = (await page.locator("text=Moteur non joignable").count()) === 0;
  check(engineUp, `${label} — le moteur répond`);
  if (!engineUp) {
    await context.close();
    return;
  }

  check(
    (await page.locator("select").count()) === 1,
    `${label} — le compte de destination est sélectionnable`
  );
  check((await overflow(page)) <= 1, `${label} — pas de débordement horizontal au repos`);
  await page.screenshot({ path: path.join(SHOTS, `${label}-1-prompt.png`) });

  if (!full) {
    check(errors.length === 0, `${label} — aucune erreur console`, errors.slice(0, 2).join(" | "));
    await context.close();
    return;
  }

  // Parcours complet : prompt → worker → montage → aperçus.
  const started = Date.now();
  await page.fill("textarea", PROMPT);
  await page.click("button[type=submit]");

  await page.waitForSelector("[class*='feed'] p", { timeout: 30_000 });
  check(true, `${label} — le flux du worker démarre`);
  await page.waitForTimeout(6000);
  await page.screenshot({ path: path.join(SHOTS, `${label}-2-worker.png`) });

  // La bulle de proposition arrive quand le worker a fini de choisir.
  await page.waitForSelector("[class*='bubble']", { timeout: 180_000 });
  const answer = await page.locator("[class*='bubble'] p").first().innerText();
  check(answer.length > 10, `${label} — bulle de proposition affichée`, answer.slice(0, 90));
  await page.screenshot({ path: path.join(SHOTS, `${label}-3-proposition.png`) });

  // Les aperçus vidéo doivent réellement arriver et jouer.
  await page.waitForSelector("article video", { timeout: 240_000 });
  await page.waitForFunction(
    () => document.querySelectorAll("article video").length >= 3,
    undefined,
    { timeout: 240_000 }
  );
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  check(true, `${label} — 3 aperçus montés`, `${elapsed} s depuis le prompt`);

  await page.waitForTimeout(2500);
  const playing = await page.$$eval("article video", (videos) =>
    videos.map((video) => ({ time: video.currentTime, ready: video.readyState }))
  );
  check(
    playing.every((state) => state.ready >= 2),
    `${label} — les trois aperçus sont chargés`,
    playing.map((state) => `rs${state.ready}`).join(" ")
  );
  check(
    playing.some((state) => state.time > 0.2),
    `${label} — les aperçus jouent`,
    playing.map((state) => state.time.toFixed(1)).join(" / ")
  );

  const badges = await page.locator("[class*='badge_']").count();
  check(badges >= 1, `${label} — badge de potentiel affiché`, `${badges}`);

  const publish = page.locator("button[class*='publish']");
  check(await publish.isVisible(), `${label} — le bouton de publication est présent`);
  const publishLabel = await publish.innerText();
  check(
    /Publier la sélection \(3\)/.test(publishLabel),
    `${label} — le bouton annonce les 3 clips`,
    publishLabel
  );

  check((await overflow(page)) <= 1, `${label} — pas de débordement avec les clips`);
  await page.screenshot({ path: path.join(SHOTS, `${label}-4-clips.png`), fullPage: true });

  check(errors.length === 0, `${label} — aucune erreur console`, errors.slice(0, 2).join(" | "));
  await context.close();
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  try {
    await runOn(browser, "ordinateur", { viewport: { width: 1440, height: 950 } }, { full: true });
    await runOn(browser, "mobile", { ...devices["iPhone 13"], isMobile: true, hasTouch: true });
  } finally {
    await browser.close();
  }

  for (const result of results) {
    console.log(`${result.pass ? "✔" : "✘"} ${result.name}${result.detail ? `  — ${result.detail}` : ""}`);
  }
  const failed = results.filter((result) => !result.pass).length;
  console.log(`\n${results.length - failed}/${results.length} vérifications passées.`);
  console.log(`Captures : ${SHOTS}`);
  if (failed) process.exitCode = 1;
}

main();
