#!/usr/bin/env node
/* Vérification du Replay de démo Sentinelle avec Playwright.
 *
 *   npm i -D playwright && npx playwright install chromium   # une seule fois
 *   npm run demo:serve   # dans un autre terminal
 *   npm run demo:test
 *
 * Playwright est un outil local : il n'est volontairement pas déclaré dans
 * package.json, pour que le build Cloudflare Pages reste inchangé.
 *
 * Couvre, sur ordinateur et sur mobile : lecture vidéo réelle, navigation
 * entre étapes, clavier, absence de débordement horizontal, PWA installable,
 * disponibilité hors connexion, et surtout l'absence de toute requête sortante
 * susceptible de publier ou d'envoyer un message.
 */

import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.DEMO_BASE || "http://127.0.0.1:4310";
const URL = `${BASE}/sentinelle/demo`;
const SHOTS = path.join(SITE, "review-assets", "sentinelle-demo");

const results = [];
const ok = (name, detail = "") => results.push({ pass: true, name, detail });
const fail = (name, detail = "") => results.push({ pass: false, name, detail });
const check = (cond, name, detail = "") => (cond ? ok(name, detail) : fail(name, detail));

/* Toute origine ou tout verbe qui pourrait publier ou notifier. */
const FORBIDDEN_HOSTS = [
  "tiktok.com",
  "tiktokapis.com",
  "twitch.tv",
  "discord.com",
  "discordapp.com",
  "api.adoptan.ai",
  "openai.com",
  "googleapis.com",
  "smtp",
  "mailgun",
  "sendgrid"
];

function watchRequests(context, label) {
  const outbound = [];
  const writes = [];
  context.on("request", (request) => {
    const url = request.url();
    const method = request.method();
    if (!url.startsWith(BASE) && !url.startsWith("data:") && !url.startsWith("blob:")) {
      outbound.push(`${method} ${url}`);
    }
    if (!["GET", "HEAD"].includes(method)) writes.push(`${method} ${url}`);
    if (FORBIDDEN_HOSTS.some((host) => url.includes(host))) {
      fail(`${label} — appel vers un service externe`, `${method} ${url}`);
    }
  });
  return { outbound, writes };
}

async function playedFor(page, index = 0) {
  const video = page.locator("video").nth(index);
  const before = await video.evaluate((v) => v.currentTime);
  await page.waitForTimeout(1600);
  const after = await video.evaluate((v) => v.currentTime);
  return { before, after, advanced: after > before + 0.2 };
}

async function noHorizontalOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const overflow = doc.scrollWidth - doc.clientWidth;
    const wide = [...document.querySelectorAll("body *")]
      .filter((el) => el.getBoundingClientRect().right > doc.clientWidth + 2)
      .slice(0, 4)
      .map((el) => `${el.tagName.toLowerCase()}.${el.className?.toString().slice(0, 40)}`);
    return { overflow, wide };
  });
}

async function runDesktop(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const traffic = watchRequests(context, "ordinateur");
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
  page.on("pageerror", (e) => consoleErrors.push(String(e)));

  await page.goto(URL, { waitUntil: "networkidle" });

  check(
    (await page.textContent("h1")).length > 0,
    "ordinateur — la page rend un titre d'étape",
    await page.textContent("h1")
  );
  check(
    (await page.locator("text=Replay de démo").count()) > 0,
    "ordinateur — le rejeu est identifié « Replay de démo »"
  );
  check(
    (await page.locator("nav[aria-label='Étapes du parcours'] button").count()) === 6,
    "ordinateur — les six étapes sont présentes"
  );

  // Étape 1 : la vidéo source joue réellement.
  await page.waitForSelector("video", { state: "attached" });
  const play1 = await playedFor(page, 0);
  check(play1.advanced, "ordinateur — la vidéo du live avance", `t ${play1.before.toFixed(2)} → ${play1.after.toFixed(2)}`);

  const overflow1 = await noHorizontalOverflow(page);
  check(overflow1.overflow <= 1, "ordinateur — aucun débordement horizontal (étape 1)", `${overflow1.overflow}px ${overflow1.wide.join(", ")}`);

  await page.screenshot({ path: path.join(SHOTS, "desktop-1-live.png") });

  // Parcours des six étapes au clavier.
  for (let i = 2; i <= 6; i += 1) {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(900);
    const current = await page.getAttribute("nav[aria-label='Étapes du parcours'] button[aria-current='step'] span", "textContent").catch(() => null);
    const label = await page.locator("nav[aria-label='Étapes du parcours'] button[aria-current='step'] span").innerText();
    check(Boolean(label), `ordinateur — étape ${i} atteinte au clavier`, label || current || "");
    const o = await noHorizontalOverflow(page);
    check(o.overflow <= 1, `ordinateur — aucun débordement horizontal (étape ${i})`, `${o.overflow}px ${o.wide.join(", ")}`);
    await page.screenshot({ path: path.join(SHOTS, `desktop-${i}-${label.toLowerCase().replace(/[^a-z]+/g, "-")}.png`) });
  }

  // Étape 3 : comparaison brut / vertical, deux lecteurs.
  await page.keyboard.press("Home");
  await page.waitForTimeout(400);
  await page.locator("nav[aria-label='Étapes du parcours'] button").nth(2).click();
  await page.waitForTimeout(1200);
  const players = await page.locator("video").count();
  check(players === 2, "ordinateur — la comparaison affiche deux lecteurs", `${players} lecteur(s)`);
  const playVertical = await playedFor(page, 1);
  check(playVertical.advanced, "ordinateur — le montage vertical joue", `t ${playVertical.before.toFixed(2)} → ${playVertical.after.toFixed(2)}`);

  // Le bandeau de sous-titres suit le mot actif.
  const activeWord = await page.locator("p[class*='wordTrack'] span[class*='wordOn']").count();
  check(activeWord >= 1, "ordinateur — le mot actif des sous-titres est mis en avant", `${activeWord} mot(s)`);

  // Pause et reprise.
  await page.keyboard.press("Space");
  await page.waitForTimeout(700);
  const paused = await page.$eval("video", (v) => v.paused);
  check(paused, "ordinateur — l'espace met le rejeu en pause");
  await page.keyboard.press("Space");
  await page.waitForTimeout(700);
  const resumed = await page.$eval("video", (v) => !v.paused);
  check(resumed, "ordinateur — l'espace relance le rejeu");

  // Retour au début.
  await page.keyboard.press("Home");
  await page.waitForTimeout(600);
  const backToOne = await page.locator("nav[aria-label='Étapes du parcours'] button[aria-current='step'] b").innerText();
  check(backToOne === "1", "ordinateur — le retour au début ramène à l'étape 1", backToOne);

  // Aucune interaction ne déclenche d'écriture.
  const clickables = await page.locator("button:visible").count();
  for (let i = 0; i < clickables; i += 1) {
    const button = page.locator("button:visible").nth(i);
    if ((await button.count()) === 0) continue;
    await button.click({ timeout: 2000 }).catch(() => undefined);
    await page.waitForTimeout(120);
  }
  check(traffic.writes.length === 0, "ordinateur — aucune requête d'écriture (POST/PUT/DELETE)", traffic.writes.join(" | "));
  check(traffic.outbound.length === 0, "ordinateur — aucune requête hors du serveur de démo", traffic.outbound.slice(0, 3).join(" | "));

  // Aucun lien mailto, aucun formulaire.
  const mailto = await page.locator("a[href^='mailto:']").count();
  const forms = await page.locator("form").count();
  check(mailto === 0 && forms === 0, "ordinateur — aucun mailto, aucun formulaire", `${mailto} mailto, ${forms} formulaire(s)`);

  // Les liens externes sont sûrs et publics.
  const externals = await page.$$eval("a[href^='http']", (as) =>
    as.map((a) => ({ href: a.href, target: a.target, rel: a.rel }))
  );
  check(
    externals.every((a) => a.href.startsWith("https://www.tiktok.com/@")),
    "ordinateur — les seuls liens externes sont des publications TikTok publiques",
    externals.map((a) => a.href).join(" | ")
  );
  check(
    externals.every((a) => a.target === "_blank" && a.rel.includes("noopener")),
    "ordinateur — les liens externes portent rel=noopener"
  );

  // PWA : manifeste et service worker.
  const manifestHref = await page.getAttribute("link[rel='manifest']", "href");
  check(manifestHref === "/sentinelle-demo.webmanifest", "ordinateur — le manifeste de la démo est déclaré", String(manifestHref));
  const manifest = await (await context.request.get(`${BASE}${manifestHref}`)).json();
  check(manifest.scope === "/sentinelle/demo", "ordinateur — la portée du manifeste est /sentinelle/demo", manifest.scope);
  check(manifest.icons.length >= 3, "ordinateur — le manifeste déclare ses icônes", `${manifest.icons.length} icônes`);

  const swReady = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return "absent";
    const reg = await navigator.serviceWorker.getRegistration("/sentinelle/demo");
    return reg ? reg.scope : "non enregistré";
  });
  check(swReady.includes("/sentinelle/demo"), "ordinateur — le service worker couvre /sentinelle/demo", swReady);

  // Hors connexion : la coquille et les médias reviennent du cache.
  await page.waitForTimeout(2500);
  const cached = await page.evaluate(async () => {
    const cache = await caches.open("sentinelle-demo-v1");
    const keys = await cache.keys();
    return keys.map((r) => new URL(r.url).pathname);
  });
  check(
    cached.includes("/sentinelle-demo/media/hero-vertical.mp4"),
    "ordinateur — le montage vertical est en cache hors connexion",
    `${cached.length} entrées`
  );
  check(
    !cached.some((p) => p.startsWith("/api/")),
    "ordinateur — aucune API authentifiée en cache",
    cached.filter((p) => p.startsWith("/api/")).join(", ")
  );

  await context.setOffline(true);
  const offline = await page.goto(URL, { waitUntil: "domcontentloaded" }).catch(() => null);
  check(Boolean(offline && offline.ok()), "ordinateur — la démo s'ouvre hors connexion");
  await page.waitForTimeout(1500);
  const offlineVideo = await page.$eval("video", (v) => v.readyState).catch(() => 0);
  check(offlineVideo >= 2, "ordinateur — la vidéo est lisible hors connexion", `readyState ${offlineVideo}`);
  await page.screenshot({ path: path.join(SHOTS, "desktop-offline.png") });
  await context.setOffline(false);

  check(consoleErrors.length === 0, "ordinateur — aucune erreur console", consoleErrors.slice(0, 3).join(" | "));

  await context.close();
}

async function runMobile(browser) {
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    isMobile: true,
    hasTouch: true
  });
  const traffic = watchRequests(context, "mobile");
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
  page.on("pageerror", (e) => consoleErrors.push(String(e)));

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  const play = await playedFor(page, 0);
  check(play.advanced, "mobile — la vidéo joue en ligne (playsinline)", `t ${play.before.toFixed(2)} → ${play.after.toFixed(2)}`);
  const inline = await page.$eval("video", (v) => v.hasAttribute("playsinline"));
  check(inline, "mobile — l'attribut playsinline est posé");

  for (let i = 1; i <= 6; i += 1) {
    await page.locator("nav[aria-label='Étapes du parcours'] button").nth(i - 1).click();
    await page.waitForTimeout(900);
    const o = await noHorizontalOverflow(page);
    check(o.overflow <= 1, `mobile — aucun débordement horizontal (étape ${i})`, `${o.overflow}px ${o.wide.join(", ")}`);
    if (i === 1 || i === 3 || i === 6) {
      await page.screenshot({ path: path.join(SHOTS, `mobile-${i}.png`), fullPage: false });
    }
  }

  // Les commandes du transport restent atteignables au pouce.
  const transport = await page.locator("footer button").first().boundingBox();
  check(Boolean(transport && transport.height >= 32), "mobile — les commandes de transport font au moins 32 px", transport ? `${Math.round(transport.height)}px` : "absent");

  const tapTargets = await page.$$eval("footer button, nav button", (els) =>
    els.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && (r.height < 30 || r.width < 30);
    }).length
  );
  check(tapTargets === 0, "mobile — aucune cible tactile sous 30 px", `${tapTargets} trop petite(s)`);

  check(traffic.writes.length === 0, "mobile — aucune requête d'écriture", traffic.writes.join(" | "));
  check(traffic.outbound.length === 0, "mobile — aucune requête hors du serveur de démo", traffic.outbound.slice(0, 3).join(" | "));
  check(consoleErrors.length === 0, "mobile — aucune erreur console", consoleErrors.slice(0, 3).join(" | "));

  await context.close();
}

async function runIntegrity() {
  // Les chiffres affichés doivent venir du jeu de données généré.
  const data = fs.readFileSync(path.join(SITE, "app/sentinelle/demo/replay-data.ts"), "utf8");
  const manifest = JSON.parse(
    fs.readFileSync(path.join(SITE, "public/sentinelle-demo/evidence-manifest.json"), "utf8")
  );
  check(!/\[X\]|TODO|lorem|placeholder/i.test(data), "données — aucun marqueur de remplissage");
  check(
    !/access_token|refresh_token|client_secret|Bearer |tokenHash|"sig"|usher\.ttvnw/i.test(data),
    "données — aucun jeton ni secret dans le jeu de données"
  );
  const component = fs.readFileSync(path.join(SITE, "app/sentinelle/demo/DemoExperience.tsx"), "utf8");
  check(
    !/fetch\(|XMLHttpRequest|EventSource|WebSocket|mailto:/.test(component),
    "code — la démo ne contient aucun appel réseau ni mailto"
  );
  check(manifest.media.length >= 11, "preuves — le manifeste liste les médias", `${manifest.media.length}`);
  check(
    manifest.media.every((m) => fs.existsSync(path.join(SITE, "public", m.file))),
    "preuves — tous les médias listés existent"
  );
  check(manifest.counts.published === 8, "preuves — huit publications enregistrées", String(manifest.counts.published));
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  try {
    await runIntegrity();
    await runDesktop(browser);
    await runMobile(browser);
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.pass);
  for (const r of results) {
    console.log(`${r.pass ? "✔" : "✘"} ${r.name}${r.detail ? `  — ${r.detail}` : ""}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} vérifications passées.`);
  console.log(`Captures : ${SHOTS}`);
  if (failed.length) process.exitCode = 1;
}

main();
