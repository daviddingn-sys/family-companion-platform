import { spawn, spawnSync } from "node:child_process";

const port = String(4300 + Math.floor(Math.random() * 1000));
const baseUrl = `http://localhost:${port}`;
const isWindows = process.platform === "win32";
const command = isWindows ? "cmd.exe" : "pnpm";
const args = isWindows
  ? ["/d", "/s", "/c", `pnpm exec next dev --port ${port}`]
  : ["exec", "next", "dev", "--port", port];
const childEnv = { ...process.env };
delete childEnv.NEXT_PUBLIC_SUPABASE_URL;
delete childEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
delete childEnv.SUPABASE_SERVICE_ROLE_KEY;
delete childEnv.DATABASE_URL;

const child = spawn(command, args, {
  env: childEnv,
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
let settled = false;
const timeout = setTimeout(() => fail("Timed out waiting for local dev server."), 45_000);

child.stdout.on("data", (chunk) => {
  output += chunk.toString();
});

child.stderr.on("data", (chunk) => {
  output += chunk.toString();
});

child.on("exit", (code) => {
  if (!settled) {
    fail(`Dev server exited early with code ${code}.\n${output}`);
  }
});

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/login`);
      const html = await response.text();
      if (response.status === 200 && html.includes("需要配置 Supabase")) {
        pass();
        return;
      }
      if (response.status >= 500) {
        fail(`/login returned ${response.status}.\n${html.slice(0, 500)}`);
        return;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  fail(`Server did not return expected setup notice.\n${output}`);
}

function pass() {
  settled = true;
  clearTimeout(timeout);
  stopChild();
  console.log(`Auth config fallback verified at ${baseUrl}/login`);
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

waitForServer();
