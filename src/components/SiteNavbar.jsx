import {useEffect, useRef, useState, useCallback} from "react";
import {Link, useLocation} from "react-router-dom";
import BrandLockup from "./BrandLockup";
import {externalLinks} from "../config/externalLinks";
import "./navbar-area.css";

const EXIT_MS = 280;
const PHONE = "+91 9217801191";
const SCROLL_THRESHOLD = 40;

const NAV_DESCRIPTIONS = {
  "/programs": "Explore our live cohorts",
  "/alumni": "Where our learners landed",
  "/jobs": "Roles open right now",
  "/faculty": "Meet the mentors",
  "/blog": "Guides, playbooks & insights",
  "/about": "Our story and mission",
};

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

const MobileNavItem = ({number, label, description, active, onClick, to, href, index}) => {
  const cls = `mobile-menu-row${active ? " is-active" : ""}`;
  const inner = (
    <>
      <span className="mobile-menu-index" aria-hidden="true">
        {number}
      </span>
      <span className="mobile-menu-label">
        <span className="mobile-menu-title">{label}</span>
        {description && <small className="mobile-menu-desc">{description}</small>}
      </span>
      <Chevron />
    </>
  );
  const style = {animationDelay: `${index * 25}ms`};

  if (href) {
    return (
      <a
        className={cls}
        href={href}
        {...(href.startsWith("http") && {target: "_blank", rel: "noopener noreferrer"})}
        onClick={onClick}
        style={style}
      >
        {inner}
      </a>
    );
  }

  return (
    <Link
      className={cls}
      to={to}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      style={style}
    >
      {inner}
    </Link>
  );
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

const NavLink = ({path, label, active, onClick}) => (
  <Link
    to={path}
    className={active ? "is-active" : ""}
    aria-current={active ? "page" : undefined}
    onClick={onClick}
  >
    {label}
  </Link>
);

const SiteNavbar = ({navItems}) => {
  const navRef = useRef(null);
  const overlayRef = useRef(null);
  const hamburgerRef = useRef(null);
  const closeRef = useRef(null);
  const location = useLocation();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isClosing, setClosing] = useState(false);

  const controller = useRef(
    new NavbarController(setMenuOpen, setClosing)
  );
  const menuOpenRef = useRef(false);

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
    menuOpenRef.current = isMenuOpen;
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const dialog = overlayRef.current;
    if (!dialog || dialog.open) return;

    if (typeof dialog.showModal === "function") {
      try {
        dialog.showModal();
        closeRef.current?.focus();
        return;
      } catch {
        // Fall through to the attribute path for any browser where the method
        // exists but still refuses (e.g. an already-modeless dialog).
      }
    }
    dialog.setAttribute("open", "");
    closeRef.current?.focus();
  }, [isMenuOpen]);

  useEffect(() => () => controller.current.destroy(), []);

  useEffect(() => {
    if (menuOpenRef.current) closeMenu();
  }, [location.pathname, closeMenu]);

  const wasMenuOpen = useRef(false);
  useEffect(() => {
    if (wasMenuOpen.current && !isMenuOpen) {
      hamburgerRef.current?.focus();
    }
    wasMenuOpen.current = isMenuOpen;
  }, [isMenuOpen]);

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
    const update = () => {
      const next = window.scrollY > SCROLL_THRESHOLD;
      setIsScrolled(prev => (prev === next ? prev : next));
    };

    update();
    window.addEventListener("scroll", update, {passive: true});

    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <>
      <header
        ref={navRef}
        className={`site-nav ${isScrolled ? "is-scrolled" : ""}`}
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

          <div className="mobile-navbar-actions">
            <Link className="nav-cta" to="/enroll" onClick={closeMenu}>
              Enroll Now
            </Link>

            <button
              ref={hamburgerRef}
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
                ref={closeRef}
                className="mobile-menu-close"
                type="button"
                onClick={closeMenu}
                aria-label="Close navigation"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="mobile-menu-scroll">
              <nav className="mobile-menu-nav" aria-label="Mobile navigation">
                {navItems.map(([path, label], i) => (
                  <MobileNavItem
                    key={path}
                    number={String(i + 1).padStart(2, "0")}
                    label={label}
                    description={NAV_DESCRIPTIONS[path]}
                    active={activeHref === path}
                    to={path}
                    index={i}
                    onClick={closeMenu}
                  />
                ))}

                {externalLinks.map(({label, href, description}, i) => (
                  <MobileNavItem
                    key={label}
                    number={String(navItems.length + i + 1).padStart(2, "0")}
                    label={label}
                    description={description}
                    href={href}
                    index={navItems.length + i}
                    onClick={closeMenu}
                  />
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
          </div>
        </dialog>
      )}
    </>
  );
};

export default SiteNavbar;