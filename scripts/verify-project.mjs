import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const dryRun = process.argv.includes("--dry-run");

const buildCheck = isWindows
  ? {
      name: "production build",
      command: process.env.ComSpec ?? "cmd.exe",
      args: ["/d", "/s", "/c", "npm.cmd run build"],
    }
  : {
      name: "production build",
      command: "npm",
      args: ["run", "build"],
    };

const checks = [
  buildCheck,
  {
    name: "smoke preview port-collision regression",
    command: process.execPath,
    args: ["scripts/test-smoke-port-collision.mjs"],
  },
  {
    name: "desktop and mobile browser smoke",
    command: process.execPath,
    args: ["scripts/smoke-game.mjs"],
  },
];

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: false,
    });

    child.once("error", (error) => {
      console.error(`Unable to start ${command}: ${error.message}`);
      resolve(2);
    });

    child.once("exit", (code, signal) => {
      if (signal) {
        console.error(`${command} stopped by signal ${signal}.`);
        resolve(1);
        return;
      }
      resolve(code ?? 1);
    });
  });
}

console.log("Test Subject 01 project verifier");
console.log("This verifier is non-destructive and does not deploy or call paid services.");

if (dryRun) {
  console.log("DRY RUN: planned checks");
  for (const check of checks) {
    console.log(`- ${check.name}: ${check.command} ${check.args.join(" ")}`);
  }
  console.log("VERIFY RESULT: NOT ASSESSED (dry run is not verification evidence)");
  process.exitCode = 2;
} else {
  for (const check of checks) {
    console.log(`\nRunning ${check.name}...`);
    const exitCode = await run(check.command, check.args);
    if (exitCode === 0) continue;

    const result = exitCode === 2 ? "NOT ASSESSED" : "FAIL";
    console.error(`VERIFY RESULT: ${result} (${check.name})`);
    process.exitCode = exitCode === 2 ? 2 : 1;
    break;
  }

  if (!process.exitCode) {
    console.log("VERIFY RESULT: PASS");
  }
}
