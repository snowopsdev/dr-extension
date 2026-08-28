import { fetchDomainRating } from "./lib/api.js";
import { errorMessage, hostnameFromUrl } from "./lib/domain.js";
import { loadApiKey } from "./lib/storage.js";

const domainEl = document.getElementById("domain");
const panelEl = document.getElementById("panel");
const openOptionsBtn = document.getElementById("open-options");

openOptionsBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

/**
 * @param {import('./lib/domain.js').ViewState} state
 */
function render(state) {
  switch (state.status) {
    case "needs_key":
      domainEl.textContent = "Setup required";
      panelEl.innerHTML = `
        <p class="error">${escapeHtml(errorMessage({ kind: "missing_key" }))}</p>
        <p class="status" style="margin-top:10px">
          Free key:
          <a href="https://app.ahrefs.com/account/api" target="_blank" rel="noopener noreferrer">Ahrefs API keys</a>
        </p>
      `;
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
    case "ready":
      domainEl.textContent = state.domain;
      panelEl.innerHTML = `
        <p class="rating-label">domain_rating</p>
        <p class="rating-value">${escapeHtml(formatRating(state.data.rating))}</p>
        <div class="field">
          <p class="field-label">license</p>
          <p class="field-value">
            <a href="${escapeAttr(state.data.licenseUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(state.data.licenseUrl)}</a>
          </p>
        </div>
      `;
      return;
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
 * @param {number} rating
 */
function formatRating(rating) {
  return Number.isInteger(rating) ? String(rating) : rating.toFixed(1);
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

async function main() {
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
    render({ status: "ready", domain, data: result.data });
    return;
  }
  render({ status: "error", domain, error: result.error });
}

main();
