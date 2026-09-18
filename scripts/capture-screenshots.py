"""Capture real extension UI with labeled local fixtures, never real credentials.

Requires macOS Arial fonts, Pillow, websockets, and the adjacent .mjs launcher.
"""
import asyncio
import base64
from io import BytesIO
import json
from pathlib import Path
import sys
import urllib.request

from PIL import Image, ImageDraw, ImageFont
import websockets

ROOT, OUT = map(Path, sys.argv[1:3])
PORT = int(sys.argv[3])
VERSION = json.loads((ROOT / "manifest.json").read_text())["version"]
FONT = Path("/System/Library/Fonts/Supplemental")


class CDP:
    """Send sequential DevTools commands while collecting page errors."""

    def __init__(self, ws):
        """Bind a WebSocket and initialize command and error tracking."""
        self.ws = ws
        self.sequence = 0
        self.errors = []

    async def call(self, method, params=None):
        """Await a command response, recording intervening runtime errors."""
        self.sequence += 1
        await self.ws.send(json.dumps({"id": self.sequence, "method": method, "params": params or {}}))
        while True:
            response = json.loads(await asyncio.wait_for(self.ws.recv(), 20))
            if response.get("method") == "Runtime.exceptionThrown":
                self.errors.append(response["params"])
            if response.get("method") == "Runtime.consoleAPICalled" and response["params"]["type"] == "error":
                self.errors.append(response["params"])
            if response.get("id") == self.sequence:
                if "error" in response:
                    raise RuntimeError(response["error"])
                return response["result"]

    async def evaluate(self, expression):
        """Evaluate page JavaScript and raise on evaluation exceptions."""
        result = await self.call("Runtime.evaluate", {"expression": expression, "awaitPromise": True, "returnByValue": True})
        if "exceptionDetails" in result:
            raise RuntimeError(result["exceptionDetails"])
        return result.get("result", {}).get("value")

    async def until(self, expression):
        """Poll a page condition until it succeeds or the retry limit is hit."""
        for _ in range(80):
            if await self.evaluate(expression):
                return
            await asyncio.sleep(0.1)
        raise RuntimeError(f"Timed out waiting for {expression}")


def font(size, bold=False):
    """Load the macOS Arial face used for screenshot captions."""
    return ImageFont.truetype(str(FONT / ("Arial Bold.ttf" if bold else "Arial.ttf")), size)


def compose(raw, filename, number, title, body, note):
    """Place a complete UI capture and captions on a branded 1280×800 PNG."""
    canvas = Image.new("RGB", (1280, 800), "#191E21")
    draw = ImageDraw.Draw(canvas)
    gold, stone, muted = "#E3B444", "#E9E5DF", "#B4BABD"
    draw.line((80, 182, 600, 182), fill="#384044", width=1)
    icon = Image.open(ROOT / "icons/icon128.png").convert("RGBA")
    canvas.paste(icon, (64, 42), icon)
    draw.text((204, 82), "DOMAIN RATING LOOKUP", font=font(23, True), fill=stone)
    draw.text((80, 224), f"0{number} / CHROME EXTENSION", font=font(16, True), fill=gold)
    draw.multiline_text((77, 268), title, font=font(49, True), fill=stone, spacing=10)
    draw.multiline_text((80, 421), body, font=font(23), fill=muted, spacing=12)
    draw.multiline_text((80, 659), note, font=font(17), fill=muted, spacing=8)
    draw.text((80, 742), f"v{VERSION}  •  Domain Rating by Ahrefs", font=font(15), fill=muted)
    # Uniformly scale the complete browser capture; never reconstruct the UI.
    capture = Image.open(BytesIO(raw)).convert("RGB")
    scale = min(456 / capture.width, 680 / capture.height)
    capture = capture.resize((round(capture.width * scale), round(capture.height * scale)), Image.Resampling.LANCZOS)
    x, y = 914 - capture.width // 2, (800 - capture.height) // 2
    draw.rectangle((x - 1, y - 1, x + capture.width, y + capture.height), outline="#515553", width=1)
    canvas.paste(capture, (x, y))
    canvas.save(OUT / filename)
    print(f"wrote {filename}: 1280x800 RGB; actual UI {capture.width}x{capture.height}")


async def capture(page, filename, number, title, body, note):
    """Validate popup dimensions and errors before composing its screenshot."""
    await page.evaluate("document.fonts.ready.then(() => true)")
    height = await page.evaluate("Math.ceil(document.querySelector('.shell').getBoundingClientRect().bottom)")
    if not 100 < height <= 800:
        raise RuntimeError(f"Unexpected popup height: {height}")
    await page.call("Emulation.setDeviceMetricsOverride", {"width": 320, "height": height, "deviceScaleFactor": 2, "mobile": False})
    await page.evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))")
    if not await page.evaluate("document.documentElement.scrollWidth <= 320"):
        raise RuntimeError("Horizontal overflow")
    shot = await page.call("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": False})
    if page.errors:
        raise RuntimeError(f"Popup runtime/console errors: {page.errors}")
    compose(base64.b64decode(shot["data"]), filename, number, title, body, note)


async def main():
    """Capture setup, Options, and an illustrative rating in the test profile."""
    version = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/version"))
    async with websockets.connect(version["webSocketDebuggerUrl"]) as ws:
        browser = CDP(ws)
        loaded = await browser.call("Extensions.loadUnpacked", {"path": str(ROOT)})
        created = await browser.call("Target.createTarget", {"url": "about:blank"})
        targets = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/list"))
        target = next(t for t in targets if t["id"] == created["targetId"])
        async with websockets.connect(target["webSocketDebuggerUrl"]) as pws:
            page = CDP(pws)
            await page.call("Runtime.enable")
            await page.call("Page.enable")
            await page.call("Emulation.setDeviceMetricsOverride", {"width": 320, "height": 800, "deviceScaleFactor": 2, "mobile": False})
            await page.call("Page.navigate", {"url": f"chrome-extension://{loaded['id']}/popup.html"})
            await page.until("document.querySelector('#open-settings-cta') !== null")
            await capture(page, "03-popup-needs-key-1280x800.png", 3,
                          "Start with your\nown API key.",
                          "Connect a free Ahrefs APIv3 key\nto begin looking up domains.",
                          "Actual setup screen.\nAn Ahrefs account and API key are required.")

            await page.evaluate("document.querySelector('#options-toggle').click()")
            await page.until("!document.querySelector('#settings').hidden && document.querySelector('#domain').textContent === 'Options'")
            await capture(page, "02-options-1280x800.png", 2,
                          "Your key.\nYour browser.",
                          "Save your key in local Chrome storage.\nChange or clear it from Options.",
                          "Actual Options screen.\nNo personal credentials are shown.")

            # Seed data, not markup. The service worker consumes the cache and
            # records the lookup; the unmodified popup renders the result.
            # A sentinel makes completion of the key-change cache clear observable,
            # even when the disposable profile's cache was already empty.
            await page.evaluate("chrome.storage.session.set({drBadgeCache: {__screenshot_invalidation_pending__: true}})")
            await page.evaluate("chrome.storage.local.set({ahrefsApiKey: 'screenshot-placeholder-not-a-real-key'})")
            await page.until("""(async () => {
              const {drBadgeCache} = await chrome.storage.session.get('drBadgeCache');
              return drBadgeCache != null && Object.keys(drBadgeCache).length === 0;
            })()""")
            await page.evaluate("""(async () => {
              await chrome.runtime.sendMessage({type: 'badge.refresh'});
              await chrome.storage.session.set({drBadgeCache: {
                'example.com': {rating: 94, licenseUrl: 'http://ahrefs.com/legal/domain-rating-license', at: Date.now()}
              }});
              document.querySelector('#options-toggle').click();
            })()""")
            await page.until("!document.querySelector('#lookup').hidden && document.querySelector('#settings').hidden")
            await page.evaluate("document.querySelector('#lookup-input').value = 'example.com'; document.querySelector('#lookup-form').requestSubmit()")
            await page.until("document.querySelector('.rating-value')?.textContent === '94' && document.querySelector('[data-open]') !== null")
            if not await page.evaluate("!!document.querySelector('#save-to-trail') && !document.querySelector('#lookup').hidden"):
                raise RuntimeError("Missing current controls")
            await capture(page, "01-popup-ready-1280x800.png", 1,
                          "Look up a domain.\nKeep the context.",
                          "Copy its rating, save it to your trail,\nand revisit domains from Recent.",
                          "Illustrative example data: example.com, DR 94.\nCaptured from the actual extension UI.")
            print("capture-screenshots: ok; three real UI states; no popup runtime/console errors")
        await browser.call("Target.closeTarget", {"targetId": created["targetId"]})


asyncio.run(main())
