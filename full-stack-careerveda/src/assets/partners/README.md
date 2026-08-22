# Partner logos

**Drop an image in this folder and it appears in the home page partner band.**
Delete one and it's gone. No code changes needed — `src/data/partnerLogos.js`
globs this directory at build time.

The current files are **typographic placeholders, not official brand assets**:
hand-made wordmarks set in the site's font, so the band works end to end without
hotlinking logos from Clearbit or a CDN, either of which can change or disappear
and break the page.

## Adding or replacing a logo

Save the file here. That's the whole process.

| Requirement | Value |
| --- | --- |
| Format | `.svg` preferred (transparent background); `.png`, `.jpg`, `.webp` also work |
| Filename | lowercase, hyphenated — it becomes the company name |
| Aspect | roughly 240 × 64 (a wide wordmark). The CSS uses `contain`, so other ratios fit without stretching |
| Colour | must stay legible on the **dark** partner band. A solid-black logo (e.g. Deloitte's real wordmark) will disappear — use the light/reverse variant most brand kits provide |

### The filename becomes the name

`salesforce.svg` → "Salesforce". `goldman-sachs.svg` → "Goldman Sachs". For
casing a filename can't express — `highradius.svg` → "HighRadius" — add an entry
to `DISPLAY_NAMES` in `src/data/partnerLogos.js`.

### Controlling the order

Files sort by filename. To pin an order, prefix with digits — `01-deloitte.svg`,
`02-amazon.svg` — and the prefix is stripped from the displayed name.

## Rights

Check yours before publishing. Showing a company's logo as a hiring partner
normally requires that the relationship is real and, for some brands, their
written permission. Download official assets from each company's brand or press
page (search "<company> brand assets" / "press kit").
