import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const srcRoot = join(root, "src");

const forbiddenPathParts = [
  "companion",
  "ai-summary",
];

const forbiddenSourcePatterns = [
  { pattern: /吾伴/g, reason: "吾伴 AI 小程序是学生端，当前 Web 主工程不接入" },
  { pattern: /AI\s*健康总结/g, reason: "AI 健康总结属于后续阶段，当前 Web 端不开放入口" },
  { pattern: /ai-summary/g, reason: "AI 健康总结 API 属于后续阶段" },
  { pattern: /generateAiHealthSummary/g, reason: "AI 健康总结逻辑属于后续阶段" },
];

const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const violations = [];

function extensionOf(path) {
  const match = /\.[^.]+$/.exec(path);
  return match?.[0] ?? "";
}

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walk(fullPath);
      continue;
    }

    const relPath = relative(root, fullPath).replaceAll("\\", "/");
    for (const part of forbiddenPathParts) {
      if (relPath.toLowerCase().includes(part)) {
        violations.push(`${relPath}: forbidden current-phase path segment "${part}"`);
      }
    }

    if (!sourceExtensions.has(extensionOf(fullPath))) continue;

    const content = readFileSync(fullPath, "utf8");
    for (const { pattern, reason } of forbiddenSourcePatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(content)) {
        violations.push(`${relPath}: ${reason}`);
      }
    }
  }
}

walk(srcRoot);

if (violations.length > 0) {
  console.error("Product boundary verification failed:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("Product boundaries verified for current Web phase.");
