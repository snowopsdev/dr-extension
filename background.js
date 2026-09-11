import { fetchDomainRating } from "./lib/api.js";
import { applyBadge } from "./lib/badge.js";
import {
  errorMessage,
  hostnameFromInput,
  hostnameFromUrl,
  isPrefetchPauseError,
} from "./lib/domain.js";
import { loadApiKey } from "./lib/storage.js";
import { recordObservation } from "./lib/trail.js";

const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_STORAGE_KEY = "drBadgeCache";
const GEN_STORAGE_KEY = "drTabGeneration";
const BACKOFF_STORAGE_KEY = "drPrefetchBackoff";
const BACKOFF_MS = 60 * 1000;
const TAB_REFRESH_DEBOUNCE_MS = 300;
const VALIDATE_HOST = "example.com";

/** @type {ReturnType<typeof setTimeout> | null} */
let refreshTimer = null;

chrome.runtime.onInstalled.addListener(() => {
  void refreshActiveTab();
});

chrome.runtime.onStartup.addListener(() => {
  void refreshActiveTab();
});

chrome.tabs.onActivated.addListener(() => {
  scheduleRefreshActiveTab();
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" && !changeInfo.url) return;
  if (tab.active === false) return;
  scheduleRefreshActiveTab();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.ahrefsApiKey) {
    void chrome.storage.session
      .set({ [CACHE_STORAGE_KEY]: {}, [BACKOFF_STORAGE_KEY]: {} })
      .then(() => {
        void refreshActiveTab();
      });
    return;
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") return;
  if (message.type === "badge.refresh") {
    void refreshActiveTab().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message.type === "rating.get") {
    void handleRatingGet(message).then(sendResponse);
    return true;
  }
  if (message.type === "key.validate") {
    void handleKeyValidate(message).then(sendResponse);
    return true;
  }
  if (message.type === "badge.set" && typeof message.tabId === "number") {
    const rating = typeof message.rating === "number" ? message.rating : null;
    const domain = typeof message.domain === "string" ? message.domain : "";
    void (async () => {
      await applyBadge({
        tabId: message.tabId,
        rating,
        title:
          rating == null
            ? "Domain Rating Lookup"
            : `Domain Rating ${rating} · ${domain}`,
      });
      if (rating != null && domain) {
        await putCacheEntry(domain, {
          rating,
          licenseUrl:
            typeof message.licenseUrl === "string" ? message.licenseUrl : "",
          at: Date.now(),
        });
      }
      sendResponse({ ok: true });
    })();
    return true;
  }
});

function scheduleRefreshActiveTab() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    void refreshActiveTab();
  }, TAB_REFRESH_DEBOUNCE_MS);
}

/**
 * @returns {Promise<Record<string, { rating: number, licenseUrl: string, at: number }>>}
 */
async function readCache() {
  const result = await chrome.storage.session.get(CACHE_STORAGE_KEY);
  const value = result[CACHE_STORAGE_KEY];
  return value && typeof value === "object" ? value : {};
}

/**
 * @param {string} domain
 * @param {{ rating: number, licenseUrl: string, at: number }} entry
 */
async function putCacheEntry(domain, entry) {
  const cache = await readCache();
  cache[domain] = entry;
  await chrome.storage.session.set({ [CACHE_STORAGE_KEY]: cache });
}

/**
 * @returns {Promise<{ until: number, error: import('./lib/domain.js').FetchError | null }>}
 */
async function readBackoff() {
  const result = await chrome.storage.session.get(BACKOFF_STORAGE_KEY);
  const value = result[BACKOFF_STORAGE_KEY];
  if (!value || typeof value !== "object") {
    return { until: 0, error: null };
  }
  const until = Number(value.until) || 0;
  const error =
    value.error && typeof value.error === "object" && typeof value.error.kind === "string"
      ? /** @type {import('./lib/domain.js').FetchError} */ (value.error)
      : null;
  return { until, error };
}

/**
 * @param {import('./lib/domain.js').FetchError} error
 */
async function pausePrefetch(error) {
  await chrome.storage.session.set({
    [BACKOFF_STORAGE_KEY]: { until: Date.now() + BACKOFF_MS, error },
  });
}

/**
 * @param {number} tabId
 * @returns {Promise<number>}
 */
async function nextGeneration(tabId) {
  const result = await chrome.storage.session.get(GEN_STORAGE_KEY);
  const map =
    result[GEN_STORAGE_KEY] && typeof result[GEN_STORAGE_KEY] === "object"
      ? result[GEN_STORAGE_KEY]
      : {};
  const generation = (Number(map[String(tabId)]) || 0) + 1;
  map[String(tabId)] = generation;
  await chrome.storage.session.set({ [GEN_STORAGE_KEY]: map });
  return generation;
}

/**
 * @param {number} tabId
 * @returns {Promise<number>}
 */
async function currentGeneration(tabId) {
  const result = await chrome.storage.session.get(GEN_STORAGE_KEY);
  const map =
    result[GEN_STORAGE_KEY] && typeof result[GEN_STORAGE_KEY] === "object"
      ? result[GEN_STORAGE_KEY]
      : {};
  return Number(map[String(tabId)]) || 0;
}

/**
 * @returns {Promise<void>}
 */
async function refreshActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  if (tab?.id != null) {
    await refreshTab(tab.id, tab.url);
  }
}

/**
 * @param {number} tabId
 * @param {import('./lib/domain.js').FetchError} error
 * @param {string} domain
 */
async function applyErrorBadge(tabId, error, domain) {
  const paused = isPrefetchPauseError(error);
  await applyBadge({
    tabId,
    rating: null,
    text: paused ? "!" : "",
    title: domain
      ? `Domain Rating Lookup — ${errorMessage(error)}`
      : errorMessage(error),
  });
}

/**
 * @param {{
 *   domain: string,
 *   tabId?: number | null,
 *   recordTrail?: boolean,
 *   allowFetch: boolean,
 *   generation?: number | null,
 * }} args
 * @returns {Promise<import('./lib/domain.js').FetchResult & { domain: string, cached?: boolean }>}
 */
async function lookupDomain({
  domain,
  tabId = null,
  recordTrail = false,
  allowFetch,
  generation = null,
}) {
  const key = await loadApiKey();
  if (!key) {
    if (tabId != null) {
      await applyBadge({
        tabId,
        rating: null,
        title: "Domain Rating Lookup — add your Ahrefs API key in Options",
      });
    }
    return { ok: false, error: { kind: "missing_key" }, domain };
  }

  const cache = await readCache();
  const cached = cache[domain];
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    if (recordTrail) {
      await recordObservation(domain, cached.rating);
    }
    if (tabId != null && (generation == null || (await currentGeneration(tabId)) === generation)) {
      await applyBadge({
        tabId,
        rating: cached.rating,
        title: `Domain Rating ${cached.rating} · ${domain}`,
      });
    }
    return {
      ok: true,
      domain,
      cached: true,
      data: { rating: cached.rating, licenseUrl: cached.licenseUrl },
    };
  }

  if (!allowFetch) {
    const backoff = await readBackoff();
    const error = backoff.error || { kind: "rate_limited" };
    if (tabId != null && (generation == null || (await currentGeneration(tabId)) === generation)) {
      await applyErrorBadge(tabId, error, domain);
    }
    return { ok: false, error, domain };
  }

  if (tabId != null && (generation == null || (await currentGeneration(tabId)) === generation)) {
    await applyBadge({
      tabId,
      rating: null,
      title: `Fetching Domain Rating for ${domain}…`,
    });
  }

  const result = await fetchDomainRating({ domain, key });
  if (!result.ok) {
    if (isPrefetchPauseError(result.error)) {
      await pausePrefetch(result.error);
    }
    const stale =
      tabId != null &&
      generation != null &&
      (await currentGeneration(tabId)) !== generation;
    if (!stale && tabId != null) {
      await applyErrorBadge(tabId, result.error, domain);
    }
    return { ok: false, error: result.error, domain };
  }

  await putCacheEntry(domain, {
    rating: result.data.rating,
    licenseUrl: result.data.licenseUrl,
    at: Date.now(),
  });

  const stale =
    tabId != null &&
    generation != null &&
    (await currentGeneration(tabId)) !== generation;
  if (stale) {
    return { ok: true, domain, cached: false, data: result.data };
  }

  if (recordTrail) {
    await recordObservation(domain, result.data.rating);
  }
  if (tabId != null) {
    await applyBadge({
      tabId,
      rating: result.data.rating,
      title: `Domain Rating ${result.data.rating} · ${domain}`,
    });
  }
  return { ok: true, domain, cached: false, data: result.data };
}

/**
 * @param {number} tabId
 * @param {string | undefined} knownUrl
 * @returns {Promise<void>}
 */
async function refreshTab(tabId, knownUrl) {
  const generation = await nextGeneration(tabId);

  let url = knownUrl;
  if (!url) {
    try {
      const tab = await chrome.tabs.get(tabId);
      url = tab.url;
    } catch {
      return;
    }
  }

  const domain = hostnameFromUrl(url);
  if (!domain) {
    await applyBadge({ tabId, rating: null, title: "Domain Rating Lookup" });
    return;
  }

  const backoff = await readBackoff();
  const paused = Date.now() < backoff.until;
  await lookupDomain({
    domain,
    tabId,
    recordTrail: false,
    allowFetch: !paused,
    generation,
  });
}

/**
 * @param {Record<string, unknown>} message
 * @returns {Promise<import('./lib/domain.js').FetchResult & { domain: string | null, cached?: boolean }>}
 */
async function handleRatingGet(message) {
  const requested =
    typeof message.domain === "string" ? hostnameFromInput(message.domain) : null;
  const tabId = typeof message.tabId === "number" ? message.tabId : null;
  const recordTrail = Boolean(message.recordTrail);

  let domain = requested;
  /** @type {number | null} */
  let requestedTabId = tabId;

  if (!domain) {
    const [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    if (!tab) {
      return { ok: false, domain: null, error: { kind: "no_tab" } };
    }
    domain = hostnameFromUrl(tab.url);
    if (tab.id != null) requestedTabId = tab.id;
  }

  if (!domain) {
    if (requestedTabId != null) {
      await applyBadge({
        tabId: requestedTabId,
        rating: null,
        title: "Domain Rating Lookup",
      });
    }
    return { ok: false, domain: null, error: { kind: "unsupported_page" } };
  }

  /** @type {number | null} */
  let badgeTabId = null;
  if (requestedTabId != null) {
    try {
      const tab = await chrome.tabs.get(requestedTabId);
      if (hostnameFromUrl(tab.url) === domain) {
        badgeTabId = requestedTabId;
      }
    } catch {
      badgeTabId = null;
    }
  }
  if (badgeTabId == null) {
    const [active] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    if (active?.id != null && hostnameFromUrl(active.url) === domain) {
      badgeTabId = active.id;
    }
  }

  return lookupDomain({
    domain,
    tabId: badgeTabId,
    recordTrail,
    allowFetch: true,
  });
}

/**
 * @param {Record<string, unknown>} message
 * @returns {Promise<import('./lib/domain.js').FetchResult>}
 */
async function handleKeyValidate(message) {
  const key = typeof message.key === "string" ? message.key.trim() : "";
  if (!key) {
    return { ok: false, error: { kind: "missing_key" } };
  }
  return fetchDomainRating({ domain: VALIDATE_HOST, key });
}
