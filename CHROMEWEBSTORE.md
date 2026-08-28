# Chrome Web Store Listing — Domain Rating Lookup

> Last Updated: 2026-08-28

## Store Listing

**Extension Name** [REQUIRED]

Domain Rating Lookup

**Short Description** [REQUIRED]

See Domain Rating for the site you are viewing. Shows the score on the toolbar and in a simple popup.

**Detailed Description** [REQUIRED]

See the Domain Rating for any website you visit. The score appears on the toolbar icon, and a quick popup shows the rating details.

FEATURES
• Toolbar badge shows Domain Rating for the current site
• Popup shows Domain Rating with one-click copy
• Local DR trail remembers sites you looked up, with score change since last visit
• Recent list in the popup, with Clear to remove the local trail
• API key setup stays inside the popup Options screen
• Works after you add your own free Ahrefs account key
• Your key stays on this browser only and is used only to look up ratings

HOW TO USE
1. Install the extension and click the toolbar icon
2. Open Options inside the popup, paste a free Ahrefs API key from your Ahrefs account, then save
3. Visit any http or https website
4. Read the Domain Rating on the toolbar badge, or open the popup for details, delta, copy, and recent trail

PRIVACY
This extension does not run ads or analytics. It reads the hostname of the site you are viewing so it can look up Domain Rating, stores the API key you provide on your browser, and may keep a local Domain Rating trail (hostnames and ratings) for the recent list and delta. Lookups are sent only to Ahrefs. Clear removes the trail. See the privacy policy linked on this listing.

PERMISSIONS
• Tabs — needed so the toolbar badge can update when you switch sites
• Storage — needed to save your API key and optional local Domain Rating trail on this browser
• Access to api.ahrefs.com — needed to look up Domain Rating

ATTRIBUTION
Domain Rating by Ahrefs (http://ahrefs.com/legal/domain-rating-license). Use is subject to the Domain Rating License.

SUPPORT
Questions or issues: https://github.com/snowopsdev/dr-extension/issues
Contact: aj@snowops.dev

Version 1.2.1 — In-popup Options, cleaner rating UI, DR trail with deltas and copy.

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
| `tabs` | permissions | Read tab URLs when the user navigates or switches tabs, so the toolbar badge can show Domain Rating for the current site without requiring a click each time. |
| `storage` | permissions | Save the user-provided Ahrefs API key and optional local Domain Rating trail (hostnames + ratings) in this browser’s local extension storage. |
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
| User activity | Yes | Yes | Hostname of the site being viewed, used only to request Domain Rating for that domain. A short local trail of hostnames + ratings may also be stored on this browser for the popup recent list and delta (not uploaded). | Shared only with Ahrefs as the lookup target (trail stays local) |
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
| 1.2.1 | 2026-08-28 | In-popup Options (no chrome://extensions jump); remove license URL clutter; “domain rating” label | Submitted (CWS) / Released (GitHub `v1.2.1`) |
| 1.2.0 | 2026-08-28 | DR trail, score delta, one-click copy; Graphite Amber UI; toolbar badges | Draft |
| 1.1.0 | 2026-08-28 | First store-ready package draft (superseded before submit) | Draft |


## Review Notes

### Pre-submit package

- Zip: `dist/domain-rating-lookup.zip` (rebuild with `npm run package`)
- Manifest version: `1.2.1`
- Reload checklist: popup Options → save key → visit https site → badge shows rating → popup shows rating + delta/copy + recent trail → Clear removes trail

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
