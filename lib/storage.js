import { parseSettings } from "./guard.js";

const STORAGE_KEY = "ahrefsApiKey";
export const SETTINGS_STORAGE_KEY = "drSettings";

/**
 * @returns {Promise<string>}
 */
export async function loadApiKey() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const value = result[STORAGE_KEY];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * @param {string} key
 * @returns {Promise<void>}
 */
export async function saveApiKey(key) {
  await chrome.storage.local.set({ [STORAGE_KEY]: key.trim() });
}

/**
 * @returns {Promise<void>}
 */
export async function clearApiKey() {
  await chrome.storage.local.remove(STORAGE_KEY);
}

/**
 * @returns {Promise<import('./guard.js').LookupSettings>}
 */
export async function loadSettings() {
  const result = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
  return parseSettings(result[SETTINGS_STORAGE_KEY]);
}

/**
 * @param {import('./guard.js').LookupSettings} settings
 * @returns {Promise<import('./guard.js').LookupSettings>}
 */
export async function saveSettings(settings) {
  const next = parseSettings(settings);
  await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: next });
  return next;
}
