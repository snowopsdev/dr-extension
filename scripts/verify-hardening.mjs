// End-to-end check, in headless Chrome or Chromium, that private and skipped
// hosts are never sent to Ahrefs and that the lookup settings work.
//
// Nothing reaches Ahrefs: api.ahrefs.com is mapped to 127.0.0.1, and the
// script only counts the requests the service worker *attempts*. No real API
// key is used.
//
//   npm run verify
//   npm run verify -- --shots <dir>     also save screenshots of the UI
//   CHROME_PATH=/path/to/chrome npm run verify
//
// Needs Node 22+ (built-in WebSocket) and Chrome or Chromium.
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import assert from "node:assert/strict";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const CHROME_CANDIDATES = [
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
];
const chromePath =
  process.env.CHROME_PATH || CHROME_CANDIDATES.find((path) => existsSync(path));
if (!chromePath || !existsSync(chromePath)) {
  console.error(
    "verify-hardening: Chrome or Chromium not found. Set CHROME_PATH to the browser binary.",
  );
  process.exit(1);
}
if (typeof WebSocket === "undefined") {
  console.error("verify-hardening: needs Node 22 or newer (built-in WebSocket).");
  process.exit(1);
}

const shotsFlag = process.argv.indexOf("--shots");
const SHOT_DIR = shotsFlag === -1 ? null : process.argv[shotsFlag + 1];
if (shotsFlag !== -1 && !SHOT_DIR) {
  console.error("verify-hardening: --shots needs a directory.");
  process.exit(1);
}
if (SHOT_DIR) mkdirSync(resolve(SHOT_DIR), { recursive: true });

const debugPort = 19300 + Math.floor(Math.random() * 500);
const userData = mkdtempSync(join(tmpdir(), "dr-verify-"));

const server = createServer((_req, res) => {
  res.writeHead(200, { "content-type": "text/html" });
  res.end("<!doctype html><title>fixture</title><p>fixture</p>");
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const webPort = server.address().port;

const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    `--user-data-dir=${userData}`,
    "--no-first-run",
    "--disable-gpu",
    `--remote-debugging-port=${debugPort}`,
    "--enable-unsafe-extension-debugging",
    "--host-resolver-rules=MAP *.drtest-example.com 127.0.0.1, MAP *.drtest-other.com 127.0.0.1, MAP api.ahrefs.com 127.0.0.1",
    "about:blank",
  ],
  { stdio: "ignore" },
);

class CDP {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = [];
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve);
      this.ws.addEventListener("error", reject);
    });
    this.ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        for (const fn of this.listeners) fn(msg);
      }
    });
  }
  call(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(expression) {
    const result = await this.call("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(JSON.stringify(result.exceptionDetails));
    }
    return result.result.value;
  }
  async until(expression, label, timeoutMs = 8000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (await this.evaluate(expression)) return;
      await sleep(100);
    }
    throw new Error(`timed out waiting for: ${label || expression}`);
  }
  close() {
    this.ws.close();
  }
}

const json = async (path) =>
  (await fetch(`http://127.0.0.1:${debugPort}${path}`)).json();

const results = [];
const check = (name, fn) =>
  Promise.resolve()
    .then(fn)
    .then(() => {
      results.push(`ok   ${name}`);
    });

try {
  for (let i = 0; i < 50; i += 1) {
    try {
      await json("/json/version");
      break;
    } catch {
      await sleep(200);
    }
  }
  const version = await json("/json/version");
  const browser = new CDP(version.webSocketDebuggerUrl);
  await browser.ready;
  const loaded = await browser.call("Extensions.loadUnpacked", { path: ROOT });
  const extId = loaded.id;
  const popupUrl = `chrome-extension://${extId}/popup.html`;

  // Service worker: observe every request it attempts.
  let swTarget;
  for (let i = 0; i < 50 && !swTarget; i += 1) {
    swTarget = (await json("/json/list")).find(
      (t) => t.type === "service_worker" && t.url.includes(extId),
    );
    if (!swTarget) await sleep(200);
  }
  assert.ok(swTarget, "service worker target");
  const sw = new CDP(swTarget.webSocketDebuggerUrl);
  await sw.ready;
  /** @type {string[]} */
  const ahrefsRequests = [];
  sw.listeners.push((msg) => {
    if (msg.method === "Network.requestWillBeSent") {
      const url = msg.params.request.url;
      if (url.includes("api.ahrefs.com")) ahrefsRequests.push(url);
    }
  });
  await sw.call("Network.enable");
  await sw.call("Runtime.enable");

  // One page tab, reused for fixtures and for the popup UI.
  const pageTarget = (await json("/json/list")).find((t) => t.type === "page");
  const page = new CDP(pageTarget.webSocketDebuggerUrl);
  await page.ready;
  /** @type {string[]} */
  const pageErrors = [];
  page.listeners.push((msg) => {
    if (msg.method === "Runtime.exceptionThrown") {
      pageErrors.push(JSON.stringify(msg.params.exceptionDetails).slice(0, 300));
    }
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
      pageErrors.push(JSON.stringify(msg.params.args).slice(0, 300));
    }
  });
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", {
    width: 320,
    height: 900,
    deviceScaleFactor: 2,
    mobile: false,
  });

  const goto = async (url) => {
    await page.call("Page.navigate", { url });
    await sleep(1500); // 300 ms debounce + lookup
  };
  const badge = () =>
    sw.evaluate(`(async () => {
      const [tab] = await chrome.tabs.query({});
      return {
        url: tab.url,
        text: await chrome.action.getBadgeText({ tabId: tab.id }),
        title: await chrome.action.getTitle({ tabId: tab.id }),
      };
    })()`);
  const requestsSince = (mark) => ahrefsRequests.slice(mark);
  const openPopup = async () => {
    await page.call("Page.navigate", { url: popupUrl });
    await page.until("document.querySelector('#options-toggle') !== null", "popup loaded");
    await sleep(400);
  };
  const paste = async (value) => {
    await page.evaluate(`(() => {
      document.querySelector('#lookup-input').value = ${JSON.stringify(value)};
      document.querySelector('#lookup-form').requestSubmit();
    })()`);
    await page.until(
      "!document.querySelector('#panel .spinner') && document.querySelector('#panel').innerText.trim().length > 0",
      `paste ${value} settled`,
    );
    await sleep(300);
    return page.evaluate("document.querySelector('#panel').innerText");
  };
  const openSettings = async () => {
    await page.evaluate("document.querySelector('#options-toggle').click()");
    await page.until("!document.querySelector('#settings').hidden", "settings visible");
    await sleep(200);
  };
  const shot = async (name) => {
    if (!SHOT_DIR) return;
    const { data } = await page.call("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    });
    writeFileSync(join(resolve(SHOT_DIR), name), Buffer.from(data, "base64"));
  };

  await sw.evaluate(
    "chrome.storage.local.set({ ahrefsApiKey: 'test-placeholder-not-a-real-key' })",
  );
  await sleep(600);

  await check("auto mode: loopback IP tab sends nothing", async () => {
    const mark = ahrefsRequests.length;
    await goto(`http://127.0.0.1:${webPort}/admin`);
    const b = await badge();
    assert.match(b.url, /127\.0\.0\.1/);
    assert.deepEqual(requestsSince(mark), []);
    assert.equal(b.text, "");
    assert.match(b.title, /never sent to Ahrefs/);
  });

  await check("auto mode: localhost tab sends nothing", async () => {
    const mark = ahrefsRequests.length;
    await goto(`http://localhost:${webPort}/`);
    const b = await badge();
    assert.match(b.url, /localhost/);
    assert.deepEqual(requestsSince(mark), []);
    assert.match(b.title, /never sent to Ahrefs/);
  });

  await check("auto mode: public host still looks up (observer works)", async () => {
    const mark = ahrefsRequests.length;
    await goto(`http://site.drtest-example.com:${webPort}/`);
    const sent = requestsSince(mark);
    assert.equal(sent.length, 1, JSON.stringify(sent));
    assert.equal(new URL(sent[0]).searchParams.get("target"), "site.drtest-example.com");
  });

  await check("settings form saves a normalized skip list", async () => {
    await openPopup();
    await openSettings();
    assert.equal(
      await page.evaluate("document.querySelector('input[name=badge-mode]:checked')?.value"),
      "auto",
    );
    await shot("settings-default.png");
    await page.evaluate(`(() => {
      document.querySelector('#skip-hosts').value = 'DRTEST-example.com\\nnot a host!\\nhttps://www.drtest-example.com/x';
      document.querySelector('#prefs-form').requestSubmit();
    })()`);
    await page.until("document.querySelector('#prefs-status').textContent.startsWith('Saved')", "prefs saved");
    const stored = await sw.evaluate("chrome.storage.local.get('drSettings').then((r) => r.drSettings)");
    assert.deepEqual(stored, { badgeMode: "auto", skipHosts: ["drtest-example.com"] });
    assert.equal(await page.evaluate("document.querySelector('#skip-hosts').value"), "drtest-example.com");
    assert.match(await page.evaluate("document.querySelector('#prefs-status').textContent"), /removed/);
    assert.equal(await page.evaluate("document.documentElement.scrollWidth <= 320"), true, "no horizontal overflow");
    await shot("settings-saved.png");
  });

  await check("skip list: listed host and its subdomains send nothing", async () => {
    const mark = ahrefsRequests.length;
    await goto(`http://other.drtest-example.com:${webPort}/`);
    const b = await badge();
    assert.deepEqual(requestsSince(mark), []);
    assert.equal(b.text, "");
    assert.match(b.title, /skip list/);
  });

  await check("pasted private and skipped hosts send nothing", async () => {
    const mark = ahrefsRequests.length;
    await openPopup();
    assert.match(await paste("other.drtest-example.com"), /skip list/);
    assert.match(await paste("localhost"), /never sent to Ahrefs/);
    assert.match(await paste("http://10.0.0.5:8080/x"), /never sent to Ahrefs/);
    assert.match(await paste("build.internal"), /never sent to Ahrefs/);
    assert.match(await paste("[::1]"), /never sent to Ahrefs|http or https/);
    assert.deepEqual(requestsSince(mark), []);
    await shot("popup-private-host.png");
  });

  await check("on-click mode: navigation sends nothing, popup lookup does", async () => {
    await openSettings();
    await page.evaluate(`(() => {
      document.querySelector('input[name=badge-mode][value=click]').checked = true;
      document.querySelector('#prefs-form').requestSubmit();
    })()`);
    await page.until("document.querySelector('#prefs-status').textContent.startsWith('Saved')", "mode saved");
    const stored = await sw.evaluate("chrome.storage.local.get('drSettings').then((r) => r.drSettings)");
    assert.deepEqual(stored, { badgeMode: "click", skipHosts: ["drtest-example.com"] });

    let mark = ahrefsRequests.length;
    await goto(`http://fresh.drtest-other.com:${webPort}/`);
    const b = await badge();
    assert.match(b.url, /fresh\.drtest-other\.com/);
    assert.deepEqual(requestsSince(mark), []);
    assert.equal(b.text, "");
    assert.match(b.title, /click to look up fresh\.drtest-other\.com/);

    mark = ahrefsRequests.length;
    await openPopup();
    await paste("fresh.drtest-other.com");
    const sent = requestsSince(mark);
    assert.equal(sent.length, 1, JSON.stringify(sent));
    assert.equal(new URL(sent[0]).searchParams.get("target"), "fresh.drtest-other.com");
  });

  await check("on-click mode: a cached rating shows on the badge without a request", async () => {
    await sw.evaluate(`chrome.storage.session.set({ drBadgeCache: {
      'cached.drtest-other.com': { rating: 61, licenseUrl: 'http://ahrefs.com/legal/domain-rating-license', at: Date.now() },
      'example.com': { rating: 94, licenseUrl: 'http://ahrefs.com/legal/domain-rating-license', at: Date.now() },
    } })`);
    const mark = ahrefsRequests.length;
    await goto(`http://cached.drtest-other.com:${webPort}/`);
    const b = await badge();
    assert.deepEqual(requestsSince(mark), []);
    assert.equal(b.text, "61");
  });

  await check("attribution: footer link, copy line", async () => {
    await openPopup();
    const panel = await paste("example.com");
    assert.match(panel, /94/);
    assert.equal(
      await page.evaluate("document.querySelector('.attribution a').href"),
      "https://ahrefs.com/",
    );
    assert.equal(
      await page.evaluate("document.querySelector('.attribution a').textContent.trim()"),
      "Domain Rating by Ahrefs",
    );
    assert.equal(
      await page.evaluate("document.querySelector('[data-copy-main]').getAttribute('data-copy-main')"),
      "example.com — DR 94 · Domain Rating by Ahrefs (https://ahrefs.com/)",
    );
    await shot("popup-ready.png");
  });

  await check("settings reopen with saved values", async () => {
    await openSettings();
    assert.equal(
      await page.evaluate("document.querySelector('input[name=badge-mode]:checked')?.value"),
      "click",
    );
    assert.equal(await page.evaluate("document.querySelector('#skip-hosts').value"), "drtest-example.com");
    assert.equal(await page.evaluate("document.querySelector('#prefs-status').textContent"), "");
  });

  await check("options page: form hydrates and saves", async () => {
    await page.call("Page.navigate", { url: `chrome-extension://${extId}/options.html` });
    await page.until("document.querySelector('input[name=badge-mode]:checked') !== null", "options hydrated");
    assert.equal(
      await page.evaluate("document.querySelector('input[name=badge-mode]:checked').value"),
      "click",
    );
    await page.evaluate(`(() => {
      document.querySelector('input[name=badge-mode][value=auto]').checked = true;
      document.querySelector('#skip-hosts').value = '';
      document.querySelector('#prefs-form').requestSubmit();
    })()`);
    await page.until("document.querySelector('#prefs-status').textContent === 'Saved.'", "options saved");
    const stored = await sw.evaluate("chrome.storage.local.get('drSettings').then((r) => r.drSettings)");
    assert.deepEqual(stored, { badgeMode: "auto", skipHosts: [] });
    await page.call("Emulation.setDeviceMetricsOverride", { width: 460, height: 900, deviceScaleFactor: 2, mobile: false });
    await shot("options-page.png");
  });

  await check("no popup or options console/runtime errors", async () => {
    assert.deepEqual(pageErrors, []);
  });

  console.log(results.join("\n"));
  console.log(`ahrefs requests attempted in total: ${ahrefsRequests.length}`);
  for (const url of ahrefsRequests) console.log(`  ${url}`);
  console.log("verify-hardening: ok");
  page.close();
  sw.close();
  browser.close();
} catch (err) {
  console.log(results.join("\n"));
  console.error("verify-hardening: FAILED");
  console.error(err);
  process.exitCode = 1;
} finally {
  chrome.kill("SIGTERM");
  server.close();
  await sleep(500);
  try {
    chrome.kill("SIGKILL");
  } catch {
    // already exited
  }
  rmSync(userData, { recursive: true, force: true });
}
