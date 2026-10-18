import { createServer } from "node:net";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const basePath = "/test-subject-01/";
const viteCli = path.join(root, "node_modules", "vite", "bin", "vite.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function findAvailablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

function spawnVite(port) {
  return spawn(
    process.execPath,
    [viteCli, "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort", "--base", basePath],
    { cwd: root, stdio: ["ignore", "pipe", "pipe"], shell: false },
  );
}

async function waitForOwnedPreview(server, port, getOutput) {
  const url = `http://127.0.0.1:${port}${basePath}`;
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    assert(
      server.exitCode === null && server.signalCode === null,
      `Fixture preview exited early: ${getOutput()}`,
    );
    const outputWithoutAnsi = getOutput().replace(/\u001b\[[0-9;]*m/g, "");
    if (outputWithoutAnsi.includes(url)) {
      const response = await fetch(url);
      if (response.ok) return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out starting fixture preview: ${getOutput()}`);
}

const port = await findAvailablePort();
const fixture = spawnVite(port);
let fixtureOutput = "";
fixture.stdout.on("data", (chunk) => { fixtureOutput += chunk; });
fixture.stderr.on("data", (chunk) => { fixtureOutput += chunk; });

try {
  await waitForOwnedPreview(fixture, port, () => fixtureOutput);
  const smoke = spawn(process.execPath, ["scripts/smoke-game.mjs"], {
    cwd: root,
    env: { ...process.env, TEST_SUBJECT_SMOKE_PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });
  let smokeOutput = "";
  smoke.stdout.on("data", (chunk) => { smokeOutput += chunk; });
  smoke.stderr.on("data", (chunk) => { smokeOutput += chunk; });
  const exitCode = await new Promise((resolve, reject) => {
    smoke.once("error", reject);
    smoke.once("exit", (code, signal) => resolve(signal ? 1 : (code ?? 1)));
  });

  assert(exitCode !== 0, "Smoke verification incorrectly passed using a preview it did not start.");
  assert(
    /already in use|preview exited before the smoke check started/i.test(smokeOutput),
    `Smoke verification failed for an unexpected reason:\n${smokeOutput}`,
  );
  console.log("Occupied-port regression passed: smoke verification rejects a preview it did not start.");
} finally {
  if (fixture.exitCode === null) fixture.kill();
  if (fixture.exitCode === null) {
    await new Promise((resolve) => fixture.once("exit", resolve));
  }
}
