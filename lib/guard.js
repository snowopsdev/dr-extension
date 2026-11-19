/**
 * Decides which hostnames may be sent to Ahrefs, and holds the lookup
 * settings shape. Pure: no chrome.* access, so it runs under plain node tests.
 *
 * @typedef {'auto' | 'click'} BadgeMode
 * @typedef {{ badgeMode: BadgeMode, skipHosts: string[] }} LookupSettings
 */

import { hostnameFromInput } from "./domain.js";

export const SKIP_LIST_MAX_ENTRIES = 200;

/** @type {LookupSettings} */
export const DEFAULT_SETTINGS = Object.freeze({
  badgeMode: "auto",
  skipHosts: Object.freeze([]),
});

/**
 * Suffixes that never name a public website: reserved by RFC 2606 / 6761 /
 * 6762 / 7686 / 8375, ICANN's `.internal`, and names commonly used on private
 * networks. Matching a host here means it has no Domain Rating to look up.
 */
const PRIVATE_SUFFIXES = [
  "localhost",
  "local",
  "internal",
  "intranet",
  "test",
  "invalid",
  "example",
  "lan",
  "home",
  "corp",
  "onion",
  "arpa",
];

const IPV4_PATTERN = /^\d{1,3}(\.\d{1,3}){3}$/;
/** Dotted hostname as the URL parser emits it (IDNs arrive as `xn--`). */
const SKIP_ENTRY_PATTERN = /^[a-z0-9_-]+(\.[a-z0-9_-]+)+$/;

/**
 * True for hosts that must never be sent to Ahrefs: IP literals, single-label
 * names (`localhost`, `intranet`), and private or reserved suffixes.
 * Private hosts under a public domain (`wiki.corp.example.com`) cannot be
 * recognized here; the user skip list covers those.
 * @param {string | null | undefined} hostname canonical hostname
 * @returns {boolean}
 */
export function isPrivateHost(hostname) {
  if (!hostname || typeof hostname !== "string") return true;
  const host = hostname.toLowerCase().replace(/\.+$/, "");
  if (!host) return true;
  if (host.includes(":") || host.startsWith("[")) return true;
  if (IPV4_PATTERN.test(host)) return true;
  if (!host.includes(".")) return true;
  return PRIVATE_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

/**
 * Parse skip-list text (one host or URL per line; commas and spaces also
 * split) into canonical hostnames. Entries that are not dotted hostnames are
 * dropped; single-label names are already covered by `isPrivateHost`.
 * @param {string | null | undefined} text
 * @returns {string[]}
 */
export function parseSkipList(text) {
  if (!text || typeof text !== "string") return [];
  /** @type {string[]} */
  const out = [];
  for (const raw of text.split(/[\s,]+/)) {
    if (!raw) continue;
    const host = hostnameFromInput(raw.replace(/^\*\./, ""));
    if (!host || !SKIP_ENTRY_PATTERN.test(host) || out.includes(host)) continue;
    out.push(host);
    if (out.length >= SKIP_LIST_MAX_ENTRIES) break;
  }
  return out;
}

/**
 * A skip-list entry covers the host itself and every subdomain of it.
 * @param {string | null | undefined} hostname canonical hostname
 * @param {readonly string[]} skipHosts
 * @returns {boolean}
 */
export function isSkippedHost(hostname, skipHosts) {
  if (!hostname || !Array.isArray(skipHosts)) return false;
  return skipHosts.some(
    (entry) => hostname === entry || hostname.endsWith(`.${entry}`),
  );
}

/**
 * Normalize stored settings; anything unrecognized falls back to defaults.
 * @param {unknown} value
 * @returns {LookupSettings}
 */
export function parseSettings(value) {
  const row =
    value && typeof value === "object"
      ? /** @type {Record<string, unknown>} */ (value)
      : {};
  const badgeMode = row.badgeMode === "click" ? "click" : "auto";
  const skipHosts = Array.isArray(row.skipHosts)
    ? parseSkipList(row.skipHosts.filter((item) => typeof item === "string").join("\n"))
    : [];
  return { badgeMode, skipHosts };
}
