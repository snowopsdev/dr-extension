# Domain Rating Lookup — icon variants

Proposed Chrome extension icons. **Do not copy into `icons/` until a winner is chosen.**

## Chrome icon requirements (summary)

From [Configure extension icons](https://developer.chrome.com/docs/extensions/develop/ui/configure-icons) and [Supplying Images](https://developer.chrome.com/docs/webstore/images):

| Size | Use |
|------|-----|
| **16×16** | Toolbar / favicon / context menu |
| **32×32** | Windows / HiDPI toolbar |
| **48×48** | `chrome://extensions` management page |
| **128×128** | Install dialog + Chrome Web Store (required) |

**Store / visual guidelines:**

- Prefer **PNG** with transparency; icons must be **square**.
- For the **128** store asset, keep artwork near **96×96** with ~**16px transparent padding** per side (~75% fill).
- Simple silhouette; avoid tiny detail that vanishes at 16px.
- No outer edge/border on the canvas (Chrome may add chrome).
- Avoid large drop shadows; face the viewer (no forced perspective).
- Should read on both light and dark toolbars.

Brand palette used across variants: teal `#0b6e6a`, ink `#13202c`, soft mint atmospheres.

---

## Variants

### Variant A — DR Monogram

**Pitch:** Bold white “DR” on a solid teal squircle — highest contrast, product-name literal.

| File | Notes |
|------|--------|
| `variant-a/preview-sheet.png` | Size + dark-bg comparison |
| `variant-a/preview-128.png` | Large preview |
| `variant-a/icon16.png` | |
| `variant-a/icon32.png` | |
| `variant-a/icon48.png` | |
| `variant-a/icon128.png` | Store size (padded) |
| `variant-a/master-1024.png` | Source master |
| `variant-a/qa-16px-upscaled.png` | Nearest-neighbor ×8 of 16px |

### Variant B — Score Gauge

**Pitch:** Minimal dial/arc with needle — communicates “rating score” without letters.

| File | Notes |
|------|--------|
| `variant-b/preview-sheet.png` | Size + dark-bg comparison |
| `variant-b/preview-128.png` | Large preview |
| `variant-b/icon16.png` | |
| `variant-b/icon32.png` | |
| `variant-b/icon48.png` | |
| `variant-b/icon128.png` | Store size (padded) |
| `variant-b/master-1024.png` | Source master |
| `variant-b/ai-reference-1024.png` | AI concept reference (if present) |
| `variant-b/qa-16px-upscaled.png` | Nearest-neighbor ×8 of 16px |

### Variant C — Ascending Bars

**Pitch:** Three rising teal bars on a soft plate — rank / strength metaphor, very clear at 16px.

| File | Notes |
|------|--------|
| `variant-c/preview-sheet.png` | Size + dark-bg comparison |
| `variant-c/preview-128.png` | Large preview |
| `variant-c/icon16.png` | |
| `variant-c/icon32.png` | |
| `variant-c/icon48.png` | |
| `variant-c/icon128.png` | Store size (padded) |
| `variant-c/master-1024.png` | Source master |
| `variant-c/qa-16px-upscaled.png` | Nearest-neighbor ×8 of 16px |

### Variant D — Globe Rating

**Pitch:** Simple globe + teal rating badge/chevron — “domain / web” + score accent.

| File | Notes |
|------|--------|
| `variant-d/preview-sheet.png` | Size + dark-bg comparison |
| `variant-d/preview-128.png` | Large preview |
| `variant-d/icon16.png` | |
| `variant-d/icon32.png` | |
| `variant-d/icon48.png` | |
| `variant-d/icon128.png` | Store size (padded) |
| `variant-d/master-1024.png` | Source master |
| `variant-d/qa-16px-upscaled.png` | Nearest-neighbor ×8 of 16px |

---

## Recommendation

For **16px toolbar legibility**, prefer **Variant A (DR Monogram)** or **Variant C (Ascending Bars)**.

- **A** wins on brand specificity (“DR”) and contrast.
- **C** wins on instant “score/rank” metaphor with chunky shapes.
- **B** is strong at 48–128; the needle is harder to resolve at 16.
- **D** is distinctive but busier; latitude lines soften at 16.

Pick one variant, then copy its `icon{16,32,48,128}.png` into `/icons/` and repackage.
