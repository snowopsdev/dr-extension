import {
  errorMessage,
  hostnameFromInput,
  hostnameFromUrl,
  httpsUrlForDomain,
} from "./lib/domain.js";
import { loadApiKey } from "./lib/storage.js";
import { bindKeyForm } from "./lib/settings.js";
import {
  TRAIL_UI_LIMIT,
  clearTrail,
  formatCopyLine,
  formatDeltaText,
  formatRelativeDay,
  formatTrailRating,
  formatTrailTsv,
  loadTrail,
  recordObservation,
  trailDelta,
} from "./lib/trail.js";

const domainEl = document.getElementById("domain");
const panelEl = document.getElementById("panel");
const settingsEl = document.getElementById("settings");
const lookupSection = document.getElementById("lookup");
const lookupForm = document.getElementById("lookup-form");
const lookupInput = document.getElementById("lookup-input");
const trailSection = document.getElementById("trail");
const trailList = document.getElementById("trail-list");
const optionsToggle = document.getElementById("options-toggle");
const clearTrailBtn = document.getElementById("clear-trail");
const copyTrailBtn = document.getElementById("copy-trail");
const settingsForm = document.getElementById("settings-form");
const apiKeyInput = document.getElementById("api-key");
const clearKeyBtn = document.getElementById("clear-key");
const settingsStatus = document.getElementById("settings-status");
const showKeyToggle = document.getElementById("show-key");

/** @type {'main' | 'settings'} */
let view = "main";
/** @type {boolean} */
let lookupRunning = false;
/** @type {string | null} */
let displayedDomain = null;
/** @type {number | null} */
let displayedRating = null;

bindKeyForm({
  form: settingsForm,
  input: apiKeyInput,
  clearBtn: clearKeyBtn,
  statusEl: settingsStatus,
  showKeyToggle: showKeyToggle instanceof HTMLInputElement ? showKeyToggle : null,
  onSaved: () => showMain(),
});

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

copyTrailBtn.addEventListener("click", async () => {
  const trail = await loadTrail();
  await copyText(formatTrailTsv(trail), copyTrailBtn);
});

lookupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const domain = hostnameFromInput(lookupInput.value);
  if (!domain) {
    render({
      status: "error",
      domain: lookupInput.value.trim() || null,
      error: { kind: "unsupported_page" },
    });
    return;
  }
  lookupInput.value = domain;
  await runLookup({ domain, recordTrail: true });
});

trailList.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const copyButton = target.closest("[data-copy]");
  if (copyButton instanceof HTMLElement) {
    const line = copyButton.getAttribute("data-copy");
    if (line) await copyText(line, copyButton);
    return;
  }
  const openButton = target.closest("[data-open]");
  if (openButton instanceof HTMLElement) {
    const host = openButton.getAttribute("data-open");
    const url = httpsUrlForDomain(host || "");
    if (url) {
      await chrome.tabs.create({ url });
    }
  }
});

/**
 * @returns {Promise<void>}
 */
async function showSettings() {
  view = "settings";
  optionsToggle.textContent = "Back";
  panelEl.hidden = true;
  lookupSection.hidden = true;
  trailSection.hidden = true;
  settingsEl.hidden = false;
  domainEl.textContent = "Options";
  apiKeyInput.value = await loadApiKey();
  settingsStatus.textContent = "";
  settingsStatus.classList.remove("is-error");
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
  await runLookup({ recordTrail: true });
}

/**
 * @param {import('./lib/domain.js').ViewState} state
 * @param {import('./lib/trail.js').TrailEntry | null} [entry]
 */
function render(state, entry = null) {
  displayedDomain = null;
  displayedRating = null;
  switch (state.status) {
    case "needs_key":
      domainEl.textContent = "Setup required";
      lookupSection.hidden = true;
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
      displayedDomain = state.domain;
      displayedRating = state.data.rating;
      domainEl.textContent = state.domain;
      const copyLine = formatCopyLine(state.domain, state.data.rating);
      const deltaHtml = entry ? renderDeltaHtml(entry) : "";
      panelEl.innerHTML = `
        <p class="rating-label">domain rating</p>
        <p class="rating-value">${escapeHtml(formatTrailRating(state.data.rating))}</p>
        ${deltaHtml}
        <div class="ready-actions">
          <button type="button" class="copy-btn" data-copy-main="${escapeAttr(copyLine)}">Copy</button>
          <button type="button" class="linkish" id="save-to-trail">Save to trail</button>
        </div>
      `;
      const copyMain = panelEl.querySelector("[data-copy-main]");
      if (copyMain instanceof HTMLElement) {
        copyMain.addEventListener("click", async () => {
          const line = copyMain.getAttribute("data-copy-main");
          if (line) await copyText(line, copyMain);
        });
      }
      const saveBtn = panelEl.querySelector("#save-to-trail");
      if (saveBtn instanceof HTMLElement) {
        saveBtn.addEventListener("click", () => {
          void saveDisplayedToTrail(saveBtn);
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
 * @param {HTMLElement} button
 */
async function saveDisplayedToTrail(button) {
  if (!displayedDomain || displayedRating == null) return;
  const nextTrail = await recordObservation(displayedDomain, displayedRating);
  await renderTrail(nextTrail);
  const prior = button.textContent;
  button.textContent = "Saved";
  setTimeout(() => {
    button.textContent = prior;
  }, 1200);
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
            <button type="button" class="trail-domain linkish" data-copy="${escapeAttr(line)}" data-label="${escapeAttr(entry.domain)}">${escapeHtml(entry.domain)}</button>
            <span class="trail-score">${escapeHtml(formatTrailRating(entry.rating))}</span>
          </div>
          <div class="trail-row">
            <span class="trail-note">${escapeHtml(meta)}</span>
            <div class="trail-row-actions">
              <button type="button" class="linkish" data-copy="${escapeAttr(line)}">Copy</button>
              <button type="button" class="linkish" data-open="${escapeAttr(entry.domain)}">Open</button>
            </div>
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
  const restoreTo = button.getAttribute("data-label") || button.textContent;
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "Copied";
    setTimeout(() => {
      button.textContent = restoreTo;
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
 * @param {{ domain?: string, recordTrail?: boolean }} [opts]
 * @returns {Promise<void>}
 */
async function runLookup(opts = {}) {
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

    lookupSection.hidden = view !== "main";
    if (view !== "main") return;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const requestedDomain = opts.domain || null;
    let domain = requestedDomain;
    /** @type {number | undefined} */
    let tabId;

    if (!domain) {
      if (!tab) {
        render({
          status: "error",
          domain: null,
          error: { kind: "no_tab" },
        });
        return;
      }
      domain = hostnameFromUrl(tab.url);
      if (typeof tab.id === "number") tabId = tab.id;
    } else if (typeof tab?.id === "number") {
      tabId = tab.id;
    }

    if (!domain) {
      render({
        status: "error",
        domain: null,
        error: { kind: "unsupported_page" },
      });
      return;
    }

    render({ status: "loading", domain });
    /** @type {(import('./lib/domain.js').FetchResult & { domain?: string | null }) | undefined} */
    let result;
    try {
      result = await chrome.runtime.sendMessage({
        type: "rating.get",
        domain,
        tabId,
        recordTrail: opts.recordTrail !== false,
      });
    } catch {
      if (view !== "main") return;
      render({
        status: "error",
        domain,
        error: {
          kind: "network",
          detail: "Could not reach the lookup service.",
        },
      });
      return;
    }

    if (view !== "main") return;

    if (result?.ok) {
      const nextTrail = await loadTrail();
      const entry = nextTrail.find((row) => row.domain === domain) || null;
      render({ status: "ready", domain, data: result.data }, entry);
      await renderTrail(nextTrail);
      return;
    }
    render({
      status: "error",
      domain,
      error: result?.error || { kind: "network", detail: "Lookup failed." },
    });
  } finally {
    lookupRunning = false;
  }
}

void runLookup({ recordTrail: true });
