import { fetchDomainRating } from "./lib/api.js";
import { errorMessage, hostnameFromUrl } from "./lib/domain.js";
import { clearApiKey, loadApiKey, saveApiKey } from "./lib/storage.js";
import {
  TRAIL_UI_LIMIT,
  clearTrail,
  formatCopyLine,
  formatDeltaText,
  formatRelativeDay,
  formatTrailRating,
  loadTrail,
  recordObservation,
  trailDelta,
} from "./lib/trail.js";

const domainEl = document.getElementById("domain");
const panelEl = document.getElementById("panel");
const settingsEl = document.getElementById("settings");
const trailSection = document.getElementById("trail");
const trailList = document.getElementById("trail-list");
const optionsToggle = document.getElementById("options-toggle");
const clearTrailBtn = document.getElementById("clear-trail");
const settingsForm = document.getElementById("settings-form");
const apiKeyInput = document.getElementById("api-key");
const clearKeyBtn = document.getElementById("clear-key");
const settingsStatus = document.getElementById("settings-status");

/** @type {'main' | 'settings'} */
let view = "main";
/** @type {boolean} */
let lookupRunning = false;

optionsToggle.addEventListener("click", async () => {
  if (view === "settings") {
    await showMain();
    return;
  }
  await showSettings();
});

clearTrailBtn.addEventListener("click", async () => {
  await clearTrail();
  await renderTrail([]);
});

clearKeyBtn.addEventListener("click", async () => {
  await clearApiKey();
  apiKeyInput.value = "";
  settingsStatus.textContent = "Cleared.";
  chrome.runtime.sendMessage({ type: "badge.refresh" });
});

settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveApiKey(apiKeyInput.value);
  settingsStatus.textContent = "Saved locally.";
  chrome.runtime.sendMessage({ type: "badge.refresh" });
  await showMain();
});

trailList.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const button = target.closest("[data-copy]");
  if (!(button instanceof HTMLElement)) return;
  const line = button.getAttribute("data-copy");
  if (!line) return;
  await copyText(line, button);
});

/**
 * @returns {Promise<void>}
 */
async function showSettings() {
  view = "settings";
  optionsToggle.textContent = "Back";
  panelEl.hidden = true;
  trailSection.hidden = true;
  settingsEl.hidden = false;
  domainEl.textContent = "Options";
  apiKeyInput.value = await loadApiKey();
  settingsStatus.textContent = "";
  apiKeyInput.focus();
}

/**
 * @returns {Promise<void>}
 */
async function showMain() {
  view = "main";
  optionsToggle.textContent = "Options";
  settingsEl.hidden = true;
  panelEl.hidden = false;
  await runLookup();
}

/**
 * @param {import('./lib/domain.js').ViewState} state
 * @param {import('./lib/trail.js').TrailEntry | null} [entry]
 */
function render(state, entry = null) {
  switch (state.status) {
    case "needs_key":
      domainEl.textContent = "Setup required";
      panelEl.innerHTML = `
        <p class="error">${escapeHtml(errorMessage({ kind: "missing_key" }))}</p>
        <p class="status" style="margin-top:10px">
          Free key:
          <a href="https://app.ahrefs.com/account/api" target="_blank" rel="noopener noreferrer">Ahrefs API keys</a>
        </p>
        <div class="ready-actions">
          <button type="button" class="copy-btn" id="open-settings-cta">Add API key</button>
        </div>
      `;
      panelEl.querySelector("#open-settings-cta")?.addEventListener("click", () => {
        void showSettings();
      });
      return;
    case "loading":
      domainEl.textContent = state.domain;
      panelEl.innerHTML = `
        <div class="loading-row">
          <div class="spinner" aria-hidden="true"></div>
          <p class="status">Fetching Domain Rating…</p>
        </div>
      `;
      return;
    case "ready": {
      domainEl.textContent = state.domain;
      const copyLine = formatCopyLine(state.domain, state.data.rating);
      const deltaHtml = entry ? renderDeltaHtml(entry) : "";
      panelEl.innerHTML = `
        <p class="rating-label">domain rating</p>
        <p class="rating-value">${escapeHtml(formatTrailRating(state.data.rating))}</p>
        ${deltaHtml}
        <div class="ready-actions">
          <button type="button" class="copy-btn" data-copy-main="${escapeAttr(copyLine)}">Copy</button>
        </div>
      `;
      const copyMain = panelEl.querySelector("[data-copy-main]");
      if (copyMain instanceof HTMLElement) {
        copyMain.addEventListener("click", async () => {
          const line = copyMain.getAttribute("data-copy-main");
          if (line) await copyText(line, copyMain);
        });
      }
      return;
    }
    case "error":
      domainEl.textContent = state.domain || "Unavailable";
      panelEl.innerHTML = `<p class="error">${escapeHtml(errorMessage(state.error))}</p>`;
      return;
    default: {
      const _exhaustive = state;
      void _exhaustive;
      panelEl.innerHTML = `<p class="error">Something went wrong.</p>`;
    }
  }
}

/**
 * @param {import('./lib/trail.js').TrailEntry} entry
 */
function renderDeltaHtml(entry) {
  const delta = trailDelta(entry);
  if (delta.kind === "first") {
    return `<p class="delta first">First look</p>`;
  }
  const label = formatDeltaText(delta.delta);
  const cls =
    delta.delta > 0 ? "up" : delta.delta < 0 ? "down" : "flat";
  return `<p class="delta ${cls}">${escapeHtml(label)} since ${escapeHtml(formatRelativeDay(delta.since))}</p>`;
}

/**
 * @param {import('./lib/trail.js').TrailEntry[]} entries
 */
async function renderTrail(entries) {
  if (view === "settings") {
    trailSection.hidden = true;
    return;
  }
  const recent = entries.slice(0, TRAIL_UI_LIMIT);
  if (recent.length === 0) {
    trailSection.hidden = true;
    trailList.innerHTML = "";
    return;
  }
  trailSection.hidden = false;
  trailList.innerHTML = recent
    .map((entry) => {
      const line = formatCopyLine(entry.domain, entry.rating);
      const delta = trailDelta(entry);
      const meta =
        delta.kind === "first"
          ? "first look"
          : `${formatDeltaText(delta.delta)} · ${formatRelativeDay(entry.seenAt)}`;
      return `
        <li class="trail-item">
          <div class="trail-meta">
            <span class="trail-domain">${escapeHtml(entry.domain)}</span>
            <span class="trail-score">${escapeHtml(formatTrailRating(entry.rating))}</span>
          </div>
          <div class="trail-row">
            <span class="trail-note">${escapeHtml(meta)}</span>
            <button type="button" class="linkish" data-copy="${escapeAttr(line)}">Copy</button>
          </div>
        </li>
      `;
    })
    .join("");
}

/**
 * @param {string} text
 * @param {HTMLElement} button
 */
async function copyText(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    const prior = button.textContent;
    button.textContent = "Copied";
    setTimeout(() => {
      button.textContent = prior;
    }, 1200);
  } catch {
    button.textContent = "Failed";
  }
}

/**
 * @param {string} value
 */
function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * @param {string} value
 */
function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

/**
 * @returns {Promise<void>}
 */
async function runLookup() {
  if (lookupRunning) return;
  lookupRunning = true;
  try {
    const trail = await loadTrail();
    await renderTrail(trail);

    const key = await loadApiKey();
    if (!key) {
      render({ status: "needs_key" });
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      render({
        status: "error",
        domain: null,
        error: { kind: "no_tab" },
      });
      return;
    }

    const domain = hostnameFromUrl(tab.url);
    if (!domain) {
      render({
        status: "error",
        domain: null,
        error: { kind: "unsupported_page" },
      });
      return;
    }

    render({ status: "loading", domain });
    const result = await fetchDomainRating({ domain, key });
    if (result.ok) {
      const nextTrail = await recordObservation(domain, result.data.rating);
      const entry = nextTrail.find((row) => row.domain === domain) || null;
      render({ status: "ready", domain, data: result.data }, entry);
      await renderTrail(nextTrail);
      if (typeof tab.id === "number") {
        chrome.runtime.sendMessage({
          type: "badge.set",
          tabId: tab.id,
          domain,
          rating: result.data.rating,
          licenseUrl: result.data.licenseUrl,
        });
      }
      return;
    }
    render({ status: "error", domain, error: result.error });
  } finally {
    lookupRunning = false;
  }
}

void runLookup();
