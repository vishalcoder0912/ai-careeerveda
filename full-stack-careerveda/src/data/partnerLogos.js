// The partner band's logo list builds itself from whatever is in
// src/assets/partners/. Drop an image in that folder and it shows up in the
// trail; delete one and it's gone. No edit here is required for either.
//
// Vite resolves this glob at build time, so the images are hashed, fingerprinted
// and bundled like any other asset — which is why they live under src/ rather
// than public/.

const modules = import.meta.glob("../assets/partners/*.{svg,png,jpg,jpeg,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});

// Casing a filename can't carry. Anything not listed here is title-cased from
// its filename, which is right for the common case (salesforce.svg -> Salesforce).
const DISPLAY_NAMES = {
  blackrock: "BlackRock",
  finbox: "FinBox",
  highradius: "HighRadius",
  ibm: "IBM",
  pepsico: "PepsiCo",
  pw: "PW",
  tcs: "TCS",
};

// Files sort by filename, so an optional numeric prefix pins the order:
// 01-deloitte.svg, 02-amazon.svg, ... The prefix is stripped from the name.
const toSlug = (path) =>
  path
    .split("/")
    .pop()
    .replace(/\.\w+$/, "")
    .replace(/^\d+[-_]/, "");

const toDisplayName = (slug) =>
  DISPLAY_NAMES[slug] ??
  slug
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export const partnerLogos = Object.entries(modules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, logo]) => ({name: toDisplayName(toSlug(path)), logo}));
