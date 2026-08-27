import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import BrandLockup from "./BrandLockup";
import { externalLinks } from "../config/externalLinks";
import "./navbar-area.css";

const EXIT_MS = 280;

const NAV_DESCRIPTIONS = {
  "/programs": "Explore our live cohorts",
  "/alumni": "Where our learners landed",
  "/jobs": "Roles open right now",
  "/faculty": "Meet the mentors",
  "/blog": "Guides, playbooks & insights",
  "/about": "Our story and mission",
};

const COUNSELLOR_PHONE = "+91 9217801191";

const SiteNavbar = ({ navItems }) => {
  const navRef = useRef(null);
  const overlayRef = useRef(null);
  const panelRef = useRef(null);
  const exitTimerRef = useRef(null);
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [activeHref, setActiveHref] = useState(location.pathname);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const lastScrollYRef = useRef(0);

  const closeMenu = useCallback(() => {
    const finish = () => {
      setIsMenuOpen(false);
      setIsClosing(false);
      document.body.style.overflow = "";
    };

    if (
      !overlayRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      finish();
      return;
    }

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

  useEffect(() => {
    if (isMenuOpen) overlayRef.current?.showModal();
  }, [isMenuOpen]);

  useEffect(() => () => window.clearTimeout(exitTimerRef.current), []);

  // Cursor spotlight inside the center navigation pill. Desktop pointers only,
  // never for touch or reduced-motion users, and rAF-coalesced so a waving
  // cursor costs one style write per frame — no layout, no React state.
  useEffect(() => {
    const pill = navRef.current?.querySelector(".site-nav-links");
    if (!pill) return undefined;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return undefined;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    let frame = null;
    const onMove = (event) => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        const rect = pill.getBoundingClientRect();
        pill.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
        pill.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
      });
    };
    const onLeave = () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
        frame = null;
      }
    };

    pill.addEventListener("pointermove", onMove, { passive: true });
    pill.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      pill.removeEventListener("pointermove", onMove);
      pill.removeEventListener("pointerleave", onLeave);
      onLeave();
    };
  }, []);

  // Sync active href with route changes
  useEffect(() => {
    setActiveHref(location.pathname);
  }, [location.pathname]);

  // Scroll-aware state machine: top → compact, compact → expand, top on y≈0
  useEffect(() => {
    let frame = null;
    lastScrollYRef.current = window.scrollY || 0;

    // Hydrate on mount: if already scrolled, start compact
    if (lastScrollYRef.current > 20) {
      setIsScrolled(true);
      setIsCompact(true);
    }

    const apply = () => {
      frame = null;
      const y = window.scrollY || window.pageYOffset || 0;
      const dy = y - lastScrollYRef.current;
      lastScrollYRef.current = y;

      // At top: fully restore the transparent hero-merged state.
      if (y <= 10) {
        setIsScrolled(false);
        setIsCompact(false);
        return;
      }

      // 10–40px is a dead band so tiny scrolls don't toggle the glass (§13:
      // engage the docked state around 40px, force-restore at ≤10px).
      if (y >= 40) setIsScrolled(true);

      // Scroll down → dock (slightly shorter bar).
      if (!isCompact && dy > 4 && y > 56) {
        setIsCompact(true);
      }
      // Scroll up → expand back to full height before undocking.
      else if (isCompact && (dy < -6 || y < 44)) {
        setIsCompact(false);
      }
    };

    const schedule = () => {
      if (frame === null) frame = window.requestAnimationFrame(apply);
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      window.removeEventListener("scroll", schedule);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [isCompact]);

  const handleLinkClick = () => {
    closeMenu();
  };

  return (
    <>
      <header
        ref={navRef}
        className={`site-nav ${isScrolled ? "is-scrolled" : ""} ${isCompact ? "is-compact" : ""}`}
        role="banner"
      >
        <div className="nav-container">
          <Link
            className="brand site-nav-brand"
            to="/"
            aria-label="CareerVeda Home"
          >
            <BrandLockup />
          </Link>

          <nav className="site-nav-links" aria-label="Primary navigation">
            {navItems.map(([path, label]) => (
              <Link
                key={path}
                to={path}
                className={activeHref === path ? "is-active" : ""}
                aria-current={activeHref === path ? "page" : undefined}
                onClick={handleLinkClick}
              >
                {label}
              </Link>
            ))}
          </nav>

          <Link className="nav-cta" to="/enroll" onClick={handleLinkClick}>
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
            <span className="hamburger-line" aria-hidden="true" />
            <span className="hamburger-line" aria-hidden="true" />
            <span className="hamburger-line" aria-hidden="true" />
          </button>
        </div>
      </header>

      {isMenuOpen && (
        <dialog
          ref={overlayRef}
          id="mobile-menu"
          className={`mobile-menu-overlay ${isClosing ? "is-closing" : ""}`}
          aria-label="Mobile navigation"
          onCancel={(event) => {
            event.preventDefault();
            closeMenu();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) closeMenu();
          }}
        >
          <div className="mobile-menu-panel" ref={panelRef}>
            <div className="mobile-menu-head">
              <Link
                className="brand mobile-menu-brand"
                to="/"
                onClick={handleLinkClick}
              >
                <BrandLockup />
              </Link>
              <button
                className="mobile-menu-close"
                type="button"
                onClick={closeMenu}
                aria-label="Close menu"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <nav className="mobile-menu-nav" aria-label="Mobile navigation">
              {navItems.map(([path, label], index) => (
                <Link
                  key={path}
                  to={path}
                  className={activeHref === path ? "is-active" : ""}
                  aria-current={activeHref === path ? "page" : undefined}
                  onClick={handleLinkClick}
                >
                  <span className="mobile-menu-index" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="mobile-menu-label">
                    {label}
                    <small>{NAV_DESCRIPTIONS[path]}</small>
                  </span>
                  <svg
                    className="mobile-menu-chevron"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}

              {externalLinks.map(({ label, href, description }, index) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleLinkClick}
                >
                  <span className="mobile-menu-index" aria-hidden="true">
                    {String(navItems.length + index + 1).padStart(2, "0")}
                  </span>
                  <span className="mobile-menu-label">
                    {label}
                    <small>{description}</small>
                  </span>
                  <svg
                    className="mobile-menu-chevron"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              ))}
            </nav>

            <div className="mobile-menu-foot">
              <Link
                className="mobile-menu-cta"
                to="/enroll"
                onClick={handleLinkClick}
              >
                Enroll Now
              </Link>
              <a
                className="mobile-menu-call"
                href={`tel:${COUNSELLOR_PHONE.replace(/\s/g, "")}`}
                onClick={handleLinkClick}
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
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
