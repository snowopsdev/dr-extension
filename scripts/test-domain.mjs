import assert from "node:assert/strict";
import { formatBadgeText } from "../lib/badge.js";
import {
  errorMessage,
  hostnameFromUrl,
  mapHttpError,
  parseDomainRatingResponse,
} from "../lib/domain.js";
import {
  TRAIL_MAX_ENTRIES,
  applyObservation,
  formatCopyLine,
  formatDeltaText,
  parseTrail,
  trailDelta,
} from "../lib/trail.js";

assert.equal(hostnameFromUrl("https://www.example.com/path"), "www.example.com");
assert.equal(hostnameFromUrl("http://example.com"), "example.com");
assert.equal(hostnameFromUrl("chrome://extensions"), null);
assert.equal(hostnameFromUrl("file:///tmp/x"), null);
assert.equal(hostnameFromUrl(undefined), null);

const ok = parseDomainRatingResponse({
  domain_rating: {
    domain_rating: 46.0,
    license: "http://ahrefs.com/legal/domain-rating-license",
  },
});
assert.equal(ok.ok, true);
if (ok.ok) {
  assert.equal(ok.data.rating, 46);
  assert.equal(ok.data.licenseUrl, "http://ahrefs.com/legal/domain-rating-license");
}

const bad = parseDomainRatingResponse({ domain_rating: { domain_rating: "x" } });
assert.equal(bad.ok, false);

assert.equal(mapHttpError(401, "").kind, "unauthorized");
assert.equal(mapHttpError(403, "").kind, "forbidden");
assert.equal(mapHttpError(429, "").kind, "rate_limited");
assert.equal(mapHttpError(400, '["Error","Bad"]').kind, "bad_request");
assert.equal(mapHttpError(500, "").kind, "server");

assert.match(errorMessage({ kind: "missing_key" }), /API key/);
assert.match(errorMessage({ kind: "unsupported_page" }), /http/);

assert.equal(formatBadgeText(94), "94");
assert.equal(formatBadgeText(94.0), "94");
assert.equal(formatBadgeText(94.5), "94.5");
assert.equal(formatBadgeText(100), "100");
assert.equal(formatBadgeText(Number.NaN), "");

assert.equal(formatCopyLine("example.com", 94), "example.com — DR 94");
assert.equal(formatCopyLine("example.com", 94.5), "example.com — DR 94.5");

assert.equal(formatDeltaText(0), "±0");
assert.equal(formatDeltaText(2), "+2");
assert.equal(formatDeltaText(-1.5), "-1.5");

{
  const t0 = 1_700_000_000_000;
  let trail = applyObservation([], "example.com", 90, t0);
  assert.equal(trail.length, 1);
  assert.equal(trail[0].domain, "example.com");
  assert.equal(trail[0].rating, 90);
  assert.equal(trail[0].previous, null);
  assert.deepEqual(trailDelta(trail[0]), { kind: "first" });

  trail = applyObservation(trail, "example.com", 90, t0 + 1000);
  assert.equal(trail[0].rating, 90);
  assert.equal(trail[0].seenAt, t0 + 1000);
  assert.equal(trail[0].previous, null);

  trail = applyObservation(trail, "example.com", 94, t0 + 2000);
  assert.equal(trail[0].rating, 94);
  assert.deepEqual(trail[0].previous, { rating: 90, seenAt: t0 + 1000 });
  assert.deepEqual(trailDelta(trail[0]), {
    kind: "delta",
    delta: 4,
    since: t0 + 1000,
  });

  trail = applyObservation(trail, "other.com", 10, t0 + 3000);
  assert.equal(trail[0].domain, "other.com");
  assert.equal(trail[1].domain, "example.com");

  assert.deepEqual(applyObservation(trail, "", 50, t0), trail);
  assert.deepEqual(applyObservation(trail, "x.com", Number.NaN, t0), trail);

  let capped = [];
  for (let i = 0; i < TRAIL_MAX_ENTRIES + 5; i += 1) {
    capped = applyObservation(capped, `d${i}.com`, i, t0 + i);
  }
  assert.equal(capped.length, TRAIL_MAX_ENTRIES);
  assert.equal(capped[0].domain, `d${TRAIL_MAX_ENTRIES + 4}.com`);
}

assert.deepEqual(parseTrail(null), []);
assert.deepEqual(parseTrail("nope"), []);
assert.deepEqual(parseTrail([{ domain: "", rating: 1, seenAt: 1 }]), []);
assert.deepEqual(parseTrail([{ domain: "a.com", rating: "x", seenAt: 1 }]), []);
{
  const parsed = parseTrail([
    {
      domain: "a.com",
      rating: 12,
      seenAt: 100,
      previous: { rating: 10, seenAt: 50 },
    },
    { domain: "b.com", rating: 3, seenAt: 200, previous: { rating: "bad" } },
    { skip: true },
  ]);
  assert.equal(parsed.length, 2);
  assert.deepEqual(parsed[0].previous, { rating: 10, seenAt: 50 });
  assert.equal(parsed[1].previous, null);
}

console.log("test-domain: ok");
