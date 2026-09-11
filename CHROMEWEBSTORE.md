# Chrome Web Store Listing — Domain Rating Lookup

> Last Updated: 2026-09-11

## Store Listing

**Extension Name** [REQUIRED]

Domain Rating Lookup

**Short Description** [REQUIRED]

See Domain Rating for the site you are viewing. Shows the score on the toolbar and in a simple popup.

**Detailed Description** [REQUIRED]

See the Domain Rating for any website you visit. The score appears on the toolbar icon, and a quick popup shows the rating details.

FEATURES
• Toolbar badge shows Domain Rating for the current site (active tab only)
• Popup shows Domain Rating with one-click copy
• Paste a domain in the popup to look it up without visiting it
• Local DR trail remembers domains you explicitly looked up (popup, Save to trail, or paste), with score change, Copy all (TSV), and Open
• Recent list in the popup, with Clear to remove the local trail
• Saving an API key checks it first; a rejected key is not stored
• API key setup stays inside the popup Options screen
• Works after you add your own free Ahrefs account key
• Your key stays on this browser only and is used only to look up ratings

HOW TO USE
1. Install the extension and click the toolbar icon
2. Open Options inside the popup, paste a free Ahrefs API key from your Ahrefs account, then save
3. Visit any http or https website
4. Read the Domain Rating on the toolbar badge, or open the popup for details, delta, copy, and recent trail
5. Optionally paste another domain, copy the trail as TSV, or open a listed site

PRIVACY
This extension does not run ads or analytics. It reads the hostname of the active tab so it can look up Domain Rating, stores the API key you provide on your browser, and keeps a local Domain Rating trail only for domains you explicitly looked up (not a browsing log). Lookups are sent only to Ahrefs. Saving a key sends one check request for example.com. Clear removes the trail. See the privacy policy linked on this listing.

PERMISSIONS
• Tabs — needed so the toolbar badge can update when you switch sites, and so Open can load a trail domain in a new tab
• Storage — needed to save your API key and optional local Domain Rating trail on this browser
• Access to api.ahrefs.com — needed to look up Domain Rating

ATTRIBUTION
Domain Rating by Ahrefs (http://ahrefs.com/legal/domain-rating-license). Use is subject to the Domain Rating License.

SUPPORT
Questions or issues: https://github.com/snowopsdev/dr-extension/issues
Contact: aj@snowops.dev

Version 1.3.0 — Honest trail (explicit lookups only), fewer API calls, key check on save, paste-a-domain, TSV copy, www collapse.

**Category** [REQUIRED]

Productivity

**Single Purpose** [REQUIRED]

Show Ahrefs Domain Rating for the website in the current browser tab.

**Primary Language** [REQUIRED]

English


## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | `icons/icon128.png` |
| Screenshot 1 [REQUIRED] | 1280×800 | ✅ Ready | `store/screenshots/01-popup-ready-1280x800.png` |
| Screenshot 2 [RECOMMENDED] | 1280×800 | ✅ Ready | `store/screenshots/02-options-1280x800.png` |
| Screenshot 3 [RECOMMENDED] | 1280×800 | ✅ Ready | `store/screenshots/03-popup-needs-key-1280x800.png` |
| Screenshot 4 | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 5 | 1280×800 or 640×400 | ⬜ Not created | |
| Small Promo Tile [RECOMMENDED] | 440×280 | ✅ Ready | `store/promo/small-promo-440x280.png` |
| Marquee Promo Tile | 1400×560 | ⬜ Not created | |

### Screenshot Notes

1. Success popup with Domain Rating, First look / delta, Copy, and Recent trail.
2. In-popup Options with API key field (local storage only).
3. Setup-required state with Add API key CTA.


## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `activeTab` | permissions | Read the URL of the tab when the user opens the popup, so Domain Rating can be looked up for that site. |
| `tabs` | permissions | Read the active tab URL when the user navigates or switches tabs, so the toolbar badge can show Domain Rating for the current site without requiring a click each time. Also used to open a trail domain in a new tab when the user clicks Open. |
| `storage` | permissions | Save the user-provided Ahrefs API key and optional local Domain Rating trail (hostnames + ratings for explicit lookups) in this browser’s local extension storage. |
| `https://api.ahrefs.com/*` | host_permissions | Call Ahrefs’ free Domain Rating endpoint to retrieve the rating shown in the badge and popup. |


## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** Yes

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | No | No | — | No |
| Health info | No | No | — | No |
| Financial info | No | No | — | No |
| Authentication info | Yes | Yes | User-provided Ahrefs API key, stored locally and sent to Ahrefs as a Bearer token for Domain Rating lookups | Shared only with Ahrefs as part of the API request |
| Personal communications | No | No | — | No |
| Location | No | No | — | No |
| Web history | No | No | — | No |
| User activity | Yes | Yes | Hostname of the active tab (and any domain you paste into the popup), used only to request Domain Rating. A short local trail of hostnames + ratings is stored only after you open the popup, click Save to trail, or complete a pasted lookup (not uploaded; not a browsing log). Saving a key also looks up example.com once to verify the token. | Shared only with Ahrefs as the lookup target (trail stays local) |
| Website content | No | No | — | No |

### Data Use Certification

- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes


## Privacy Policy

**Privacy Policy URL** [REQUIRED]

https://gist.github.com/snowopsdev/8ce34b2d81c64daa4bb0d1f331650297

Source files:

- `store/privacy.html` — hostable page
- `store/PRIVACY.md` — markdown source


## Distribution

**Visibility**: Public
**Regions**: All regions


## Developer Info

**Publisher Name** [REQUIRED]

Aj (snowopsdev)

**Contact Email** [REQUIRED]

aj@snowops.dev

**Support URL / Email** [RECOMMENDED]

https://github.com/snowopsdev/dr-extension/issues

**Homepage URL** [RECOMMENDED]

https://github.com/snowopsdev/dr-extension


## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.3.0 | 2026-09-11 | Trail writes only on explicit lookup; active-tab badge + 429 backoff; single Ahrefs client; key check on save; paste/TSV/Open; collapse www | Draft |
| 1.2.1 | 2026-08-28 | In-popup Options (no chrome://extensions jump); remove license URL clutter; “domain rating” label | Submitted (CWS) / Released (GitHub `v1.2.1`) |
| 1.2.0 | 2026-08-28 | DR trail, score delta, one-click copy; Graphite Amber UI; toolbar badges | Draft |
| 1.1.0 | 2026-08-28 | First store-ready package draft (superseded before submit) | Draft |


## Review Notes

### Pre-submit package

- Zip: `dist/domain-rating-lookup.zip` (rebuild with `npm run package`)
- Manifest version: `1.3.0`
- Reload checklist: popup Options → save key (invalid key is rejected; valid key should trigger one badge lookup, not two or three) → visit https site → badge shows rating without adding trail → open popup → site appears in Recent → paste a domain during the first fetch → pasted result wins → Copy all / Open → Clear removes trail. Upgrade from 1.2.1 clears the old trail.

### Known Issues / Limitations

- Requires a free Ahrefs account API key; there is no built-in shared key.
- Badge and popup only work on http(s) pages (not `chrome://` or the Web Store).
- Extension name is “Domain Rating Lookup”; Ahrefs is credited as the Domain Rating source per their license. Reviewers may ask about trademark use of “Ahrefs” / “Domain Rating” in the description — keep attribution clear and do not imply official Ahrefs authorship.
- `options.html` remains for Chrome’s manage-extension Options entry; primary UX is in-popup Options.

### Human actions still required

1. Wait for Chrome Web Store review (often a few days; email goes to aj@snowops.dev).
2. If rejected, paste the rejection notes here and we can triage fixes.
3. After publish, share the store URL and mark this version **Published**.

### Rejection History

(none yet)
