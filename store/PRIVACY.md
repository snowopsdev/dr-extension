# Privacy Policy — Domain Rating Lookup

**Last updated:** 2026-08-28

## Summary

Domain Rating Lookup is a Chrome extension that shows Ahrefs Domain Rating for the site in your active browser tab. It does not run ads, sell data, or track you across the web.

## Data the extension handles

1. **Active tab hostname.** The extension reads the URL of the active tab (via `tabs` / `activeTab`) to extract the hostname for Ahrefs lookups and to show Domain Rating on the toolbar badge. It does not read page content.
2. **Ahrefs API key.** If you paste a free Ahrefs APIv3 key into Options, it is stored only in Chrome local storage on this browser (not synced across devices). The key is sent only to `https://api.ahrefs.com` as an `Authorization: Bearer` header when you request a Domain Rating lookup.
3. **API response fields.** The extension displays the documented fields returned by Ahrefs for your lookup (`domain_rating` and `license`), including as badge text on the action icon. Responses are not uploaded to any third party other than Ahrefs as part of that request.
4. **Local Domain Rating trail.** After a successful lookup, the extension may store the hostname and Domain Rating (plus a previous rating for delta display) in Chrome local storage on this browser only. This powers the recent list and “since last visit” delta in the popup. It is never uploaded or synced by this extension. Use **Clear** in the popup to remove the trail; uninstalling the extension also removes it.

## Data the extension does not collect

- No analytics, crash reporting, or advertising identifiers
- No account system operated by this extension
- No remote browsing-history logging (any recent DR trail stays on this browser only)
- No sale or sharing of personal information with data brokers

## Third parties

Lookups are sent to Ahrefs (`api.ahrefs.com`) under Ahrefs’ terms and the Domain Rating License. Review Ahrefs’ own policies for how they process API requests.

## Permissions

- `activeTab` — access the active tab URL when you use the extension action
- `tabs` — read tab URLs on navigation so the toolbar badge can show Domain Rating for the current site
- `storage` — store your API key and optional local Domain Rating trail on this browser
- Host access to `https://api.ahrefs.com/*` — perform Domain Rating lookups

## Your controls

Open the extension Options page to change or clear your API key. In the popup, use **Clear** to delete the local Domain Rating trail. Removing the extension deletes its locally stored data.

## Contact

For privacy questions about this extension, email aj@snowops.dev or open an issue on https://github.com/snowopsdev/dr-extension.
