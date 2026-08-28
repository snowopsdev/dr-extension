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
 * @param {{ tabId: number, rating: number | null, title?: string }} args
 * @returns {Promise<void>}
 */
export async function applyBadge({ tabId, rating, title }) {
  if (rating == null) {
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
    text: formatBadgeText(rating),
  });
  await chrome.action.setTitle({
    tabId,
    title: title || `Domain Rating ${formatBadgeText(rating)}`,
  });
}
