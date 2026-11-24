import {useEffect, useRef, lazy} from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import {getAnchorOffset} from "./lib/anchorOffset";
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
const GenAiProgramPage = lazy(routeChunks.loadGenAiProgramPage);
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
  const lenis = useLenis();

  useEffect(() => {
    if (!hash) return undefined;

    const id = decodeURIComponent(hash.slice(1));
    if (!id) return undefined;

    let active = true;
    let detached = false;
    let raf = 0;
    let target = null;
    let initialScrollDone = false;
    let landed = false;
    let lastAbsolute = NaN;
    let settledFrames = 0;

    const mutationObserver = new MutationObserver(schedule);
    let resizeObserver;

    const reduced = () =>
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Lenis honours `[id] { scroll-margin-top }` itself. Reading that same value
    // for native fallbacks and the settle check keeps all three paths in step;
    // measuring the bar and passing an offset as well used to land twice as low.
    const absoluteTop = (el) =>
      el.getBoundingClientRect().top + window.scrollY - getAnchorOffset(el);

    const detach = () => {
      if (detached) return;
      detached = true;
      active = false;
      if (raf) cancelAnimationFrame(raf);
      mutationObserver?.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("wheel", cancelForUser);
      window.removeEventListener("touchstart", cancelForUser);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("load", schedule);
      window.removeEventListener("cv:hash-target-mounted", onHashMounted);
    };

    // If the reader takes over while we are still landing, their scroll wins.
    // The old retry timers used to keep dragging them back to the hash for over
    // a second; this is the decision that actually matters.
    const cancelForUser = () => detach();
    const onKeyDown = (event) => {
      const keys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "];
      if (keys.includes(event.key)) detach();
    };
    const onHashMounted = (event) => {
      if (event.detail?.id === id) schedule();
    };

    const scrollToTarget = (immediate) => {
      if (!target) return;
      const top = Math.max(0, absoluteTop(target));
      lastAbsolute = top;

      // Lenis owns window scroll and already applies the target's scroll-margin,
      // so no extra offset is passed here. A native scrollTo does not, hence the
      // measured `top` only on the fallback path.
      if (lenis) {
        lenis.scrollTo(target, {
          immediate: immediate || reduced(),
          force: true,
        });
      } else {
        window.scrollTo({
          top,
          behavior: immediate || reduced() ? "instant" : "smooth",
        });
      }
    };

    function schedule() {
      if (active && !detached && !raf) raf = requestAnimationFrame(check);
    }

    function check() {
      raf = 0;
      if (!active || detached) return;

      const el = document.getElementById(id);
      if (!el) {
        // The section may be behind DeferUntilVisible. Ask its wrapper to mount
        // the hash target now instead of waiting for a timeout to expire.
        window.dispatchEvent(new CustomEvent("cv:hash-target-request", {detail: {id}}));
        return;
      }

      target = el;
      if (!initialScrollDone) {
        initialScrollDone = true;
        target.setAttribute("tabindex", "-1");
        target.focus({preventScroll: true});
        scrollToTarget(false);
        schedule();
        return;
      }

      const absolute = Math.max(0, absoluteTop(el));
      if (!Number.isNaN(lastAbsolute) && Math.abs(absolute - lastAbsolute) > 2) {
        // A deferred section grew above us. Correct immediately, but only while
        // the reader has not taken over.
        landed = false;
        scrollToTarget(true);
        settledFrames = 0;
        schedule();
        return;
      }

      const viewportTop = el.getBoundingClientRect().top - getAnchorOffset(el);
      if (Math.abs(viewportTop) <= 1.5) {
        settledFrames += 1;
        if (settledFrames >= 3) {
          // Park the rAF loop, but keep the observers alive: a deferred section
          // mounting later still needs one geometry correction.
          landed = true;
          return;
        }
      } else if (landed) {
        // The layout did not move; the reader (or a script) did. Stop caring.
        detach();
        return;
      } else {
        settledFrames = 0;
      }
      schedule();
    }

    window.addEventListener("wheel", cancelForUser, {passive: true});
    window.addEventListener("touchstart", cancelForUser, {passive: true});
    window.addEventListener("keydown", onKeyDown, {passive: true});
    window.addEventListener("load", schedule, {once: true});
    window.addEventListener("cv:hash-target-mounted", onHashMounted);

    // Mutation/geometry observers replace the old fixed retries: we only react
    // when the DOM or the page height actually changes.
    mutationObserver.observe(document.documentElement, {childList: true, subtree: true});
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(schedule);
      resizeObserver.observe(document.body);
    }
    schedule();

    return detach;
  }, [pathname, hash, lenis]);

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
        <Route path="/generative-ai" element={<GenAiProgramPage />} />
        <Route path="/programs/gen-ai-agentic-ai" element={<GenAiProgramPage />} />
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
