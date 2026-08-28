# How: Ahrefs Domain Rating Chrome extension (target system)

## Overview

Greenfield Manifest V3 extension. On toolbar click, resolve the active tab's hostname, call Ahrefs `GET /v3/public/domain-rating-free`, and show every documented success field. No prior code exists in this repo.

## Key concepts

- **Active tab domain.** Hostname from the focused http(s) tab. Non-http(s) pages are unsupported.
- **Free DR endpoint.** `https://api.ahrefs.com/v3/public/domain-rating-free`. Free of API units. Requires a free APIv3 Bearer key (docs as of 2026-08-28).
- **Documented payload.** Nested object `domain_rating` with `domain_rating` (float) and `license` (URL). No rank or backlink fields on this endpoint.
- **Attribution.** Domain Rating License requires visible "Domain Rating by Ahrefs" with link to https://ahrefs.com/.

## How it works

1. User opens the action popup (or needs an API key first via options).
2. Popup reads `chrome.storage` for the Bearer token.
3. Popup uses `chrome.tabs.query({ active: true, currentWindow: true })` under `activeTab`.
4. If scheme is not http/https, show an unsupported-page state.
5. Extension fetches the free endpoint with `target=<hostname>` and `Authorization: Bearer <key>`.
6. Boundary parse turns wire JSON into a typed `DomainRating` or a typed error kind (401, 403, 429, 400, network, parse).
7. Popup renders the rating, license link, and required attribution.

## Where things live (planned)

- `manifest.json` owns MV3 permissions and entry points.
- `popup.*` owns the one-job UI and view state machine.
- `lib/domain.js` owns pure parse and domain helpers.
- `options.*` owns API key entry.
- `icons/` and `store/` own listing assets and privacy copy.

## Gotchas

- Docs once advertised keyless access. Current docs and live calls require a key (403 without, 401 with bad token).
- Do not invent ahrefs_rank or backlinks. Those are other products.
- Host permission must cover `https://api.ahrefs.com/*`. Tab URL needs only `activeTab`.
