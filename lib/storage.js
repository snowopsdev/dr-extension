const STORAGE_KEY = "ahrefsApiKey";

/**
 * @returns {Promise<string>}
 */
export async function loadApiKey() {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  const value = result[STORAGE_KEY];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * @param {string} key
 * @returns {Promise<void>}
 */
export async function saveApiKey(key) {
  await chrome.storage.sync.set({ [STORAGE_KEY]: key.trim() });
}

/**
 * @returns {Promise<void>}
 */
export async function clearApiKey() {
  await chrome.storage.sync.remove(STORAGE_KEY);
}
