import {useEffect,useRef,useState,useCallback} from "react";
import {Link, useLocation} from "react-router-dom";
import BrandLockup from "./BrandLockup";
import {externalLinks} from "../config/externalLinks";
import ShapeGrid from "./ShapeGrid";
import "./shape-grid.css";

// The drawer's slide, fade and row stagger are CSS animations now — see the
// mobile-menu keyframes in mobile-responsiveness.css.
//
// They were gsap. The navbar renders on every route, so to keep the first tap
// from waiting on a fetch the library was warmed on requestIdleCallback — which
// on a phone means "during the load". Every visitor on every page therefore
// downloaded 45 KB gzipped and parsed ~115 KB of it, to animate a drawer that
// only exists under 900px and that most of them never open; desktop paid for it
// without even being able to reach the drawer. Dropping the warm alone would only
// have moved the cost: the panel paints at its resting position, so gsap arriving
// late would have snapped it off screen and slid it back in — a visible jump on
// exactly the slow connections the change was meant to help.
//
// CSS has no such race. The animation is part of the same paint as the element,
// it runs off the main thread, and it costs nothing to download.
//
// EXIT_MS must match the drawer-out keyframe duration below: React unmounts the
// overlay, so the panel has to finish leaving before the element is taken away.
const EXIT_MS = 280;

/* Sub-labels for the mobile drawer only. The desktop bar has room for context
   around each link; a phone screen doesn't, so each row says what it opens. */
const NAV_DESCRIPTIONS = {
  "/programs": "Explore our live cohorts",
  "/alumni": "Where our learners landed",
  "/jobs": "Roles open right now",
  "/faculty": "Meet the mentors",
  "/blog": "Guides, playbooks & insights",
  "/about": "Our story and mission",
};

const COUNSELLOR_PHONE = "+91 9217801191";

const SiteNavbar = ({navItems}) => {
  const navRef = useRef(null);
  const overlayRef = useRef(null);
  const panelRef = useRef(null);
  const frameRef = useRef(null);
  const exitTimerRef = useRef(null);
  const location = useLocation();
  const [isScrolled,setIsScrolled] = useState(false);
  const [activeHref,setActiveHref] = useState(location.pathname);
  // Adjust state during render (the documented pattern for state that mirrors a
  // prop/route) instead of an effect: setState in an effect body causes a
  // cascading render, and this value is known before the first paint anyway.
  const [pathForActive,setPathForActive] = useState(location.pathname);
  if (pathForActive !== location.pathname) {
    setPathForActive(location.pathname);
    setActiveHref(location.pathname);
  }
  const [isMenuOpen,setIsMenuOpen] = useState(false);
  const [isClosing,setIsClosing] = useState(false);

  const closeMenu = useCallback(() => {
    const finish = () => {
      setIsMenuOpen(false);
      setIsClosing(false);
      document.body.style.overflow = "";
    };

    // Nothing to animate out, or the visitor asked for no motion: just go.
    if (!overlayRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return;
    }

    // .is-closing swaps the entry keyframes for the exit ones; the timer takes the
    // element away once they have played. A timer rather than onAnimationEnd
    // because that event never fires when a system setting or an extension has
    // disabled animations, and the drawer would then never close.
    setIsClosing(true);
    exitTimerRef.current = window.setTimeout(finish, EXIT_MS);
  }, []);

  const openMenu = useCallback(() => {
    window.clearTimeout(exitTimerRef.current);
    setIsClosing(false);
    setIsMenuOpen(true);
    document.body.style.overflow = "hidden";
  }, []);

  const toggleMenu = useCallback(() => {
    if (isMenuOpen) closeMenu();
    else openMenu();
  }, [isMenuOpen, closeMenu, openMenu]);

  // Open the drawer as a native modal <dialog>: the browser then owns the focus
  // trap and inerts the page behind it. Escape is handled by the dialog's own
  // 'cancel' event (see onCancel below) so it can play the exit animation instead
  // of the instant native close, so no keydown listener is needed here.
  useEffect(() => {
    if (isMenuOpen) overlayRef.current?.showModal();
  }, [isMenuOpen]);

  // A pending exit timer holds a setState; the drawer can be unmounted before it
  // fires by a route change.
  useEffect(() => () => window.clearTimeout(exitTimerRef.current), []);

  useEffect(() => {
    const updateNavbar = () => {
      frameRef.current = null;
      const scrollY = window.scrollY || window.pageYOffset;
      setIsScrolled(scrollY > 24);
    };

    const requestNavbarUpdate = () => {
      if (frameRef.current) return;
      frameRef.current = window.requestAnimationFrame(updateNavbar);
    };

    updateNavbar();
    window.addEventListener("scroll", requestNavbarUpdate, {passive: true});
    window.addEventListener("resize", requestNavbarUpdate);

    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      window.removeEventListener("scroll", requestNavbarUpdate);
      window.removeEventListener("resize", requestNavbarUpdate);
    };
  },[]);

  const handleLinkClick = () => {
    closeMenu();
  };

  return (
    <>
      <header
        ref={navRef}
        className={`site-nav ${isScrolled ? "is-scrolled" : ""}`}
        role="banner"
      >
        {/* Same grid as the hero and the page backdrop, sized for a band this
            short: 34px cells so several rows read inside 86px, and drifting
            sideways rather than diagonally because vertical travel has nowhere
            to go here. Ink on white — the bar is the one light surface the grid
            appears on, so the strokes are the text colour at low alpha and the
            hover fill is the brand orange, not the teal used on the dark
            sections. No vignette, for the same reason as the hero: it closes as
            an opaque ring at half the canvas diagonal, which on a bar this wide
            and short is the whole thing. */}
        <div className="site-nav-grid" aria-hidden="true">
          <ShapeGrid
            shape="square"
            direction="right"
            speed={0.12}
            squareSize={34}
            hoverTrailAmount={4}
            borderColor="rgba(31, 45, 61, 0.08)"
            hoverFillColor="rgba(243, 112, 18, 0.16)"
            vignetteColor="rgba(255, 255, 255, 0)"
          />
        </div>

        <Link className="brand site-nav-brand" to="/" aria-label="CareerVeda home">
          <BrandLockup />
        </Link>

        <nav className="site-nav-links" aria-label="Primary navigation">
          {navItems.map(([path,label]) => (
            <Link
              key={path}
              to={path}
              className={activeHref === path ? "is-active" : ""}
              aria-current={activeHref === path ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>

        <Link className="nav-cta" to="/enroll">
          Enroll Now
        </Link>

        <button
          className={`hamburger-btn ${isMenuOpen ? "is-open" : ""}`}
          onClick={toggleMenu}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          type="button"
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      {isMenuOpen && (
        <dialog
          ref={overlayRef}
          id="mobile-menu"
          className={`mobile-menu-overlay${isClosing ? " is-closing" : ""}`}
          aria-label="Mobile navigation"
          onCancel={(event) => {
            // Escape: keep the element open so the exit animation can play, then
            // close through the same path a tap on the backdrop takes.
            event.preventDefault();
            closeMenu();
          }}
          onClick={(event) => {
            // Tapping the dimmed area beside the drawer closes it.
            if (event.target === event.currentTarget) closeMenu();
          }}
        >
          <div className="mobile-menu-panel" ref={panelRef}>
            <div className="mobile-menu-head">
              {/* aria-label added when the wordmark below was commented out: the
                  text was this link's only accessible name, and an image with
                  alt="" left it announced as just "link". */}
              <Link
                className="brand mobile-menu-brand"
                to="/"
                onClick={handleLinkClick}
                aria-label="CareerVeda home"
              >
                <BrandLockup />
              </Link>
              <button
                className="mobile-menu-close"
                type="button"
                onClick={closeMenu}
                aria-label="Close menu"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <nav className="mobile-menu-nav" aria-label="Mobile navigation">
              {navItems.map(([path,label],index) => (
                <Link
                  key={path}
                  to={path}
                  className={activeHref === path ? "is-active" : ""}
                  aria-current={activeHref === path ? "page" : undefined}
                  onClick={handleLinkClick}
                >
                  <span className="mobile-menu-index" aria-hidden="true">
                    {String(index + 1).padStart(2,"0")}
                  </span>
                  <span className="mobile-menu-label">
                    {label}
                    <small>{NAV_DESCRIPTIONS[path]}</small>
                  </span>
                  <svg className="mobile-menu-chevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}

              {/* The LMS and the hiring form are external sites, so they are <a>
                  rather than <Link> — but they are rows in the same list, numbered
                  in the same sequence, because to the person holding the phone they
                  are simply two more places the menu goes. `.mobile-menu-nav a`
                  styles them and the drawer's stagger animation picks them up for
                  free, both being element selectors. */}
              {externalLinks.map(({label, href, description}, index) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleLinkClick}
                >
                  <span className="mobile-menu-index" aria-hidden="true">
                    {String(navItems.length + index + 1).padStart(2,"0")}
                  </span>
                  <span className="mobile-menu-label">
                    {label}
                    <small>{description}</small>
                  </span>
                  <svg className="mobile-menu-chevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              ))}
            </nav>

            <div className="mobile-menu-foot">
              <Link className="mobile-menu-cta" to="/enroll" onClick={handleLinkClick}>
                Enroll Now
              </Link>
              <a
                className="mobile-menu-call"
                href={`tel:${COUNSELLOR_PHONE.replace(/\s/g,"")}`}
                onClick={handleLinkClick}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24 11.4 11.4 0 0 0 3.6.58 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .58 3.6 1 1 0 0 1-.25 1z" />
                </svg>
                Talk to a counsellor
              </a>
            </div>
          </div>
        </dialog>
      )}
    </>
  );
};

export default SiteNavbar;
