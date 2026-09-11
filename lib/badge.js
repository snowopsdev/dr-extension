/**
 * @param {number} rating
 * @returns {string}
 */
export function formatBadgeText(rating) {
  if (!Number.isFinite(rating)) return "";
  const tenths = Math.round(rating * 10) / 10;
  if (Number.isInteger(tenths)) {
    return String(tenths);
  }
  const text = tenths.toFixed(1);
  return text.length <= 4 ? text : String(Math.round(tenths));
}

/**
 * @param {number | null | undefined} rating
 * @param {string | undefined} text
 * @returns {string}
 */
export function resolveBadgeText(rating, text) {
  if (typeof text === "string") return text;
  if (rating == null) return "";
  return formatBadgeText(rating);
}

/**
 * @param {{
 *   tabId: number,
 *   rating: number | null,
 *   title?: string,
 *   text?: string
 * }} args
 * @returns {Promise<void>}
 */
export async function applyBadge({ tabId, rating, title, text }) {
  const badgeText = resolveBadgeText(rating, text);
  if (!badgeText) {
    await chrome.action.setBadgeText({ tabId, text: "" });
    if (title) {
      await chrome.action.setTitle({ tabId, title });
    }
    return;
  }

  await chrome.action.setBadgeBackgroundColor({
    tabId,
    color: "#1a1a1a",
  });
  if (chrome.action.setBadgeTextColor) {
    await chrome.action.setBadgeTextColor({
      tabId,
      color: "#f2b134",
    });
  }
  await chrome.action.setBadgeText({
    tabId,
    text: badgeText,
  });
  await chrome.action.setTitle({
    tabId,
    title:
      title ||
      (rating != null
        ? `Domain Rating ${badgeText}`
        : "Domain Rating Lookup"),
  });
}
