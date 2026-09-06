import { chromium, devices } from "playwright";
import fs from "node:fs";
import assert from "node:assert/strict";

const base = process.env.STUDIO_BASE || "http://127.0.0.1:4311";
const key = fs.readFileSync("/home/ubuntu/luciamuccia/.data/sentinelle-auto/factory-access.key", "utf8").trim();
const runId = "run-mtq868te-d0b216";
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
try {
  for (const [name, options] of [["desktop", { viewport: { width: 1440, height: 1000 } }], ["mobile", { ...devices["iPhone 13"], defaultBrowserType: undefined }]]) {
    const context = await browser.newContext(options);
    const login = await context.request.post(`${base}/api/factory/session`, { data: { key } });
    assert.equal(login.status(), 200);
    if (base.startsWith("http:")) {
      const cookie = login.headers()["set-cookie"].split(";")[0];
      await context.addCookies([{ name: cookie.split("=")[0], value: cookie.slice(cookie.indexOf("=") + 1), url: base, httpOnly: true, sameSite: "Lax" }]);
    }
    const page = await context.newPage();
    const errors = []; page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript((id) => localStorage.setItem("sentinelle.factory.run", id), runId);
    await page.goto(`${base}/sentinelle/factory`, { waitUntil: "networkidle" });
    const tracker = page.getByRole("region", { name: "Suivi des publications TikTok" });
    await tracker.waitFor();
    assert.equal(await tracker.getByRole("progressbar").getAttribute("aria-valuenow"), "3");
    assert.equal(await tracker.getByRole("link").count(), 3);
    await page.getByRole("button", { name: "Actualité", exact: true }).click();
    assert.equal(await page.getByRole("combobox", { name: "Source vidéo" }).inputValue(), "");
    await page.getByRole("combobox", { name: "Nombre de vidéos" }).selectOption("1");
    assert.ok(await page.getByRole("button", { name: "Créer 1 vidéo", exact: true }).isEnabled());
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `review-assets/sentinelle-factory/${name}-publication-v3.png`, fullPage: true });
    // UI-only fixture: prove that a pending post never becomes a success or a fabricated link.
    const actual = await (await context.request.get(`${base}/api/factory/runs/${runId}`)).json();
    const fixture = structuredClone(actual); fixture.run.status = "processing";
    fixture.run.clips.forEach((c) => { c.status = "traitement"; c.postUrl = ""; c.tiktokStatus = "PROCESSING_DOWNLOAD"; });
    await page.route(`**/api/factory/runs/${runId}`, (route) => route.fulfill({ json: fixture }));
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => document.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow") === "0");
    assert.equal(await tracker.getByRole("link").count(), 0);
    assert.equal(await tracker.getByText("TikTok récupère la vidéo", { exact: true }).count(), 3);
    assert.deepEqual(errors, []);
    console.log(`${name}: real published links, pending-state fixture, modes/count, no overflow or JS errors; no publication triggered`);
    await context.close();
  }
} finally { await browser.close(); }
