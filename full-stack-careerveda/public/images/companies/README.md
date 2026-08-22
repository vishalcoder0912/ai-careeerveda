# Company logos

Drop each company's logo image into **this folder** using the exact filename
below. As soon as a file exists at the expected path, the "Trusted by 900+
Leading Organizations" marquee on the home page swaps the text label for the
image automatically — no code changes needed. Until then, the card falls back to
showing the company name as text, so the section never looks broken.

## How to add / change a logo

1. Save the logo as a **PNG** (transparent background looks best) into this
   folder using the filename in the table.
2. Refresh the page — the logo appears in the marquee.

That's it. To add a brand-new company (not in the list), also add one line to
`src/data/companyLogos.js` following the same pattern.

## Recommended image specs

- **Format:** PNG with a transparent background. **SVG** and **WEBP** also work
  automatically — just drop `deloitte.svg` (or `.webp`) instead of `deloitte.png`
  and the marquee finds it. No code change needed.
- **Size:** roughly **300 × 125 px** (the card area). Logos are auto-scaled to
  fit (`object-fit: contain`), so exact size isn't critical — just keep it
  reasonably sharp and not tiny.
- **Look:** dark or full-colour logo on a transparent background (the cards are
  white).

## Expected filenames

| Company     | Filename           |
| ----------- | ------------------ |
| Deloitte    | `deloitte.png`     |
| Amazon      | `amazon.png`       |
| Microsoft   | `microsoft.png`    |
| IBM         | `ibm.png`          |
| Razorpay    | `razorpay.png`     |
| PepsiCo     | `pepsico.png`      |
| BlackRock   | `blackrock.png`    |
| Zomato      | `zomato.png`       |
| HighRadius  | `highradius.png`   |
| PwC         | `pwc.png`          |
| Abbott      | `abbott.png`       |
| Cisco       | `cisco.png`        |
| Accenture   | `accenture.png`    |
| TCS         | `tcs.png`          |
| Infosys     | `infosys.png`      |
| Adobe       | `adobe.png`        |

> Use logos you have the right to display. The filenames above are just the
> paths the site looks for; the actual artwork is supplied by you.
