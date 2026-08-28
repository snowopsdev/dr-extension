import { spawn, execFileSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const chrome =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 19222 + Math.floor(Math.random() * 1000);
const userData = mkdtempSync(join(tmpdir(), "dr-ext-prove-"));
const pyPath = join(userData, "prove.py");

writeFileSync(
  pyPath,
  `
import json, urllib.request, asyncio, websockets, sys

ROOT = ${JSON.stringify(root)}
PORT = ${port}

async def main():
    ver = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/version"))
    async with websockets.connect(ver["webSocketDebuggerUrl"]) as ws:
        async def call(method, params=None, id=1):
            await ws.send(json.dumps({"id": id, "method": method, "params": params or {}}))
            while True:
                resp = json.loads(await ws.recv())
                if resp.get("id") == id:
                    return resp
        loaded = await call("Extensions.loadUnpacked", {"path": ROOT})
        if "error" in loaded:
            print(loaded)
            sys.exit(1)
        eid = loaded["result"]["id"]
        await call("Target.createTarget", {"url": f"chrome-extension://{eid}/popup.html"}, id=2)
        await asyncio.sleep(1.5)
        targets = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/list"))
        popup = next(t for t in targets if t.get("url", "").endswith("/popup.html"))
        async with websockets.connect(popup["webSocketDebuggerUrl"]) as pws:
            async def pcall(method, params=None, id=1):
                await pws.send(json.dumps({"id": id, "method": method, "params": params or {}}))
                while True:
                    resp = json.loads(await pws.recv())
                    if resp.get("id") == id:
                        return resp
            await pcall("Runtime.enable")
            await asyncio.sleep(1)
            dom = await pcall(
                "Runtime.evaluate",
                {
                    "expression": "({title:document.title, brand:document.querySelector('.brand-name')?.textContent, panel:(document.querySelector('#panel')?.innerText||'')})",
                    "returnByValue": True,
                },
                id=2,
            )
            value = dom["result"]["result"]["value"]
            print(json.dumps(value))
            assert value["title"] == "Domain Rating Lookup"
            assert value["brand"] == "Domain Rating Lookup"
            assert "API key" in value["panel"]
            print("prove-extension: ok")

asyncio.run(main())
`,
);

const child = spawn(
  chrome,
  [
    `--user-data-dir=${userData}`,
    "--disable-gpu",
    "--no-first-run",
    `--remote-debugging-port=${port}`,
    "--enable-unsafe-extension-debugging",
    "about:blank",
  ],
  { stdio: "ignore" },
);

try {
  await sleep(3500);
  execFileSync("python3", [pyPath], { stdio: "inherit" });
} finally {
  child.kill("SIGTERM");
  await sleep(400);
  try {
    child.kill("SIGKILL");
  } catch {
    // process already exited
  }
  rmSync(userData, { recursive: true, force: true });
}
