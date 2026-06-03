import { spawn, spawnSync } from "node:child_process";

const port = String(4400 + Math.floor(Math.random() * 1000));
const baseUrl = `http://localhost:${port}`;
const isWindows = process.platform === "win32";
const command = isWindows ? "cmd.exe" : "pnpm";
const args = isWindows
  ? ["/d", "/s", "/c", `pnpm exec next start --port ${port}`]
  : ["exec", "next", "start", "--port", port];

const child = spawn(command, args, {
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
let settled = false;
const timeout = setTimeout(() => fail("Timed out waiting for production server."), 45_000);

child.stdout.on("data", (chunk) => {
  output += chunk.toString();
});

child.stderr.on("data", (chunk) => {
  output += chunk.toString();
});

child.on("exit", (code) => {
  if (!settled) {
    fail(`Production server exited early with code ${code}.\n${output}`);
  }
});

async function waitForHealth() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      const payload = await response.json();
      if (response.ok && payload.ok === true && payload.status === "ready") {
        pass();
        return;
      }
      if (response.status >= 500) {
        fail(`/api/health returned ${response.status}.\n${JSON.stringify(payload, null, 2)}`);
        return;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  fail(`Server did not return ready health status.\n${output}`);
}

function pass() {
  settled = true;
  clearTimeout(timeout);
  stopChild();
  console.log(`Production health verified at ${baseUrl}/api/health`);
  process.exit(0);
}

function fail(message) {
  settled = true;
  clearTimeout(timeout);
  stopChild();
  console.error(message);
  process.exit(1);
}

function stopChild() {
  if (isWindows) {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }

  child.kill();
}

waitForHealth();
