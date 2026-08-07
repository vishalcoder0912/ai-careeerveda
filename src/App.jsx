import {useEffect, lazy} from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import {resolvePageMeta, composeTitle, DEFAULT_DESCRIPTION} from "./config/pageMeta";
import {applySeo} from "./lib/seoTags";
import {absoluteUrl, OG_IMAGE} from "./config/siteMeta";
import {organisationSchema, webSiteSchema, breadcrumbSchema, useJsonLd} from "./lib/structuredData";
import * as routeChunks from "./lib/routeChunks";

// The root SmoothScrollProvider was here to run Lenis on /cleverpe, which was
// the only route that ever opted in. With that route gone every remaining page
// was already being rendered with `enabled={false}`, so the wrapper could only
// ever hand its consumers a null instance — removing it changes no behaviour on
// any surviving route.
//
// lib/smoothScroll.jsx stays: ScrollStack (via PressSection) imports useLenis
// from it, and useLenis returning null is that component's documented
// no-smooth-scroll path — it constructs its own Lenis in that case, which is
// exactly what it has been doing on every route but /cleverpe all along.

/* Home stays eager — it is the first paint and must not wait on a chunk.
   Everything else is split. Importing them statically meant a visitor landing on
   "/" downloaded every page in the app, and with them programCatalog.js (471 KB),
   which nothing on the home page reads. Layout renders the Suspense boundary
   these resolve into.

   The loaders come from lib/routeChunks so that hovering a link can start the
   same import these resolve — see the note there on why they must be shared. */
const ProgramsPage = lazy(routeChunks.loadProgramsPage);
const ProgramDetailPage = lazy(routeChunks.loadProgramDetailPage);
const JobsPage = lazy(routeChunks.loadJobsPage);
const FacultyPage = lazy(routeChunks.loadFacultyPage);
const BlogPage = lazy(routeChunks.loadBlogPage);
const BlogDetailPage = lazy(routeChunks.loadBlogDetailPage);
const AboutPage = lazy(routeChunks.loadAboutPage);
const ContactPage = lazy(routeChunks.loadContactPage);
const AlumniPage = lazy(routeChunks.loadAlumniPage);
const EnrollPage = lazy(routeChunks.loadEnrollPage);
const PolicyPage = lazy(routeChunks.loadPolicyPage);

// Reset scroll to top on every route change (skips in-page #hash links).
const ScrollToTop = () => {
  const {pathname, hash} = useLocation();
  useEffect(() => {
    if (hash) return;
    window.scrollTo({top: 0, left: 0, behavior: "instant"});
  }, [pathname, hash]);
  return null;
};

// Scroll to the #hash target after navigation. React Router never does this on
// its own, which is why every `to="/#consultation"` link — "Get in Touch" in the
// hero, "Download Syllabus", the program-detail CTA — changed the URL and then
// sat still. ScrollToTop above deliberately bows out when a hash is present; this
// is the other half it was waiting for.
//
// The target may not be mounted the instant the location changes: a cross-page
// jump (say /programs/x → /#consultation) swaps to a route whose chunk and DOM
// arrive a frame or two later. So it polls briefly for the element rather than
// scrolling to nothing and giving up.
const ScrollToHash = () => {
  const {pathname, hash} = useLocation();

  useEffect(() => {
    if (!hash) return undefined;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior = prefersReducedMotion ? "auto" : "smooth";
    const id = decodeURIComponent(hash.slice(1));

    let cancelled = false;
    const timers = [];

    // The header pins itself (position: fixed) once the page is scrolled, so a
    // plain top alignment would tuck the section's heading up under it. Offset by
    // the bar's measured height, with a sane fallback, plus a little breathing room.
    const headerOffset = () => {
      const nav = document.querySelector(".site-nav");
      return (nav && nav.offsetHeight ? nav.offsetHeight : 76) + 12;
    };

    const scrollToTarget = () => {
      const el = document.getElementById(id);
      if (!el) return;
      const y = el.getBoundingClientRect().top + window.scrollY - headerOffset();
      window.scrollTo({top: Math.max(0, y), behavior});
    };

    // How far the section still is from resting just below the header.
    const drift = () => {
      const el = document.getElementById(id);
      if (!el) return Infinity;
      return el.getBoundingClientRect().top - headerOffset();
    };

    // Wait for the target to exist — a cross-page jump (/programs/x → /#consultation)
    // mounts it a beat later — then scroll. The correction passes matter as much as
    // the first scroll: the home page's 3D hero and images take their real height
    // only after this fires and shove the section downward, so a single scroll lands
    // short (it was missing by ~1500px). Re-aligning at three settling points, and
    // only when the section has actually drifted, lands it on the form without a
    // tight loop that would fight the smooth animation.
    let waited = 0;
    const start = () => {
      if (cancelled) return;
      if (!document.getElementById(id)) {
        waited += 1;
        if (waited < 25) timers.push(window.setTimeout(start, 80));
        return;
      }
      scrollToTarget();
      [450, 1000, 1600].forEach((ms) =>
        timers.push(
          window.setTimeout(() => {
            if (!cancelled && Math.abs(drift()) > 8) scrollToTarget();
          }, ms),
        ),
      );
    };

    timers.push(window.setTimeout(start, 0));

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [pathname, hash]);

  return null;
};

// Keeps the browser-tab title in sync with the route. Every static route has an
// entry in pageMeta; /programs/:slug returns null here and sets its own title
// from the program name inside ProgramDetailPage. Setting the brand-only default
// for that route first means the previous page's title never lingers during the
// lazy chunk load before the detail page mounts and refines it.
// "privacy-policy" -> "Privacy Policy". A breadcrumb wants the short label, not
// the SERP title, so this is derived from the path rather than read out of
// pageMeta — "About Us — AI-Powered EdTech Platform" is a title tag, and no
// breadcrumb trail should say it.
const crumbLabel = (slug) =>
  slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const RouteMeta = () => {
  const {pathname} = useLocation();

  // Organisation and WebSite JSON-LD describe the site itself rather than any
  // one page, so they are written once here instead of by every route. The
  // Organisation block is what a brand search reads: its sameAs list is the
  // stated link between this domain and the company's social profiles, which is
  // what lets Google treat them as one entity instead of unrelated results.
  //
  // (No SearchAction: Google retired the sitelinks search box in 2024 and
  // ignores the markup. Sitelinks themselves are earned from site structure and
  // internal linking, not from anything that can be declared here.)
  useJsonLd("ld-organisation", organisationSchema());
  useJsonLd("ld-website", webSiteSchema());

  // Home > Page, for every route that has a static meta entry. An audit of the
  // built HTML found a BreadcrumbList on only the three routes that hand-rolled
  // one, so /about, /jobs, /faculty, /alumni, /blog, /contact, /enroll and the
  // four policies each rendered as a bare URL in search rather than as a
  // "careerveda.in › Jobs" trail.
  //
  // It lives here rather than in eleven page components because the whole trail
  // is derivable from the path. The two dynamic routes are deliberately not:
  // they are absent from pageMeta, so this emits nothing for them, and their
  // pages set the three-level trail that names the program or the post — which
  // is the one thing a path alone cannot supply.
  //
  // "/" is excluded: a trail whose only item is the page you are on says
  // nothing, and Google ignores a single-element BreadcrumbList anyway.
  const staticMeta = resolvePageMeta(pathname);
  useJsonLd(
    "ld-route-breadcrumb",
    staticMeta && pathname !== "/"
      ? breadcrumbSchema([
          {name: "Home", path: "/"},
          {name: crumbLabel(pathname.slice(1)), path: pathname},
        ])
      : null,
  );

  useEffect(() => {
    const meta = resolvePageMeta(pathname);
    const title = composeTitle(meta && meta.title);
    const description = (meta && meta.description) || DEFAULT_DESCRIPTION;

    document.title = title;

    // Previously this set only <meta name="description">. The canonical, Open
    // Graph and Twitter tags were implemented in lib/seoTags.js and then never
    // called from anywhere, so every route shipped index.html's single static
    // set — one canonical pointing at the home page for the whole site, which
    // is an instruction to Google to index nothing else.
    //
    // /programs/:slug is deliberately skipped: resolvePageMeta returns null for
    // it, and ProgramDetailPage applies its own SEO from the program record.
    // Writing a generic set here first would be overwritten a moment later, but
    // a crawler that snapshots early would catch the wrong one.
    if (!meta) return;

    applySeo({
      title,
      description,
      url: absoluteUrl(pathname),
      image: OG_IMAGE,
    });
  }, [pathname]);

  return null;
};

const App = () => {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <ScrollToHash />
      <RouteMeta />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/programs" element={<ProgramsPage />} />
          <Route path="/programs/:slug" element={<ProgramDetailPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/achievers" element={<Navigate to="/jobs" replace />} />
          <Route path="/faculty" element={<FacultyPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogDetailPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/alumni" element={<AlumniPage />} />
          <Route path="/enroll" element={<EnrollPage />} />
          {/* The four policies that have always had named routes keep them, so
              their entries in pageMeta still resolve and their titles are not
              left to the generic fallback. */}
          <Route path="/privacy-policy" element={<PolicyPage slug="privacy-policy" />} />
          <Route path="/refund-policy" element={<PolicyPage slug="refund-policy" />} />
          <Route path="/terms" element={<PolicyPage slug="terms" />} />
          <Route path="/escalation-policy" element={<PolicyPage slug="escalation-policy" />} />
          {/* Any other single-segment URL. A policy created in the admin panel
              lives at /<its-slug> and is linked from the footer, so without this
              it would be a link to a blank page — the panel could create a
              policy the site had no way to serve. Declared last, so it is only
              reached once every named route above has failed to match, and it
              doubles as the catch-all: PolicyPage sends an unknown slug home. */}
          <Route path="/:slug" element={<PolicyPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
