import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const root = process.cwd();
const port = 4173;
const basePath = "/test-subject-01/";
const url = `http://127.0.0.1:${port}${basePath}`;
const outputDirectory = path.join(root, "output", "playwright");
const viteCli = path.join(root, "node_modules", "vite", "bin", "vite.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function distance(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

async function waitForPreview(server) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error("Vite preview exited before the smoke check started.");
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The preview server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out waiting for ${url}.`);
}

async function gameState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text()));
}

async function startLevel(page) {
  await page.getByRole("button", { name: /start/i }).click();
  await page.waitForFunction(() => {
    const text = window.render_game_to_text?.();
    return text && JSON.parse(text).mode === "level";
  });
}

async function moveWithPointer(page, method) {
  const before = await gameState(page);
  assert(before.mode === "level", `${method}: expected active level state.`);
  assert(before.level?.player, `${method}: expected player telemetry.`);

  const canvas = page.locator("#game-canvas canvas");
  const box = await canvas.boundingBox();
  assert(box, `${method}: game canvas was not visible.`);

  const position = {
    x: Math.round(box.width * 0.72),
    y: Math.round(box.height * 0.68),
  };

  if (method === "desktop") {
    await canvas.click({ button: "right", position });
  } else {
    await canvas.tap({ position });
  }

  const targeted = await gameState(page);
  assert(targeted.level?.moveTarget, `${method}: destination input did not create a movement target.`);

  await page.evaluate(() => window.advanceTime(900));
  const after = await gameState(page);
  assert(after.level?.player, `${method}: player telemetry disappeared after movement.`);
  assert(
    distance(before.level.player, after.level.player) > 4,
    `${method}: player did not move after destination input.`,
  );
}

async function runScenario(browser, name, contextOptions) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForFunction(() => typeof window.render_game_to_text === "function");
    await page.getByRole("button", { name: /start/i }).waitFor();
    await startLevel(page);
    await moveWithPointer(page, name);
    await page.screenshot({ path: path.join(outputDirectory, `${name}-smoke.png`), fullPage: true });
    assert(pageErrors.length === 0, `${name}: browser errors: ${pageErrors.join(" | ")}`);
  } finally {
    await context.close();
  }
}

const preview = spawn(
  process.execPath,
  [viteCli, "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort", "--base", basePath],
  {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  },
);

let previewOutput = "";
preview.stdout.on("data", (chunk) => {
  previewOutput += chunk;
});
preview.stderr.on("data", (chunk) => {
  previewOutput += chunk;
});

try {
  await mkdir(outputDirectory, { recursive: true });
  await waitForPreview(preview);
  const browser = await chromium.launch();
  try {
    await runScenario(browser, "desktop", { viewport: { width: 1280, height: 720 } });
    await runScenario(browser, "mobile", {
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 1,
    });
  } finally {
    await browser.close();
  }

  console.log("Smoke checks passed: desktop pointer and mobile touch movement.");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const notAssessed = /executable doesn't exist|please run the following command/i.test(message);
  console.error(`Smoke checks failed: ${message}`);
  if (previewOutput.trim()) console.error(previewOutput.trim());
  process.exitCode = notAssessed ? 2 : 1;
} finally {
  if (!preview.killed) preview.kill();
}
