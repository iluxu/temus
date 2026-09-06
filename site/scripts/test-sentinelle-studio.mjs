import { chromium, devices } from "playwright";
import fs from "node:fs";
import assert from "node:assert/strict";

const base = process.env.STUDIO_BASE || "http://127.0.0.1:4311";
const key = fs.readFileSync("/home/ubuntu/luciamuccia/.data/sentinelle-auto/factory-access.key", "utf8").trim();
const output = new URL("../review-assets/sentinelle-factory/", import.meta.url).pathname;
fs.mkdirSync(output, { recursive: true });
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
    if (process.env.STUDIO_RUN_ID) await page.addInitScript((id) => localStorage.setItem("sentinelle.factory.run", id), process.env.STUDIO_RUN_ID);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${base}/sentinelle/factory`, { waitUntil: "networkidle" });
    await page.getByText("Studio connecté", { exact: true }).waitFor({ state: "attached" });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.ok(await page.getByRole("button", { name: "Connecter TikTok", exact: true }).isEnabled());
    await page.screenshot({ path: `${output}${name}-studio-v2.png`, fullPage: true });
    if (process.env.STUDIO_RUN_ID) {
      await page.waitForFunction(() => document.querySelectorAll("article video").length === 3);
      const video = page.locator("article video").first();
      await video.evaluate((el) => el.play());
      await page.waitForTimeout(1500);
      const state = await video.evaluate((el) => {
        const canvas = document.createElement("canvas"); canvas.width = 16; canvas.height = 16;
        canvas.getContext("2d").drawImage(el, 0, 0, 16, 16);
        return { time: el.currentTime, width: el.videoWidth, height: el.videoHeight, ready: el.readyState };
      });
      assert.ok(state.time > 0); assert.equal(state.width, 1080); assert.equal(state.height, 1920);
      assert.equal(await page.getByRole("button", { name: /Publier la sélection/ }).isDisabled(), true);
      assert.equal(await page.getByRole("combobox", { name: "Confidentialité TikTok" }).inputValue(), "");
      await page.screenshot({ path: `${output}${name}-clips-v2.png`, fullPage: true });
      console.log(`${name}: 3 real MP4 previews, playback verified; publish blocked without OAuth/consent`);
    }
    await page.getByRole("button", { name: "Réseau", exact: true }).click();
    await page.getByText("Comptes de diffusion", { exact: true }).waitFor();
    assert.equal(await page.getByRole("checkbox", { name: "Diffuser sur xaviernielreplays" }).isChecked(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `${output}${name}-network-v2.png`, fullPage: true });
    assert.equal(errors.length, 0, errors.join("\n"));
    console.log(`${name}: authenticated, no overflow, account state verified, no JS errors`);
    await context.close();
  }
} finally { await browser.close(); }
