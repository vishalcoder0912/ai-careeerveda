

export const loadProgramsPage = () => import("../pages/ProgramsPage");
export const loadProgramDetailPage = () => import("../pages/ProgramDetailPage");
export const loadJobsPage = () => import("../pages/JobsPage");
export const loadFacultyPage = () => import("../pages/FacultyPage");
export const loadBlogPage = () => import("../pages/BlogPage");
export const loadBlogDetailPage = () => import("../pages/BlogDetailPage");
export const loadAboutPage = () => import("../pages/AboutPage");
export const loadContactPage = () => import("../pages/ContactPage");
export const loadAlumniPage = () => import("../pages/AlumniPage");
export const loadEnrollPage = () => import("../pages/EnrollPage");
export const loadPolicyPage = () => import("../pages/PolicyPage");

const EXACT_ROUTES = {
  "/programs": loadProgramsPage,
  "/jobs": loadJobsPage,
  "/achievers": loadJobsPage, // redirects to /jobs — warm what it lands on
  "/faculty": loadFacultyPage,
  "/blog": loadBlogPage,
  "/about": loadAboutPage,
  "/contact": loadContactPage,
  "/alumni": loadAlumniPage,
  "/enroll": loadEnrollPage,
  "/privacy-policy": loadPolicyPage,
  "/refund-policy": loadPolicyPage,
  "/terms": loadPolicyPage,
  "/escalation-policy": loadPolicyPage,
};

/** The loader for a pathname, or null when the path has no chunk of its own. */
export const loaderForPath = (pathname) => {
  if (EXACT_ROUTES[pathname]) return EXACT_ROUTES[pathname];
  // /programs/:slug — one chunk shared by every program page.
  if (/^\/programs\/[^/]+\/?$/.test(pathname)) return loadProgramDetailPage;
  if (/^\/blog\/[^/]+\/?$/.test(pathname)) return loadBlogDetailPage;
  return null;
};

// import() resolves from the registry on a repeat call, but each one still costs
// a promise and a microtask, and this runs on pointer moves. A Set of the
// loaders already asked for keeps a hover across the whole navbar cheap.
const warmed = new Set();

export const prefetchRoute = (pathname) => {
  const load = loaderForPath(pathname);
  if (!load || warmed.has(load)) return;
  warmed.add(load);
  // A failed prefetch is not an error the visitor should ever see — the click
  // will retry the same import and Suspense handles it from there. Swallowing it
  // matters because an unhandled rejection here would surface in error tracking
  // as if the page had failed to load, which it has not.
  load().catch(() => warmed.delete(load));
};

const internalPathFromEvent = (event) => {
  const el = event.target;
  const anchor = el && typeof el.closest === "function" ? el.closest("a[href]") : null;
  if (!anchor || anchor.target === "_blank") return null;

  // Same-origin only: an href to the LMS or the hiring form is someone else's
  // site, and getAttribute keeps relative hrefs relative so "/blog" stays "/blog".
  const href = anchor.getAttribute("href");
  if (!href || !href.startsWith("/")) return null;

  return href.split(/[?#]/)[0];
};

/**
 * Prefetch a route's chunk the moment the visitor shows intent — hovering a
 * link, tabbing to it, or first touching it — rather than when they commit.
 *
 * One delegated listener on the document rather than handlers on each <Link>:
 * the links are spread across the navbar, the mobile drawer, the footer and the
 * body of most pages, and a link added anywhere later gets this for free instead
 * of only when someone remembers to opt it in.
 *
 * Returns a teardown function.
 */
export const installRoutePrefetch = () => {
  const onIntent = (event) => {
    const path = internalPathFromEvent(event);
    if (path) prefetchRoute(path);
  };

  // pointerover bubbles (pointerenter does not, so it cannot be delegated) and
  // covers mouse and pen. touchstart is the phone's only real "intent" signal,
  // and it lands ~100ms before the click — not the head start a hover gives, but
  // it is a head start the click alone does not have. focusin covers keyboard
  // navigation.
  document.addEventListener("pointerover", onIntent, {passive: true});
  document.addEventListener("touchstart", onIntent, {passive: true});
  document.addEventListener("focusin", onIntent, {passive: true});

  // Intent-based prefetch is free but late on touch, where there is no hover to
  // Intent-based prefetch (pointerover/touchstart/focusin) triggers before click.
  // We do not eagerly warm all 6 data-heavy routes on initial load to avoid
  // consuming 5+ MB of network bandwidth during first paint.
  return () => {
    document.removeEventListener("pointerover", onIntent);
    document.removeEventListener("touchstart", onIntent);
    document.removeEventListener("focusin", onIntent);
  };
};
