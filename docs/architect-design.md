# Architect: Domain Rating extension

## Phase A

Skipped. Greenfield empty repo. Grounding is `docs/how-subsystem.md` plus live API probes (403 without key, 401 with bad Bearer).

## Caller usage (written first)

```js
const tab = await getActiveTab();
const domain = hostnameFromTab(tab); // null => unsupported
const key = await loadApiKey(); // null => needs_key
const result = await fetchDomainRating({ domain, key });
// result: { ok: true, data: DomainRating } | { ok: false, error: FetchError }
render(viewStateFrom(result, domain));
```

## Candidate A. Popup owns fetch

**Modules.** `popup.js` + `lib/domain.js` + `options.js`. No service worker logic beyond MV3 default.

**Types.**

```ts
type DomainRating = { rating: number; licenseUrl: string };

type FetchError =
  | { kind: 'missing_key' }
  | { kind: 'unsupported_page' }
  | { kind: 'unauthorized' }
  | { kind: 'forbidden' }
  | { kind: 'rate_limited' }
  | { kind: 'bad_request'; detail: string }
  | { kind: 'network'; detail: string }
  | { kind: 'parse' }
  | { kind: 'server' };

type ViewState =
  | { status: 'loading'; domain: string }
  | { status: 'ready'; domain: string; data: DomainRating }
  | { status: 'error'; domain: string | null; error: FetchError }
  | { status: 'needs_key' };
```

**Organizing structure.** Discriminated union state machine for the popup. Pure parse at the API boundary in `lib/domain.js`.

**Rejected.** Background prefetch on every navigation (permissions bloat, license scraping risk).

## Candidate B. Service worker API client

**Modules.** Popup messages SW. SW owns `fetchDomainRating`. Popup is display-only.

**Types.** Same domain types. Adds `Message` request/response envelope.

**Tradeoff.** Clearer separation, more IPC and boilerplate for one GET.

## Synthesis decision

**Base: Candidate A.** Laziness Protocol. One job, one click, no shared mutable cache.

**Graft from B.** Keep pure `lib/domain.js` as the only place that knows wire shape. Popup and options stay thin shells (Boundary Discipline).

**Rejected from B.** Message-passing layer. No concurrent callers to justify it.

## Public surface

| Symbol | Role |
| --- | --- |
| `hostnameFromUrl(url)` | Boundary parse of tab URL → hostname or null |
| `parseDomainRatingResponse(json)` | Wire → `DomainRating` or parse error |
| `mapHttpError(status, body)` | HTTP → `FetchError` |
| `fetchDomainRating({ domain, key })` | Network + parse |
| `ViewState` | UI state machine |

## Manifest contract

- `permissions`: `activeTab`, `storage`
- `host_permissions`: `https://api.ahrefs.com/*`
- `action.default_popup`: `popup.html`
- `options_ui.page`: `options.html`
