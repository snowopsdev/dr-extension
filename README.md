# Domain Rating Lookup

Chrome extension (Manifest V3) that shows Ahrefs Domain Rating for the site in your active tab using the free [`domain-rating-free`](https://docs.ahrefs.com/en/api/reference/public/get-domain-rating-free) API.

## Load unpacked

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click **Load unpacked**
4. Select this repository root (the folder that contains `manifest.json`)
5. Open **Options**, paste a free Ahrefs APIv3 key from [Ahrefs API keys](https://app.ahrefs.com/account/api)
6. Visit any https site — the toolbar badge shows Domain Rating; click the icon for details

## What it shows

Documented success fields from the free endpoint only:

- `domain_rating` (number)
- `license` (URL)

Attribution is required by Ahrefs: **Domain Rating by Ahrefs**.

## Develop

```bash
npm test
npm run smoke          # auth failure path without a key
AHREFS_API_KEY=… npm run smoke
npm run package        # writes dist/domain-rating-lookup.zip
```

## Store package

See `store/LISTING.md` and `store/PRIVACY.md`.
