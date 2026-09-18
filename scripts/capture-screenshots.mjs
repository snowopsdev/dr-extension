import { spawn, execFileSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "store", "screenshots");
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 19300 + Math.floor(Math.random() * 900);
const userData = mkdtempSync(join(tmpdir(), "dr-ext-shots-"));
mkdirSync(outDir, { recursive: true });

// Fixtures live only in this disposable profile; production UI is unchanged.
const child = spawn(chrome, [
  `--user-data-dir=${userData}`,
  "--disable-gpu",
  "--no-first-run",
  `--remote-debugging-port=${port}`,
  "--enable-unsafe-extension-debugging",
  "--host-resolver-rules=MAP api.ahrefs.com ~NOTFOUND",
  "about:blank",
], { stdio: "ignore" });

try {
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) { ready = true; break; }
    } catch { /* Chrome is still starting. */ }
    await sleep(200);
  }
  if (!ready) throw new Error("Chrome debugging endpoint did not become ready");
  execFileSync("python3", [join(root, "scripts", "capture-screenshots.py"), root, outDir, String(port)], { stdio: "inherit" });
} finally {
  const exited = new Promise((resolve) => child.once("exit", resolve));
  if (child.exitCode === null) {
    child.kill("SIGTERM");
    await Promise.race([exited, sleep(2000)]);
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL");
      await exited;
    }
  }
  rmSync(userData, { recursive: true, force: true });
}
