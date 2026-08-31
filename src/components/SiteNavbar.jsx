import {useEffect, useRef, useState, useCallback} from "react";
import {Link, useLocation} from "react-router-dom";
import BrandLockup from "./BrandLockup";
import {externalLinks} from "../config/externalLinks";
import "./navbar-area.css";

const EXIT_MS = 280;
const PHONE = "+91 9217801191";

const NAV_DESCRIPTIONS = {
  "/programs": "Explore our live cohorts",
  "/alumni": "Where our learners landed",
  "/jobs": "Roles open right now",
  "/faculty": "Meet the mentors",
  "/blog": "Guides, playbooks & insights",
  "/about": "Our story and mission",
};

class NavbarController {
  constructor(setOpen, setClosing) {
    this.setOpen = setOpen;
    this.setClosing = setClosing;
    this.timer = null;
  }

  clear() {
    clearTimeout(this.timer);
  }

  open() {
    this.clear();
    this.setClosing(false);
    this.setOpen(true);
    document.body.style.overflow = "hidden";
  }

  close = () => {
    const finish = () => {
      this.setOpen(false);
      this.setClosing(false);
      document.body.style.overflow = "";
    };

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      finish();
      return;
    }

    this.setClosing(true);
    this.timer = window.setTimeout(finish, EXIT_MS);
  };

  toggle(open) {
    open ? this.close() : this.open();
  }

  destroy() {
    this.clear();
    document.body.style.overflow = "";
  }
}

const NavLink = ({path, label, active, onClick, mobile = false, index}) => (
  <Link
    to={path}
    className={active ? "is-active" : ""}
    aria-current={active ? "page" : undefined}
    onClick={onClick}
  >
    {mobile && (
      <span className="mobile-menu-index" aria-hidden="true">
        {String(index + 1).padStart(2, "0")}
      </span>
    )}

    {mobile ? (
      <>
        <span className="mobile-menu-label">
          {label}
          <small>{NAV_DESCRIPTIONS[path]}</small>
        </span>
        <Chevron />
      </>
    ) : (
      label
    )}
  </Link>
);

const Chevron = () => (
  <svg
    className="mobile-menu-chevron"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M9 5l7 7-7 7" />
  </svg>
);

const SiteNavbar = ({navItems}) => {
  const navRef = useRef(null);
  const overlayRef = useRef(null);
  const location = useLocation();

  const [isScrolled, setScrolled] = useState(false);
  const [isCompact, setCompact] = useState(false);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isClosing, setClosing] = useState(false);

  const controller = useRef(
    new NavbarController(setMenuOpen, setClosing)
  );

  const activeHref = location.pathname;

  const closeMenu = useCallback(
    () => controller.current.close(),
    []
  );

  const toggleMenu = useCallback(
    () => controller.current.toggle(isMenuOpen),
    [isMenuOpen]
  );

  useEffect(() => {
    if (isMenuOpen) overlayRef.current?.showModal();
  }, [isMenuOpen]);

  useEffect(() => () => controller.current.destroy(), []);

  useEffect(() => {
    const pill = navRef.current?.querySelector(".site-nav-links");

    if (
      !pill ||
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) return;

    let frame;

    const move = e => {
      if (frame) return;

      frame = requestAnimationFrame(() => {
        frame = null;
        const r = pill.getBoundingClientRect();

        pill.style.setProperty("--spot-x", `${e.clientX - r.left}px`);
        pill.style.setProperty("--spot-y", `${e.clientY - r.top}px`);
      });
    };

    const leave = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = null;
    };

    pill.addEventListener("pointermove", move, {passive: true});
    pill.addEventListener("pointerleave", leave, {passive: true});

    return () => {
      pill.removeEventListener("pointermove", move);
      pill.removeEventListener("pointerleave", leave);
      leave();
    };
  }, []);

  useEffect(() => {
    let frame;
    let lastY = window.scrollY;

    const update = () => {
      frame = null;

      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;

      if (y <= 10) {
        setScrolled(false);
        setCompact(false);
        return;
      }

      if (y >= 40) setScrolled(true);

      if (!isCompact && dy > 4 && y > 56) setCompact(true);
      else if (isCompact && (dy < -6 || y < 44)) setCompact(false);
    };

    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", scroll, {passive: true});

    return () => {
      window.removeEventListener("scroll", scroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [isCompact]);

  return (
    <>
      <header
        ref={navRef}
        className={`site-nav ${isScrolled ? "is-scrolled" : ""} ${
          isCompact ? "is-compact" : ""
        }`}
        role="banner"
      >
        <div className="nav-container">
          <Link className="brand site-nav-brand" to="/" aria-label="CareerVeda Home">
            <BrandLockup />
          </Link>

          <nav className="site-nav-links" aria-label="Primary navigation">
            {navItems.map(([path, label]) => (
              <NavLink
                key={path}
                path={path}
                label={label}
                active={activeHref === path}
                onClick={closeMenu}
              />
            ))}
          </nav>

          <Link className="nav-cta" to="/enroll" onClick={closeMenu}>
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
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>
        </div>
      </header>

      {isMenuOpen && (
        <dialog
          ref={overlayRef}
          id="mobile-menu"
          className={`mobile-menu-overlay ${isClosing ? "is-closing" : ""}`}
          aria-label="Mobile navigation"
          onCancel={e => {
            e.preventDefault();
            closeMenu();
          }}
          onClick={e => {
            if (e.target === e.currentTarget) closeMenu();
          }}
        >
          <div className="mobile-menu-panel">
            <div className="mobile-menu-head">
              <Link
                className="brand mobile-menu-brand"
                to="/"
                onClick={closeMenu}
              >
                <BrandLockup />
              </Link>

              <button
                className="mobile-menu-close"
                type="button"
                onClick={closeMenu}
                aria-label="Close menu"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <nav className="mobile-menu-nav" aria-label="Mobile navigation">
              {navItems.map(([path, label], i) => (
                <NavLink
                  key={path}
                  path={path}
                  label={label}
                  index={i}
                  mobile
                  active={activeHref === path}
                  onClick={closeMenu}
                />
              ))}

              {externalLinks.map(({label, href, description}, i) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMenu}
                >
                  <span className="mobile-menu-index">
                    {String(navItems.length + i + 1).padStart(2, "0")}
                  </span>

                  <span className="mobile-menu-label">
                    {label}
                    <small>{description}</small>
                  </span>

                  <Chevron />
                </a>
              ))}
            </nav>

            <div className="mobile-menu-foot">
              <Link
                className="mobile-menu-cta"
                to="/enroll"
                onClick={closeMenu}
              >
                Enroll Now
              </Link>

              <a
                className="mobile-menu-call"
                href={`tel:${PHONE.replace(/\s/g, "")}`}
                onClick={closeMenu}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
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
