# Privacy Policy — Domain Rating Lookup

**Last updated:** 2026-08-28

## Summary

Domain Rating Lookup is a Chrome extension that shows Ahrefs Domain Rating for the site in your active browser tab. It does not run ads, sell data, or track you across the web.

## Data the extension handles

1. **Active tab hostname.** When you open the popup, the extension reads the URL of the active tab (via the `activeTab` permission) and extracts the hostname to query Ahrefs. It does not read page content.
2. **Ahrefs API key.** If you paste a free Ahrefs APIv3 key into Options, it is stored in Chrome’s sync storage associated with your browser profile. The key is sent only to `https://api.ahrefs.com` as an `Authorization: Bearer` header when you request a Domain Rating lookup.
3. **API response fields.** The extension displays the documented fields returned by Ahrefs for your lookup (`domain_rating` and `license`). Responses are not uploaded to any third party other than Ahrefs as part of that request.

## Data the extension does not collect

- No analytics, crash reporting, or advertising identifiers
- No account system operated by this extension
- No browsing history logging
- No sale or sharing of personal information with data brokers

## Third parties

Lookups are sent to Ahrefs (`api.ahrefs.com`) under Ahrefs’ terms and the Domain Rating License. Review Ahrefs’ own policies for how they process API requests.

## Permissions

- `activeTab` — access the active tab URL only when you use the extension action
- `storage` — store your API key locally
- Host access to `https://api.ahrefs.com/*` — perform Domain Rating lookups

## Contact

For privacy questions about this extension, open an issue on the project repository that distributes this package.
