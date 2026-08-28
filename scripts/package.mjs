import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const stage = join(dist, "extension");
const zipPath = join(dist, "domain-rating-lookup.zip");

rmSync(dist, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });

const include = [
  "manifest.json",
  "background.js",
  "popup.html",
  "popup.css",
  "popup.js",
  "options.html",
  "options.css",
  "options.js",
  "lib",
  "icons",
];

for (const name of include) {
  const from = join(root, name);
  const to = join(stage, name);
  if (!existsSync(from)) {
    throw new Error(`missing ${name}`);
  }
  cpSync(from, to, { recursive: true });
}

execFileSync("zip", ["-r", "-q", zipPath, "."], { cwd: stage });
console.log(`package: ${zipPath}`);
