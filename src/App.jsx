import {useEffect, useRef, lazy} from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import {SmoothScrollProvider, useLenis} from "./lib/smoothScroll";
import HomePage from "./pages/HomePage";
import {resolvePageMeta, composeTitle, DEFAULT_DESCRIPTION} from "./config/pageMeta";
import {applySeo} from "./lib/seoTags";
import {absoluteUrl, OG_IMAGE} from "./config/siteMeta";
import {organisationSchema, webSiteSchema, breadcrumbSchema, useJsonLd} from "./lib/structuredData";
import * as routeChunks from "./lib/routeChunks";

// Set once the app's tree has actually committed — an effect runs strictly
// after mount, so anything waiting on this marker (scripts/snapshot.mjs takes
// its scroll pass against the live tree) cannot race the concurrent renderer
// the way it would waiting on a flag set at render()-call time.
const BootMarker = () => {
  useEffect(() => {
    document.getElementById("root")?.setAttribute("data-app-mounted", "true");
  }, []);
  return null;
};

const ProgramsPage = lazy(routeChunks.loadProgramsPage);
const GenerativeAIPage = lazy(routeChunks.loadGenerativeAIPage);
const CinematicProgramPage = lazy(routeChunks.loadCinematicProgramPage);
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

// The browser restores each history entry's scroll offset on its own ("auto"),
// which would land a back/forward navigation mid-page after the reset below.
// Route changes are owned by this app, so the browser's memory is switched off
// and every entry starts from the decision ScrollToTop makes.
if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

const ScrollToTop = () => {
  const {pathname, hash} = useLocation();
  // Null when smooth scrolling is off (reduced motion) — the native branch is
  // the whole path then, not an error case.
  const lenis = useLenis();
  // The location this effect last handled. Starts as the landing location, so
  // the first mount does NOT reset: the page arrives as prerendered HTML, a
  // phone visitor scrolls it while the JS loads, and resetting on boot yanked
  // them back to the hero a second later — the section they were reading
  // vanished. A fresh load already starts at the top (scrollRestoration is
  // manual). Keyed on path + hash so Lenis attaching later is not a navigation.
  const handled = useRef(pathname + hash);

  useEffect(() => {
    const location = pathname + hash;
    if (handled.current === location) return;
    handled.current = location;
    if (hash) return;

    // The reset must go through Lenis when Lenis drives the page. A native
    // scrollTo loses the race against the ticker: an interpolation still
    // settling from the last wheel gesture repaints its old position over this
    // one on the very next frame, which is how a route change landed where the
    // previous page was left — often near its end. `immediate` jumps without
    // animating; `force` covers the stopped state a modal leaves behind.
    if (lenis) {
      lenis.scrollTo(0, {immediate: true, force: true});
    } else {
      window.scrollTo({top: 0, left: 0, behavior: "instant"});
    }
  }, [pathname, hash, lenis]);

  return null;
};
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

const crumbLabel = (slug) =>
  slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const RouteMeta = () => {
  const {pathname} = useLocation();
  useJsonLd("ld-organisation", organisationSchema());
  useJsonLd("ld-website", webSiteSchema());

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
      <BootMarker />
      <SmoothScrollProvider>
        <ScrollToTop />
        <ScrollToHash />
        <RouteMeta />
        <Routes>
        <Route path="/generative-ai" element={<GenerativeAIPage />} />
        <Route path="/programs/gen-ai-agentic-ai" element={<GenerativeAIPage />} />
        {routeChunks.CINEMATIC_PROGRAMS.map((id) => (
          <Route key={id} path={`/programs/${id}`} element={<CinematicProgramPage programId={id} />} />
        ))}
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
          <Route path="/privacy-policy" element={<PolicyPage slug="privacy-policy" />} />
          <Route path="/refund-policy" element={<PolicyPage slug="refund-policy" />} />
          <Route path="/terms" element={<PolicyPage slug="terms" />} />
          <Route path="/escalation-policy" element={<PolicyPage slug="escalation-policy" />} />
          <Route path="/:slug" element={<PolicyPage />} />
        </Route>
        </Routes>
      </SmoothScrollProvider>
    </BrowserRouter>
  );
};

export default App;
