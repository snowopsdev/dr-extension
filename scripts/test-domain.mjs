import assert from "node:assert/strict";
import {
  errorMessage,
  hostnameFromUrl,
  mapHttpError,
  parseDomainRatingResponse,
} from "../lib/domain.js";

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

console.log("test-domain: ok");
