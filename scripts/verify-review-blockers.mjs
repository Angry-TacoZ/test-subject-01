import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const root = process.cwd();
const port = 4187;
const basePath = "/";
const url = `http://127.0.0.1:${port}${basePath}`;
const outputDirectory = path.join(root, "output", "playwright", "review-blockers");
const viteCli = path.join(root, "node_modules", "vite", "bin", "vite.js");
const preview = spawn(
  process.execPath,
  [viteCli, "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: root, stdio: ["ignore", "pipe", "pipe"], shell: false },
);
let previewOutput = "";
preview.stdout.on("data", (chunk) => { previewOutput += chunk; });
preview.stderr.on("data", (chunk) => { previewOutput += chunk; });

const errors = [];
const readState = async (page) => JSON.parse(await page.evaluate(() => window.render_game_to_text()));
const step = (page, ms) => page.evaluate((duration) => window.advanceTime(duration), ms);
const normalize = (x, y) => {
  const length = Math.hypot(x, y);
  return { x: x / length, y: y / length };
};
const assertNear = (actual, expected, tolerance, message) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: got ${actual}, expected ${expected} ±${tolerance}`);
};

async function waitForPreview() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (preview.exitCode !== null) throw new Error("Vite preview exited before the regression checks started.");
    if (previewOutput.includes(`Port ${port} is already in use`)) {
      throw new Error(`The dedicated preview port ${port} is already in use.`);
    }
    if (!previewOutput.includes("Local:")) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      continue;
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Preview is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out waiting for ${url}.`);
}

async function startLevel(page) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /start/i }).click();
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).mode === "level");
}

async function assertCentered(page, label) {
  const state = await readState(page);
  const viewport = state.level.worldMap.viewportArena;
  const scroll = state.level.worldMap.cameraScroll;
  const screen = {
    x: state.level.player.x - scroll.x + viewport.x,
    y: state.level.player.y - scroll.y + viewport.y,
  };
  assertNear(screen.x, viewport.x + viewport.width / 2, 1, `${label} player center X`);
  assertNear(screen.y, viewport.y + viewport.height / 2, 1, `${label} player center Y`);
  return state;
}

async function assertDamageClip(page, label) {
  const measurement = await page.evaluate(() => {
    const state = JSON.parse(window.render_game_to_text());
    const layer = document.querySelector("#damage-number-layer");
    const clip = layer.getBoundingClientRect();
    const canvas = document.querySelector("#game-canvas canvas").getBoundingClientRect();
    const viewport = state.level.worldMap.viewportArena;
    const hud = document.querySelector("#level-hud").getBoundingClientRect();
    return {
      state,
      overflow: getComputedStyle(layer).overflow,
      clip: { left: clip.left, top: clip.top, width: clip.width, height: clip.height },
      expected: {
        left: canvas.left + viewport.x,
        top: canvas.top + viewport.y,
        width: viewport.width,
        height: viewport.height,
      },
      hudBottom: hud.bottom,
      rendered: [...layer.querySelectorAll(".damage-number")].map((element) => {
        const rect = element.getBoundingClientRect();
        return { text: element.textContent, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }),
    };
  });
  assert.equal(measurement.overflow, "hidden", `${label} damage layer must clip overflow`);
  for (const key of ["left", "top", "width", "height"]) {
    assertNear(measurement.clip[key], measurement.expected[key], 1, `${label} clip ${key}`);
  }
  assert.ok(measurement.clip.top >= measurement.hudBottom, `${label} clip overlaps the HUD`);
  const scroll = measurement.state.level.worldMap.cameraScroll;
  for (const [index, number] of measurement.state.level.damageNumbers.entries()) {
    const actual = measurement.rendered[index];
    assert.equal(actual?.text, number.text, `${label} rendered damage label ${number.text}`);
    assertNear(actual.x, measurement.expected.left + number.x - scroll.x, 1, `${label} ${number.text} projected X`);
    assertNear(actual.y, measurement.expected.top + number.y - scroll.y, 1, `${label} ${number.text} projected Y`);
  }
  return measurement;
}

async function runDesktop(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await startLevel(page);
  let state = await assertCentered(page, "Desktop initial camera");
  await page.evaluate(() => window.__testSubject01.clearEnemies());

  state = await readState(page);
  const viewport = state.level.worldMap.viewportArena;
  const startPlayerScreenX = viewport.x + viewport.width - 84;
  const startPlayerScreenY = viewport.y + viewport.height / 2;
  await page.evaluate(({ x, y }) => {
    const state = JSON.parse(window.render_game_to_text());
    const viewport = state.level.worldMap.viewportArena;
    const scroll = state.level.worldMap.cameraScroll;
    window.__testSubject01.setPlayerPosition(x - viewport.x + scroll.x, y - viewport.y + scroll.y);
    window.advanceTime(17);
  }, { x: startPlayerScreenX, y: startPlayerScreenY });

  state = await readState(page);
  const fixedCursor = {
    x: state.level.worldMap.viewportArena.x + state.level.worldMap.viewportArena.width * 0.48,
    y: state.level.worldMap.viewportArena.y + state.level.worldMap.viewportArena.height * 0.28,
  };
  await page.mouse.move(fixedCursor.x, fixedCursor.y);
  await step(page, 17);
  const beforeScroll = await readState(page);
  const startingAim = beforeScroll.level.weapon.aimDirection;
  await page.keyboard.down("ArrowRight");
  await step(page, 1000);
  await page.keyboard.up("ArrowRight");
  const afterScroll = await readState(page);
  assert.ok(afterScroll.level.worldMap.cameraScroll.x > beforeScroll.level.worldMap.cameraScroll.x + 10, "Stationary mouse scenario did not scroll the camera");
  assertNear(afterScroll.level.mouseAim.screen.x, fixedCursor.x, 1, "Stationary mouse screen X");
  assertNear(afterScroll.level.mouseAim.screen.y, fixedCursor.y, 1, "Stationary mouse screen Y");
  assert.ok(Math.abs(afterScroll.level.mouseAim.world.x - beforeScroll.level.mouseAim.world.x) > 10, "Mouse world target did not move with camera scroll");
  assertNear(
    afterScroll.level.mouseAim.world.x - beforeScroll.level.mouseAim.world.x,
    afterScroll.level.worldMap.cameraScroll.x - beforeScroll.level.worldMap.cameraScroll.x,
    1,
    "Mouse world target must follow camera scroll",
  );
  const currentAim = normalize(
    afterScroll.level.mouseAim.world.x - afterScroll.level.player.x,
    afterScroll.level.mouseAim.world.y - afterScroll.level.player.y,
  );
  assertNear(afterScroll.level.weapon.aimDirection.x, currentAim.x, 0.002, "Updated aim direction X");
  assertNear(afterScroll.level.weapon.aimDirection.y, currentAim.y, 0.002, "Updated aim direction Y");
  assert.ok(Math.hypot(currentAim.x - startingAim.x, currentAim.y - startingAim.y) > 0.01, "Aim direction did not update after camera movement");

  await page.keyboard.down("Space");
  await step(page, 17);
  await page.keyboard.up("Space");
  state = await readState(page);
  const projectile = state.level.weapon.projectiles.at(-1);
  assert.ok(projectile, "Could not fire after moving the camera with the mouse stationary");
  const firedAim = normalize(projectile.vx, projectile.vy);
  const currentTargetAim = normalize(
    state.level.mouseAim.world.x - state.level.player.x,
    state.level.mouseAim.world.y - state.level.player.y,
  );
  assertNear(firedAim.x, currentTargetAim.x, 0.002, "Projectile direction X from current cursor target");
  assertNear(firedAim.y, currentTargetAim.y, 0.002, "Projectile direction Y from current cursor target");
  await page.screenshot({ path: path.join(outputDirectory, "stationary-mouse-aim-desktop.png"), fullPage: true });

  state = await readState(page);
  const arena = state.level.worldMap.viewportArena;
  const scroll = state.level.worldMap.cameraScroll;
  await page.evaluate(({ scroll, arena }) => {
    window.__testSubject01.spawnDamageNumber(scroll.x + arena.width / 2, scroll.y + arena.y + 20, 1, "enemy");
    window.__testSubject01.spawnDamageNumber(scroll.x + arena.width * 0.35 + 24, scroll.y + arena.y - 20, 2, "player");
    for (const [x, y] of [
      [4, 4], [arena.width - 4, 4],
      [arena.width - 4, arena.height - 4], [4, arena.height - 4],
    ]) {
      window.__testSubject01.spawnDamageNumber(scroll.x + x, scroll.y + arena.y + y + 16, 3, "enemy", true);
    }
  }, { scroll, arena });
  let damage = await assertDamageClip(page, "Desktop gameplay viewport");
  assert.ok(damage.rendered.some((number) => number.text === "-1"), "Outgoing top-edge label missing");
  assert.ok(damage.rendered.some((number) => number.text === "-2"), "Player-damage top-edge label missing");
  assert.ok(damage.rendered.filter((number) => number.text === "CRIT 3").length >= 4, "Critical labels missing from one or more viewport edges");
  await page.screenshot({ path: path.join(outputDirectory, "damage-number-viewport-desktop.png"), fullPage: true });

  await page.evaluate(({ x, y }) => window.__testSubject01.setPlayerPosition(x, y), {
    x: state.level.arena.x + state.level.arena.width - 80,
    y: state.level.arena.y + state.level.arena.height - 80,
  });
  const cameraBefore = (await readState(page)).level.worldMap.cameraScroll;
  await step(page, 180);
  state = await readState(page);
  assert.ok(state.level.worldMap.cameraScroll.x > cameraBefore.x + 10, "Camera did not scroll while damage labels were alive");
  assert.ok(state.level.worldMap.cameraScroll.y > cameraBefore.y + 10, "Camera did not scroll vertically while damage labels were alive");
  await assertDamageClip(page, "Desktop after camera scroll");
  await page.locator("#level-options-button").click();
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(80);
  state = await readState(page);
  assert.ok(state.level.damageNumbers.length > 0, "Damage labels expired before desktop resize check");
  damage = await assertDamageClip(page, "Desktop resize with live labels");
  await page.screenshot({ path: path.join(outputDirectory, "damage-number-viewport-resized.png"), fullPage: true });
  await page.close();
  return { fixedCursor, cameraScrollDelta: afterScroll.level.worldMap.cameraScroll.x - beforeScroll.level.worldMap.cameraScroll.x, mouseAimDirection: currentAim, firedAim, desktopClip: damage.clip };
}

async function runPhone(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on("console", (message) => { if (message.type() === "error") errors.push(`phone: ${message.text()}`); });
  page.on("pageerror", (error) => errors.push(`phone: ${error.message}`));
  await startLevel(page);
  const state = await assertCentered(page, "Phone initial camera");
  const arena = state.level.worldMap.viewportArena;
  const scroll = state.level.worldMap.cameraScroll;
  await page.evaluate(({ arena, scroll }) => {
    window.__testSubject01.spawnDamageNumber(scroll.x + arena.width / 2, scroll.y + arena.y + 20, 1, "enemy");
    window.__testSubject01.spawnDamageNumber(scroll.x + arena.width / 2 + 24, scroll.y + arena.y - 20, 2, "player");
    window.__testSubject01.spawnDamageNumber(scroll.x + arena.width - 4, scroll.y + arena.y + arena.height - 4 + 16, 4, "enemy", true);
  }, { arena, scroll });
  let damage = await assertDamageClip(page, "Phone gameplay viewport");
  assert.ok(damage.rendered.some((number) => number.text === "-1"), "Phone outgoing top-edge label missing");
  assert.ok(damage.rendered.some((number) => number.text === "-2"), "Phone player-damage top-edge label missing");
  await page.screenshot({ path: path.join(outputDirectory, "damage-number-viewport-phone.png"), fullPage: true });
  await page.locator("#mobile-fullscreen-button").tap();
  await page.waitForFunction(() => document.fullscreenElement?.id === "game-shell");
  await page.waitForTimeout(100);
  damage = await assertDamageClip(page, "Phone fullscreen with live labels");
  await page.screenshot({ path: path.join(outputDirectory, "damage-number-viewport-phone-fullscreen.png"), fullPage: true });
  await context.close();
  return { viewportCenter: { x: arena.x + arena.width / 2, y: arena.y + arena.height / 2 }, phoneFullscreenClip: damage.clip };
}

await mkdir(outputDirectory, { recursive: true });
try {
  await waitForPreview();
  const browser = await chromium.launch();
  try {
    const desktop = await runDesktop(browser);
    const phone = await runPhone(browser);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ desktop, phone, errors }, null, 2));
  } finally {
    await browser.close();
  }
} catch (error) {
  console.error(`Review-blocker regression failed: ${error instanceof Error ? error.message : String(error)}`);
  if (previewOutput.trim()) console.error(previewOutput.trim());
  process.exitCode = 1;
} finally {
  if (!preview.killed) preview.kill();
}
