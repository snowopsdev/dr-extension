/**
 * @typedef {{ rating: number, licenseUrl: string }} DomainRating
 *
 * @typedef {
 *   | { kind: 'missing_key' }
 *   | { kind: 'unsupported_page' }
 *   | { kind: 'no_tab' }
 *   | { kind: 'unauthorized' }
 *   | { kind: 'forbidden' }
 *   | { kind: 'rate_limited' }
 *   | { kind: 'bad_request', detail: string }
 *   | { kind: 'network', detail: string }
 *   | { kind: 'parse' }
 *   | { kind: 'server' }
 * } FetchError
 *
 * @typedef {
 *   | { status: 'loading', domain: string }
 *   | { status: 'ready', domain: string, data: DomainRating }
 *   | { status: 'error', domain: string | null, error: FetchError }
 *   | { status: 'needs_key' }
 * } ViewState
 *
 * @typedef {{ ok: true, data: DomainRating } | { ok: false, error: FetchError }} FetchResult
 */

/**
 * @param {string | undefined} url
 * @returns {string | null}
 */
export function hostnameFromUrl(url) {
  if (!url) return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }
  return parsed.hostname || null;
}

/**
 * @param {unknown} json
 * @returns {FetchResult}
 */
export function parseDomainRatingResponse(json) {
  if (!json || typeof json !== "object") {
    return { ok: false, error: { kind: "parse" } };
  }

  const root = /** @type {Record<string, unknown>} */ (json);
  const nested = root.domain_rating;
  if (!nested || typeof nested !== "object") {
    return { ok: false, error: { kind: "parse" } };
  }

  const body = /** @type {Record<string, unknown>} */ (nested);
  const rating = body.domain_rating;
  const licenseUrl = body.license;

  if (typeof rating !== "number" || Number.isNaN(rating)) {
    return { ok: false, error: { kind: "parse" } };
  }
  if (typeof licenseUrl !== "string" || licenseUrl.length === 0) {
    return { ok: false, error: { kind: "parse" } };
  }

  return {
    ok: true,
    data: { rating, licenseUrl },
  };
}

/**
 * @param {number} status
 * @param {string} bodyText
 * @returns {FetchError}
 */
export function mapHttpError(status, bodyText) {
  const detail = summarizeErrorBody(bodyText);
  switch (status) {
    case 400:
      return { kind: "bad_request", detail };
    case 401:
      return { kind: "unauthorized" };
    case 403:
      return { kind: "forbidden" };
    case 429:
      return { kind: "rate_limited" };
    default:
      if (status >= 500) return { kind: "server" };
      return { kind: "network", detail: detail || `HTTP ${status}` };
  }
}

/**
 * @param {string} bodyText
 * @returns {string}
 */
function summarizeErrorBody(bodyText) {
  if (!bodyText) return "";
  try {
    const parsed = JSON.parse(bodyText);
    if (Array.isArray(parsed) && parsed.length >= 2 && typeof parsed[1] === "string") {
      return parsed[1];
    }
    if (parsed && typeof parsed === "object" && typeof parsed.error === "string") {
      return parsed.error;
    }
  } catch {
  }
  return bodyText.slice(0, 160);
}

/**
 * @param {FetchError} error
 * @returns {string}
 */
export function errorMessage(error) {
  switch (error.kind) {
    case "missing_key":
      return "Add your free Ahrefs API key in Options to look up Domain Rating.";
    case "unsupported_page":
      return "Open an http or https page, then try again.";
    case "no_tab":
      return "Could not read the active tab.";
    case "unauthorized":
      return "Ahrefs rejected the API key. Check it under Options.";
    case "forbidden":
      return "Ahrefs refused the request. Confirm the free API key is set.";
    case "rate_limited":
      return "Ahrefs rate limit hit. Wait a moment and try again.";
    case "bad_request":
      return error.detail || "Ahrefs could not use that domain.";
    case "network":
      return error.detail || "Network error talking to Ahrefs.";
    case "parse":
      return "Unexpected response from Ahrefs.";
    case "server":
      return "Ahrefs is having server trouble. Try again later.";
    default:
      return "Something went wrong.";
  }
}
