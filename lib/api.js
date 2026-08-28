import {
  mapHttpError,
  parseDomainRatingResponse,
} from "./domain.js";

const API_URL = "https://api.ahrefs.com/v3/public/domain-rating-free";

/**
 * @param {{ domain: string, key: string }} args
 * @returns {Promise<import('./domain.js').FetchResult>}
 */
export async function fetchDomainRating({ domain, key }) {
  if (!key) {
    return { ok: false, error: { kind: "missing_key" } };
  }
  if (!domain) {
    return { ok: false, error: { kind: "unsupported_page" } };
  }

  const url = new URL(API_URL);
  url.searchParams.set("target", domain);
  url.searchParams.set("output", "json");

  let response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Network error";
    return { ok: false, error: { kind: "network", detail } };
  }

  const bodyText = await response.text();
  if (!response.ok) {
    return { ok: false, error: mapHttpError(response.status, bodyText) };
  }

  let json;
  try {
    json = JSON.parse(bodyText);
  } catch {
    return { ok: false, error: { kind: "parse" } };
  }

  return parseDomainRatingResponse(json);
}
