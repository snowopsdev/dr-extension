/**
 * @typedef {{
 *   domain: string,
 *   rating: number,
 *   seenAt: number,
 *   previous: { rating: number, seenAt: number } | null
 * }} TrailEntry
 *
 * @typedef {{ kind: 'first' } | { kind: 'delta', delta: number, since: number }} TrailDelta
 */

export const TRAIL_STORAGE_KEY = "drTrail";
export const TRAIL_MAX_ENTRIES = 50;
export const TRAIL_UI_LIMIT = 12;

/**
 * @param {number} rating
 * @returns {string}
 */
export function formatTrailRating(rating) {
  return Number.isInteger(rating) ? String(rating) : rating.toFixed(1);
}

/**
 * @param {string} domain
 * @param {number} rating
 * @returns {string}
 */
export function formatCopyLine(domain, rating) {
  return `${domain} — DR ${formatTrailRating(rating)}`;
}

/**
 * @param {TrailEntry} entry
 * @returns {TrailDelta}
 */
export function trailDelta(entry) {
  if (!entry.previous) {
    return { kind: "first" };
  }
  return {
    kind: "delta",
    delta: entry.rating - entry.previous.rating,
    since: entry.previous.seenAt,
  };
}

/**
 * @param {number} delta
 * @returns {string}
 */
export function formatDeltaText(delta) {
  if (delta === 0) return "±0";
  return delta > 0 ? `+${formatTrailRating(delta)}` : formatTrailRating(delta);
}

/**
 * @param {number} timestamp
 * @param {number} [now]
 * @returns {string}
 */
export function formatRelativeDay(timestamp, now = Date.now()) {
  const dayMs = 24 * 60 * 60 * 1000;
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const startThen = new Date(timestamp);
  startThen.setHours(0, 0, 0, 0);
  const days = Math.round((startToday.getTime() - startThen.getTime()) / dayMs);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return startThen.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * Pure update: record a successful Domain Rating observation.
 * @param {TrailEntry[]} entries
 * @param {string} domain
 * @param {number} rating
 * @param {number} [now]
 * @returns {TrailEntry[]}
 */
export function applyObservation(entries, domain, rating, now = Date.now()) {
  if (!domain || !Number.isFinite(rating)) return entries.slice();

  const existing = entries.find((entry) => entry.domain === domain);
  /** @type {TrailEntry} */
  let next;
  if (!existing) {
    next = { domain, rating, seenAt: now, previous: null };
  } else if (existing.rating !== rating) {
    next = {
      domain,
      rating,
      seenAt: now,
      previous: { rating: existing.rating, seenAt: existing.seenAt },
    };
  } else {
    next = {
      ...existing,
      seenAt: now,
    };
  }

  const rest = entries.filter((entry) => entry.domain !== domain);
  return [next, ...rest].slice(0, TRAIL_MAX_ENTRIES);
}

/**
 * @param {unknown} value
 * @returns {TrailEntry[]}
 */
export function parseTrail(value) {
  if (!Array.isArray(value)) return [];
  /** @type {TrailEntry[]} */
  const out = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = /** @type {Record<string, unknown>} */ (item);
    if (typeof row.domain !== "string" || !row.domain) continue;
    if (typeof row.rating !== "number" || Number.isNaN(row.rating)) continue;
    if (typeof row.seenAt !== "number") continue;
    let previous = null;
    if (row.previous && typeof row.previous === "object") {
      const prev = /** @type {Record<string, unknown>} */ (row.previous);
      if (
        typeof prev.rating === "number" &&
        !Number.isNaN(prev.rating) &&
        typeof prev.seenAt === "number"
      ) {
        previous = { rating: prev.rating, seenAt: prev.seenAt };
      }
    }
    out.push({
      domain: row.domain,
      rating: row.rating,
      seenAt: row.seenAt,
      previous,
    });
  }
  return out;
}

/**
 * @returns {Promise<TrailEntry[]>}
 */
export async function loadTrail() {
  const result = await chrome.storage.local.get(TRAIL_STORAGE_KEY);
  return parseTrail(result[TRAIL_STORAGE_KEY]);
}

/**
 * @param {string} domain
 * @param {number} rating
 * @returns {Promise<TrailEntry[]>}
 */
export async function recordObservation(domain, rating) {
  const current = await loadTrail();
  const next = applyObservation(current, domain, rating, Date.now());
  await chrome.storage.local.set({ [TRAIL_STORAGE_KEY]: next });
  return next;
}

/**
 * @returns {Promise<void>}
 */
export async function clearTrail() {
  await chrome.storage.local.remove(TRAIL_STORAGE_KEY);
}
