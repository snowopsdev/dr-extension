import { fetchDomainRating } from "./lib/api.js";
import { applyBadge } from "./lib/badge.js";
import { hostnameFromUrl } from "./lib/domain.js";
import { loadApiKey } from "./lib/storage.js";
import { recordObservation } from "./lib/trail.js";

const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_STORAGE_KEY = "drBadgeCache";
const GEN_STORAGE_KEY = "drTabGeneration";

chrome.runtime.onInstalled.addListener(() => {
  void refreshActiveTab();
});

chrome.runtime.onStartup.addListener(() => {
  void refreshActiveTab();
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  void refreshTab(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" || changeInfo.url) {
    void refreshTab(tabId, tab.url);
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.ahrefsApiKey) {
    void chrome.storage.session.set({ [CACHE_STORAGE_KEY]: {} }).then(() => {
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
        await recordObservation(domain, rating);
      }
      sendResponse({ ok: true });
    })();
    return true;
  }
});

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

  const key = await loadApiKey();
  if (!key) {
    await applyBadge({
      tabId,
      rating: null,
      title: "Domain Rating Lookup — add your Ahrefs API key in Options",
    });
    return;
  }

  const cache = await readCache();
  const cached = cache[domain];
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    if ((await currentGeneration(tabId)) !== generation) return;
    await applyBadge({
      tabId,
      rating: cached.rating,
      title: `Domain Rating ${cached.rating} · ${domain}`,
    });
    return;
  }

  await applyBadge({
    tabId,
    rating: null,
    title: `Fetching Domain Rating for ${domain}…`,
  });

  const result = await fetchDomainRating({ domain, key });
  if ((await currentGeneration(tabId)) !== generation) return;

  if (!result.ok) {
    await applyBadge({
      tabId,
      rating: null,
      title: `Domain Rating Lookup — ${domain}`,
    });
    return;
  }

  await putCacheEntry(domain, {
    rating: result.data.rating,
    licenseUrl: result.data.licenseUrl,
    at: Date.now(),
  });
  await recordObservation(domain, result.data.rating);

  await applyBadge({
    tabId,
    rating: result.data.rating,
    title: `Domain Rating ${result.data.rating} · ${domain}`,
  });
}
