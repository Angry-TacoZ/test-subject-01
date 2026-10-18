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
    if (previewOutput.includes("ready in")) return;
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

async function runDestinationRetarget(page, inputMethod, direction, offset) {
  await startLevel(page);
  await page.evaluate(() => {
    window.__testSubject01.pauseRealtime();
    const state = JSON.parse(window.render_game_to_text());
    const viewport = state.level.worldMap.viewportArena;
    const scroll = state.level.worldMap.cameraScroll;
    window.__testSubject01.clearEnemies();
    window.__testSubject01.setSpawnElapsedMs(0);
    window.__testSubject01.setPlayerPosition(
      scroll.x + viewport.width / 2,
      scroll.y + viewport.height / 2,
    );
  });

  await page.evaluate(() => {
    window.__testSubject01.clearEnemies();
    window.__testSubject01.setSpawnElapsedMs(0);
  });

  const beforeRetarget = await readState(page);
  const arena = beforeRetarget.level.arena;
  const player = beforeRetarget.level.player;
  const requestedDestination = {
    x: clampValue(player.x + offset.x, arena.x + player.radius, arena.x + arena.width - player.radius),
    y: clampValue(player.y + offset.y, arena.y + player.radius, arena.y + arena.height - player.radius),
  };
  const position = {
    x: requestedDestination.x - beforeRetarget.level.worldMap.cameraScroll.x + beforeRetarget.level.worldMap.viewportArena.x,
    y: requestedDestination.y - beforeRetarget.level.worldMap.cameraScroll.y + beforeRetarget.level.worldMap.viewportArena.y,
  };
  const canvas = page.locator("#game-canvas canvas");
  await page.evaluate(() => {
    const canvas = document.querySelector("#game-canvas canvas");
    canvas.addEventListener("pointerdown", () => {
      canvas.dataset.retargetVelocitySeeded = String(window.__testSubject01.setPlayerVelocity(230, 0));
    }, { capture: true, once: true });
  });
  if (inputMethod === "touch") {
    await canvas.tap({ position });
  } else {
    await canvas.click({ button: "right", position });
  }

  let state = await readState(page);
  assert.ok(state.level.moveTarget, `${inputMethod} ${direction}: destination input was not accepted`);
  const velocitySeeded = await page.locator("#game-canvas canvas").getAttribute("data-retarget-velocity-seeded");
  assert.equal(velocitySeeded, "true", `${inputMethod} ${direction}: retarget input did not seed high-speed motion`);
  const inputFrameDistance = Math.hypot(
    state.level.player.x - beforeRetarget.level.player.x,
    state.level.player.y - beforeRetarget.level.player.y,
  );
  assert.ok(
    inputFrameDistance <= 10,
    `${inputMethod} ${direction}: pointer input caused a ${inputFrameDistance.toFixed(2)} px jump before the first deterministic step`,
  );
  const destination = state.level.moveTarget;
  if (direction === "reverse") {
    assert.ok(
      destination.x < beforeRetarget.level.player.x - 50,
      `${inputMethod} reverse: target was not behind the moving player`,
    );
  } else {
    assert.ok(
      destination.y > beforeRetarget.level.player.y + 50,
      `${inputMethod} sideways: target was not perpendicular to rightward motion`,
    );
    assert.ok(
      Math.abs(destination.x - beforeRetarget.level.player.x) < 50,
      `${inputMethod} sideways: target was not primarily perpendicular`,
    );
  }

  const beforeBraking = state.level.player;
  await step(page, 1000 / 60);
  state = await readState(page);
  const firstStep = Math.hypot(
    state.level.player.x - beforeBraking.x,
    state.level.player.y - beforeBraking.y,
  );
  assert.ok(
    firstStep <= 4.2,
    `${inputMethod} ${direction}: one 16.67 ms retarget step moved ${firstStep.toFixed(2)} px; expected at most 4.2 px`,
  );
  assert.ok(state.level.moveTarget, `${inputMethod} ${direction}: retarget cleared before braking/turning`);

  const trajectory = await page.evaluate(({ frameCount, destination }) => {
    let maximumFrameDistance = 0;
    for (let index = 0; index < frameCount; index += 1) {
      const before = JSON.parse(window.render_game_to_text()).level.player;
      window.advanceTime(1000 / 60);
      const after = JSON.parse(window.render_game_to_text()).level.player;
      maximumFrameDistance = Math.max(
        maximumFrameDistance,
        Math.hypot(after.x - before.x, after.y - before.y),
      );
      window.__testSubject01.clearEnemies();
      window.__testSubject01.setSpawnElapsedMs(0);
    }
    const finalState = JSON.parse(window.render_game_to_text()).level;
    return {
      maximumFrameDistance,
      player: finalState.player,
      destination,
      moveTarget: finalState.moveTarget,
      distanceFromDestination: Math.hypot(
        finalState.player.x - destination.x,
        finalState.player.y - destination.y,
      ),
    };
  }, { frameCount: 180, destination });
  assert.ok(
    trajectory.maximumFrameDistance <= 9.2,
    `${inputMethod} ${direction}: trajectory contained a ${trajectory.maximumFrameDistance.toFixed(2)} px frame jump`,
  );
  assert.equal(trajectory.moveTarget, null, `${inputMethod} ${direction}: destination did not complete`);
  assert.ok(
    trajectory.distanceFromDestination <= 1.5,
    `${inputMethod} ${direction}: player did not stop at the destination; state ${JSON.stringify(trajectory)}`,
  );
  await page.evaluate(() => window.__testSubject01.resumeRealtime());
  await page.waitForTimeout(50);
  return { inputMethod, direction, firstStep, maximumFrameDistance: trajectory.maximumFrameDistance };
}

function clampValue(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

async function runDesktop(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await startLevel(page);
  let state = await assertCentered(page, "Desktop initial camera");
  await page.evaluate(() => window.__testSubject01.clearEnemies());
  const retargetResults = [
    await runDestinationRetarget(page, "mouse", "reverse", { x: -180, y: 0 }),
    await runDestinationRetarget(page, "mouse", "sideways", { x: 0, y: 150 }),
  ];
  await page.screenshot({ path: path.join(outputDirectory, "desktop-retarget-arrival.png"), fullPage: true });

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
  await page.setViewportSize({ width: 640, height: 720 });
  await page.waitForTimeout(80);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(80);
  state = await readState(page);
  const resizedViewport = state.level.worldMap.viewportArena;
  const resizedScroll = state.level.worldMap.cameraScroll;
  const resizedPlayerScreen = {
    x: state.level.player.x - resizedScroll.x,
    y: state.level.player.y - resizedScroll.y,
  };
  assert.ok(
    resizedPlayerScreen.x >= state.level.player.radius && resizedPlayerScreen.x <= resizedViewport.width - state.level.player.radius,
    `Desktop player must remain visible immediately after a paused 640→1280 resize; screenX=${resizedPlayerScreen.x.toFixed(2)}, viewportWidth=${resizedViewport.width}`,
  );
  assert.ok(
    resizedPlayerScreen.y >= state.level.player.radius && resizedPlayerScreen.y <= resizedViewport.height - state.level.player.radius,
    `Desktop player must remain visible immediately after a paused 640→1280 resize; screenY=${resizedPlayerScreen.y.toFixed(2)}, viewportHeight=${resizedViewport.height}`,
  );
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(80);
  state = await readState(page);
  assert.ok(state.level.damageNumbers.length > 0, "Damage labels expired before desktop resize check");
  damage = await assertDamageClip(page, "Desktop resize with live labels");
  await page.screenshot({ path: path.join(outputDirectory, "damage-number-viewport-resized.png"), fullPage: true });
  await page.close();
  return { retargetResults, fixedCursor, cameraScrollDelta: afterScroll.level.worldMap.cameraScroll.x - beforeScroll.level.worldMap.cameraScroll.x, mouseAimDirection: currentAim, firedAim, desktopClip: damage.clip };
}

async function runPhone(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on("console", (message) => { if (message.type() === "error") errors.push(`phone: ${message.text()}`); });
  page.on("pageerror", (error) => errors.push(`phone: ${error.message}`));
  await startLevel(page);
  let state = await assertCentered(page, "Phone initial camera");
  const retargetResults = [
    await runDestinationRetarget(page, "touch", "reverse", { x: -140, y: 0 }),
    await runDestinationRetarget(page, "touch", "sideways", { x: 0, y: 120 }),
  ];
  await page.screenshot({ path: path.join(outputDirectory, "phone-retarget-arrival.png"), fullPage: true });
  state = await readState(page);
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
  return { retargetResults, viewportCenter: { x: arena.x + arena.width / 2, y: arena.y + arena.height / 2 }, phoneFullscreenClip: damage.clip };
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
