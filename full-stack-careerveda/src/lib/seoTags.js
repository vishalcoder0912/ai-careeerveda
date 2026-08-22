// Keeps the document head's SEO tags in sync with the current route.
//
// The site is client-rendered, so index.html ships one static set of tags and
// this rewrites them as you navigate. That matters for Google, which runs JS
// before indexing. It does NOT reach the social crawlers — Facebook, LinkedIn,
// WhatsApp and X read the raw HTML and never execute a line of it, so they will
// keep showing index.html's defaults for every URL until the site is prerendered.
// That is a known ceiling of the SPA, not something this file can work around.
//
// Every write is an upsert against a tag that already exists in index.html, so
// navigating does not accumulate duplicates — the crawler-visible default is
// edited in place rather than appended to.

// Finds a tag by selector, or creates it with the given attributes and appends
// it to <head>. Returns the element either way.
function upsert(selector, create) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  return el;
}

function setMeta(attr, key, content) {
  if (!content) return;
  const el = upsert(`meta[${attr}="${key}"]`, () => {
    const node = document.createElement("meta");
    node.setAttribute(attr, key);
    return node;
  });
  el.setAttribute("content", content);
}

// og:*, article:* and friends are `property`; description/twitter:* are `name`.
// Getting this wrong is the classic silent OG bug: the tag renders, validators
// just ignore it.
export const setMetaProperty = (key, content) => setMeta("property", key, content);
export const setMetaName = (key, content) => setMeta("name", key, content);

export function setCanonical(href) {
  if (!href) return;
  const el = upsert('link[rel="canonical"]', () => {
    const node = document.createElement("link");
    node.setAttribute("rel", "canonical");
    return node;
  });
  el.setAttribute("href", href);
}

// GA4 page views are reported from here rather than from the route change in
// App.jsx, because this is the one point every route passes through with its
// final title in hand: static routes are applied by RouteMeta, /programs/:slug
// and /blog/:slug by their own pages once the record has loaded.
//
// Reporting on navigation instead sent the bare "CareerVeda" placeholder as the
// title for both dynamic routes — the detail page had not refined it yet. GA4's
// default "Pages and screens" report groups by page title, so all nine programs
// and all twenty articles would have collapsed into a single row.
let lastReportedPath = null;

function reportPageView(title) {
  if (typeof window.gtag !== "function") return;

  // Read from location rather than the `url` argument: that one is the canonical
  // (no query string), and campaign traffic arrives with ?utm_source=… which is
  // the whole point of tagging a campaign.
  const path = window.location.pathname + window.location.search;

  // applySeo re-runs whenever its inputs settle — a program page calls it again
  // when the description resolves — and that is not a second visit.
  if (path === lastReportedPath) return;
  lastReportedPath = path;

  window.gtag("event", "page_view", {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.href,
  });
}

// Applies one route's full SEO surface. `url` must already be absolute — every
// caller builds it through absoluteUrl(), so relative paths never get this far.
export function applySeo({title, description, url, image, type = "website"}) {
  reportPageView(title);

  setMetaName("description", description);
  setCanonical(url);

  setMetaProperty("og:title", title);
  setMetaProperty("og:description", description);
  setMetaProperty("og:url", url);
  setMetaProperty("og:type", type);
  setMetaProperty("og:image", image);

  setMetaName("twitter:title", title);
  setMetaName("twitter:description", description);
  setMetaName("twitter:image", image);
}
