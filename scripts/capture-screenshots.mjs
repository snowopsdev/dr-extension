import { spawn, execFileSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "store", "screenshots");
const chrome =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 19300 + Math.floor(Math.random() * 900);
const userData = mkdtempSync(join(tmpdir(), "dr-ext-shots-"));
const pyPath = join(userData, "capture.py");
const rating = process.env.DR_DEMO_RATING || "94";
const domain = process.env.DR_DEMO_DOMAIN || "example.com";

mkdirSync(outDir, { recursive: true });

writeFileSync(
  pyPath,
  `
import base64, json, urllib.request, asyncio, websockets, sys
from pathlib import Path
from PIL import Image, ImageDraw
from io import BytesIO

ROOT = ${JSON.stringify(root)}
OUT = Path(${JSON.stringify(outDir)})
PORT = ${port}
DOMAIN = ${JSON.stringify(domain)}
RATING = ${JSON.stringify(rating)}
LICENSE = "http://ahrefs.com/legal/domain-rating-license"

async def ws_call(ws, method, params=None, id=1):
    await ws.send(json.dumps({"id": id, "method": method, "params": params or {}}))
    while True:
        resp = json.loads(await ws.recv())
        if resp.get("id") == id:
            return resp

def find_target(suffix):
    targets = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/list"))
    for t in targets:
        if t.get("url", "").endswith(suffix):
            return t
    raise RuntimeError(f"target not found: {suffix}")

async def shot_page(browser_ws, eid, path, width, height, prepare_js, out_name, frame_w=320, frame_h=420):
    created = await ws_call(
        browser_ws,
        "Target.createTarget",
        {"url": f"chrome-extension://{eid}/{path}"},
        id=10,
    )
    target_id = created["result"]["targetId"]
    await asyncio.sleep(1.2)
    target = find_target(f"/{path}")
    async with websockets.connect(target["webSocketDebuggerUrl"]) as pws:
        await ws_call(pws, "Runtime.enable", id=1)
        await ws_call(pws, "Page.enable", id=20)
        await ws_call(
            pws,
            "Emulation.setDeviceMetricsOverride",
            {
                "width": width,
                "height": height,
                "deviceScaleFactor": 2,
                "mobile": False,
            },
            id=2,
        )
        if prepare_js:
            await ws_call(
                pws,
                "Runtime.evaluate",
                {"expression": prepare_js, "awaitPromise": True},
                id=3,
            )
            await asyncio.sleep(0.4)
        measured = await ws_call(
            pws,
            "Runtime.evaluate",
            {
                "expression": "Math.ceil((document.querySelector('.shell')?.getBoundingClientRect().bottom || document.body.scrollHeight) + 8)",
                "returnByValue": True,
            },
            id=21,
        )
        content_h = int(measured["result"]["result"]["value"])
        content_h = max(200, min(content_h, height))
        await ws_call(
            pws,
            "Emulation.setDeviceMetricsOverride",
            {
                "width": width,
                "height": content_h,
                "deviceScaleFactor": 2,
                "mobile": False,
            },
            id=22,
        )
        await asyncio.sleep(0.25)
        shot = await ws_call(
            pws,
            "Page.captureScreenshot",
            {"format": "png", "fromSurface": True, "captureBeyondViewport": False},
            id=4,
        )
        raw = base64.b64decode(shot["result"]["data"])
    await ws_call(browser_ws, "Target.closeTarget", {"targetId": target_id}, id=11)
    compose_store(raw, OUT / out_name, width, content_h)
    print(f"wrote {out_name} ({width}x{content_h})")

def trim_bottom(img, bg_tol=12):
    """Drop empty trailing rows so the store card hugs the UI."""
    px = img.load()
    w, h = img.size
    sample = px[2, 2][:3]
    last = h - 1
    for y in range(h - 1, -1, -1):
        row_empty = True
        for x in range(0, w, 4):
            r, g, b = px[x, y][:3]
            if (
                abs(r - sample[0]) > bg_tol
                or abs(g - sample[1]) > bg_tol
                or abs(b - sample[2]) > bg_tol
            ):
                row_empty = False
                break
        if not row_empty:
            last = y
            break
    return img.crop((0, 0, w, min(h, last + 16)))

def compose_store(png_bytes, dest, frame_w, frame_h):
    popup = Image.open(BytesIO(png_bytes)).convert("RGBA")
    popup = popup.crop((0, 0, min(popup.width, frame_w * 2), min(popup.height, frame_h * 2)))
    popup = trim_bottom(popup)
    canvas = Image.new("RGB", (1280, 800), "#121212")
    draw = ImageDraw.Draw(canvas)
    draw.ellipse((-120, -160, 720, 520), fill="#2a2114")
    draw.ellipse((680, 360, 1480, 980), fill="#1a1a1a")
    target_w = 400
    scale = target_w / popup.width
    target_h = max(1, int(popup.height * scale))
    popup = popup.resize((target_w, target_h), Image.Resampling.LANCZOS)
    card = Image.new("RGBA", (target_w + 24, target_h + 24), (0, 0, 0, 0))
    shadow = Image.new("RGBA", card.size, (0, 0, 0, 80))
    card.paste(shadow, (8, 10))
    card.paste(popup, (12, 12), popup)
    x = (1280 - card.width) // 2
    y = (800 - card.height) // 2
    canvas.paste(card, (x, y), card)
    canvas.save(dest, format="PNG")

READY_JS = f"""
(() => {{
  const domainEl = document.getElementById('domain');
  const panelEl = document.getElementById('panel');
  const settingsEl = document.getElementById('settings');
  const trail = document.getElementById('trail');
  if (settingsEl) settingsEl.hidden = true;
  if (panelEl) panelEl.hidden = false;
  if (domainEl) domainEl.textContent = {json.dumps(DOMAIN)};
  if (panelEl) {{
    panelEl.innerHTML = \`
      <p class="rating-label">domain rating</p>
      <p class="rating-value">{RATING}</p>
      <p class="delta first">First look</p>
      <div class="ready-actions">
        <button type="button" class="copy-btn">Copy</button>
      </div>
    \`;
  }}
  if (trail) {{
    trail.hidden = false;
    const list = document.getElementById('trail-list');
    if (list) {{
      list.innerHTML = \`
        <li class="trail-item">
          <div class="trail-meta">
            <span class="trail-domain">{json.dumps(DOMAIN)[1:-1]}</span>
            <span class="trail-score">{RATING}</span>
          </div>
          <div class="trail-row">
            <span class="trail-note">first look</span>
            <button type="button" class="linkish">Copy</button>
          </div>
        </li>
      \`;
    }}
  }}
  return true;
}})()
"""

OPTIONS_JS = """
(() => {
  const panelEl = document.getElementById('panel');
  const settingsEl = document.getElementById('settings');
  const trail = document.getElementById('trail');
  const domainEl = document.getElementById('domain');
  const toggle = document.getElementById('options-toggle');
  if (panelEl) panelEl.hidden = true;
  if (trail) trail.hidden = true;
  if (settingsEl) settingsEl.hidden = false;
  if (domainEl) domainEl.textContent = 'Options';
  if (toggle) toggle.textContent = 'Back';
  const input = document.getElementById('api-key');
  if (input) {
    input.value = '••••••••••••••••••••••••••••••••';
    input.type = 'password';
  }
  const status = document.getElementById('settings-status');
  if (status) status.textContent = 'Saved locally.';
  return true;
})()
"""

async def main():
    ver = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/version"))
    async with websockets.connect(ver["webSocketDebuggerUrl"]) as browser_ws:
        loaded = await ws_call(browser_ws, "Extensions.loadUnpacked", {"path": ROOT})
        if "error" in loaded:
            print(loaded)
            sys.exit(1)
        eid = loaded["result"]["id"]
        await shot_page(
            browser_ws, eid, "popup.html", 320, 520, READY_JS,
            "01-popup-ready-1280x800.png", 320, 520,
        )
        await shot_page(
            browser_ws, eid, "popup.html", 320, 480, OPTIONS_JS,
            "02-options-1280x800.png", 320, 480,
        )
        needs_js = """
(() => {
  const domainEl = document.getElementById('domain');
  const panelEl = document.getElementById('panel');
  const settingsEl = document.getElementById('settings');
  const trail = document.getElementById('trail');
  if (settingsEl) settingsEl.hidden = true;
  if (trail) trail.hidden = true;
  if (panelEl) panelEl.hidden = false;
  if (domainEl) domainEl.textContent = 'Setup required';
  if (panelEl) {
    panelEl.innerHTML = \`
      <p class="error">Add your free Ahrefs API key in Options to look up Domain Rating.</p>
      <p class="status" style="margin-top:10px">
        Free key:
        <a href="https://app.ahrefs.com/account/api" target="_blank" rel="noopener noreferrer">Ahrefs API keys</a>
      </p>
      <div class="ready-actions">
        <button type="button" class="copy-btn">Add API key</button>
      </div>
    \`;
  }
  return true;
})()
"""
        await shot_page(
            browser_ws, eid, "popup.html", 320, 420, needs_js,
            "03-popup-needs-key-1280x800.png", 320, 420,
        )
        print("capture-screenshots: ok")

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
    // already exited
  }
  rmSync(userData, { recursive: true, force: true });
}
