# Chrome Web Store listing

## Name

Domain Rating Lookup

## Short description (≤132 chars)

See Ahrefs Domain Rating for the site you are viewing. Uses the free Ahrefs Domain Rating API.

## Detailed description

Domain Rating Lookup shows the Ahrefs Domain Rating for the website in your active tab.

How it works
1. Open any http or https page.
2. Click the extension icon.
3. The popup calls Ahrefs’ free Domain Rating endpoint for that hostname.
4. You see every documented response field from that endpoint.

What you see
- domain_rating: Ahrefs Domain Rating on a 0–100 logarithmic scale
- license: URL of the Domain Rating license terms

Setup
Ahrefs requires a free APIv3 key for this endpoint. Generate one in Ahrefs → Account → API keys, then paste it into the extension Options page. The key stays in Chrome sync storage on your profile and is sent only to api.ahrefs.com.

Privacy
This extension does not collect analytics, accounts, or browsing history beyond the active tab hostname used for the lookup you request. See the privacy policy included with this package.

Attribution
Domain Rating by Ahrefs (https://ahrefs.com/). Use is subject to the Domain Rating License.

## Category

Productivity

## Language

English

## Single purpose

Display Ahrefs Domain Rating for the current tab’s domain using the free public Ahrefs API.

## Permission justification

- activeTab: read the URL of the tab you clicked the action on, so the hostname can be looked up.
- storage: save your Ahrefs API key locally in Chrome sync storage.
- Host permission https://api.ahrefs.com/*: call the free Domain Rating API.

## Privacy practices (dashboard answers)

- Does not collect user data for sale or advertising
- Does not collect personally identifiable information
- Does not collect authentication information beyond the API key you choose to store locally
- Does not collect website content
- Remote code: none
- Certify: single purpose above

## Screenshots guidance

Capture from a loaded unpacked build after saving a valid API key:

1. Popup on https://example.com showing the large domain_rating value and license URL (1280×800 or 640×400).
2. Options page with the API key field and the Ahrefs key help link.
3. Optional: unsupported page state on chrome://extensions.

Generated placeholder frames live in `store/screenshots/` for layout reference. Replace with real Chrome captures before submit.

## Submit blockers for the human

1. Free Ahrefs APIv3 key (for your own smoke test and optional listing demo).
2. Chrome Web Store developer dashboard login.
3. Real screenshots from Chrome (placeholders are not sufficient for a polished listing).
4. Hosted privacy policy URL (file is `store/PRIVACY.md`; publish it to a public HTTPS URL and paste that URL into the Privacy tab).
5. Click Upload + Submit for Review in the dashboard (irreversible publish path).

## Package

`dist/domain-rating-lookup.zip`
