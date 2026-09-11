# Privacy Policy — Domain Rating Lookup

**Last updated:** 2026-09-11

## Summary

Domain Rating Lookup is a Chrome extension that shows Ahrefs Domain Rating for the site in your active browser tab. It does not run ads, sell data, or track you across the web.

## Data the extension handles

1. **Active tab hostname.** The extension reads the URL of the active tab (via `tabs` / `activeTab`) to extract the hostname for Ahrefs lookups and to show Domain Rating on the toolbar badge. It does not read page content. Badge lookups are limited to the active tab.
2. **Ahrefs API key.** If you paste a free Ahrefs APIv3 key into Options, it is stored only in Chrome local storage on this browser (not synced across devices). The key is sent only to `https://api.ahrefs.com` as an `Authorization: Bearer` header when you request a Domain Rating lookup. Saving a key first checks it with one lookup of `example.com`; a rejected key is not stored.
3. **API response fields.** The extension shows Domain Rating from Ahrefs (including as badge text). Attribution appears in the popup footer. Responses are not uploaded to any third party other than Ahrefs as part of that request. Successful badge lookups may be cached in Chrome session storage for about one hour so the toolbar can reuse a score without writing a trail entry.
4. **Local Domain Rating trail.** The extension stores hostname and Domain Rating (plus a previous rating for delta display) in Chrome local storage only after an explicit lookup: opening the popup on a site, clicking **Save to trail**, or a successful pasted-domain lookup. Badge prefetch does not write this list. The trail is never uploaded or synced by this extension. Use **Clear** in the popup to remove it; uninstalling the extension also removes it.

## Data the extension does not collect

- No analytics, crash reporting, or advertising identifiers
- No account system operated by this extension
- No remote browsing-history logging (the Recent trail is not a log of sites you visited; it stays on this browser only)
- No sale or sharing of personal information with data brokers

## Third parties

Lookups are sent to Ahrefs (`api.ahrefs.com`) under Ahrefs’ terms and the Domain Rating License. Review Ahrefs’ own policies for how they process API requests.

## Permissions

- `activeTab` — access the active tab URL when you use the extension action
- `tabs` — read the active tab URL on navigation so the toolbar badge can show Domain Rating for the current site, and open a trail domain in a new tab when you click Open
- `storage` — store your API key and optional local Domain Rating trail on this browser
- Host access to `https://api.ahrefs.com/*` — perform Domain Rating lookups

## Your controls

Open **Options** inside the extension popup to change or clear your API key. In the popup, use **Clear** on the recent list to delete the local Domain Rating trail. Removing the extension deletes its locally stored data.

## Contact

For privacy questions about this extension, email aj@snowops.dev or open an issue on https://github.com/snowopsdev/dr-extension.
