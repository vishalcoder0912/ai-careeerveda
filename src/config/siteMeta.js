// Site-level identity used by everything that has to name or link to the site
// from the outside: canonical tags, Open Graph, Twitter cards, JSON-LD, and the
// sitemap generator in scripts/generate-sitemap.mjs.
//
// ─────────────────────────────────────────────────────────────────────────────
// SET SITE_URL BEFORE THE NEXT DEPLOY.
// ─────────────────────────────────────────────────────────────────────────────
// This one constant is the origin every absolute URL on the site is built from.
// Point it at the exact host you serve — scheme included, no trailing slash, and
// the www/apex spelling you actually redirect *to*. Canonicals that name a host
// you redirect away from tell Google to index a URL that does not answer, which
// is worse than having no canonical at all.
//
// It lives here, alone, so that changing domains is one edit rather than a grep.
//
// NOW SET. It was commented out, which meant absoluteUrl() referenced an
// undefined binding and every module that imported this file threw — which is
// why seoTags.js and structuredData.js were written but never wired to a single
// route. Turning it on is what makes the rest of the SEO surface possible.
//
// APEX, NOT www — and this has to stay in step with the deployment.
//
// It read "https://www.careerveda.in" until the GCP review, while the whole
// Cloud Run setup is apex-based: cloudbuild.yaml deploys `_DOMAIN:
// careerveda.in`, deploy-cloudrun.sh maps careerveda.in / admin.careerveda.in /
// api.careerveda.in, and no www mapping exists at all. Two things broke as a
// result, and the second is worse than the SEO one:
//
//   Every canonical, the sitemap, llms.txt and all 60 prerendered heads named a
//   host Cloud Run does not serve. A canonical is an instruction, not a hint —
//   it was telling Google the real address of each page is somewhere that does
//   not answer.
//
//   CORS_ALLOWED_ORIGINS is the apex and admin subdomain only. A visitor who
//   reached www would have had every API call blocked: no programs, no working
//   forms.
//
// nginx.conf now 301s www to the apex, so the spelling below is the one host
// everything else resolves to. If the canonical host ever changes, change it
// here, in cloudbuild.yaml's _DOMAIN, and in the nginx redirect together.
export const SITE_URL = "https://careerveda.in";

export const SITE_NAME = "CareerVeda";

export const SITE_TAGLINE = "AI-Powered Career Platform";

// The picture social platforms show when a link is posted. Facebook, LinkedIn,
// WhatsApp and X all want an absolute URL — a relative path silently renders no
// preview at all — so this is a full ImageKit URL rather than a /public asset.
// 1200x630 is the ratio every one of those platforms crops to.
export const OG_IMAGE = "https://ik.imagekit.io/ojoijfoinsdnfoodsnf/careerveda/brand/cvfavicon-039eb18e.jpg?tr=w-1200,h-630,cm-pad_resize,bg-0B1220";
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

// Used by the Organization JSON-LD. Only fields we can actually stand behind are
// listed: a knowledge-panel claim that is wrong is worse than one that is absent.
export const ORGANISATION = {
  email: "Info@careerveda.in",
  telephone: "+91 9217801191",
  logo: "https://ik.imagekit.io/ojoijfoinsdnfoodsnf/careerveda/brand/cvfavicon-039eb18e.jpg?tr=w-512",
  // Spellings a person plausibly types for this brand. Only real variants —
  // padding this with keywords ("data science course") is the classic way to
  // get structured data ignored site-wide, and it would not match a brand query
  // anyway.
  alternateNames: ["Career Veda", "CareerVeda India", "careerveda.in"],
  // One sentence, written for a human reading a knowledge panel rather than for
  // a crawler counting words.
  description:
    "CareerVeda is an Indian ed-tech company offering mentor-led postgraduate programs in product management, data analytics, data science with AI, investment banking, cybersecurity and data engineering, with placement assistance and live industry projects.",
};

// Joins a route onto SITE_URL. Takes "/programs" or "programs" and always
// returns exactly one slash between them. "/" returns the bare origin rather
// than "https://site/" + "/", which would canonicalise the home page to a
// double-slash URL that is not the one anyone links to.
export function absoluteUrl(path = "/") {
  if (!path || path === "/") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
