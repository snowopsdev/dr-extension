# Chrome Web Store Listing — Domain Rating Lookup

> Last Updated: 2026-08-28

## Store Listing

**Extension Name** [REQUIRED]

Domain Rating Lookup

**Short Description** [REQUIRED]

See Domain Rating for the site you are viewing. Shows the score on the toolbar and in a simple popup.

**Detailed Description** [REQUIRED]

See the Domain Rating for any website you visit. The score appears on the toolbar icon, and a quick popup shows the full rating details.

FEATURES
• Toolbar badge shows Domain Rating for the current site
• Popup shows the rating and license link for that domain
• Local DR trail remembers sites you looked up, with score change since last visit
• One-click copy of domain and Domain Rating for notes or spreadsheets
• Recent list in the popup, with Clear to remove the local trail
• Works after you add your own free Ahrefs account key in Options
• Your key stays on this browser only and is used only to look up ratings

HOW TO USE
1. Install the extension and open Options
2. Create a free Ahrefs API key in your Ahrefs account, then paste it into Options and save
3. Visit any http or https website
4. Read the Domain Rating on the toolbar badge, or click the icon for details, delta, copy, and recent trail

PRIVACY
This extension does not run ads or analytics. It reads the hostname of the site you are viewing so it can look up Domain Rating, stores the API key you provide on your browser, and may keep a local Domain Rating trail (hostnames and ratings) for the recent list and delta. Lookups are sent only to Ahrefs. Clear removes the trail. See the privacy policy linked on this listing.

PERMISSIONS
• Tabs — needed so the toolbar badge can update when you switch sites
• Storage — needed to save your API key and optional local Domain Rating trail on this browser
• Access to api.ahrefs.com — needed to look up Domain Rating

ATTRIBUTION
Domain Rating by Ahrefs (https://ahrefs.com/). Use is subject to the Domain Rating License.

SUPPORT
Questions or issues: https://github.com/snowopsdev/dr-extension/issues
Contact: aj@snowops.dev

Version 1.2.0 — DR trail with score deltas, one-click copy, Graphite Amber UI, toolbar badges.

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

1. Success popup on example.com with large Domain Rating, delta/copy, and recent trail (Graphite Amber UI).
2. Options page where the user pastes a free Ahrefs key (local storage only).
3. Setup-required popup before a key is saved.


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

(Optional later: GitHub Pages at `https://snowopsdev.github.io/dr-extension/privacy.html` from `store/privacy.html`.)

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
| 1.2.0 | 2026-08-28 | DR trail (recent lookups), score delta since last visit, one-click copy; Graphite Amber UI; toolbar badges; local API key | Draft |
| 1.1.0 | 2026-08-28 | First store-ready package draft (superseded before submit by 1.2.0) | Draft |


## Review Notes

### Pre-submit package

- Zip: `dist/domain-rating-lookup.zip` (rebuild with `npm run package`)
- Manifest version: `1.2.0`
- Reload checklist: Options key save → visit https site → badge shows rating → popup shows rating + license + delta/copy → recent trail appears → Clear removes trail

### Known Issues / Limitations

- Requires a free Ahrefs account API key; there is no built-in shared key.
- Badge and popup only work on http(s) pages (not `chrome://` or the Web Store).
- Extension name is “Domain Rating Lookup”; Ahrefs is credited as the Domain Rating source per their license. Reviewers may ask about trademark use of “Ahrefs” / “Domain Rating” in the description — keep attribution clear and do not imply official Ahrefs authorship.
- In-memory badge cache was moved to `chrome.storage.session` so service worker restarts do not rely on process memory alone.

### Human actions still required

1. Sign in to the Chrome Web Store Developer Dashboard.
2. Create a new item → upload `dist/domain-rating-lookup.zip`.
3. Paste listing fields from this file; upload `icons/icon128.png`, screenshots under `store/screenshots/`, and `store/promo/small-promo-440x280.png`.
4. Privacy policy URL: https://gist.github.com/snowopsdev/8ce34b2d81c64daa4bb0d1f331650297
5. Fill privacy disclosures to match the table above.
6. Submit for review.

### Rejection History

(none yet)
