import {useMemo, useState} from "react";
import {NavLink, Outlet, useLocation} from "react-router-dom";

import {useAuth} from "../context/AuthContext";
import {RESOURCE_LIST, resourcePermission} from "../config/resources";
import {BRAND_LOGO} from "../config/brand";

const PUBLIC_SITE = import.meta.env.VITE_PUBLIC_SITE_URL || "http://localhost:5173";

const NAV_ICON_PATHS = {
  dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    programs: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
        <path d="M4 5.5v16" />
        <path d="M8 7h8M8 11h8" />
      </>
    ),
    faculty: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
      </>
    ),
    alumni: (
      <>
        <path d="m3 9 9-5 9 5-9 5z" />
        <path d="M7 12.5V17c3 2 7 2 10 0v-4.5" />
        <path d="M21 9v6" />
      </>
    ),
    jobs: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2" />
      </>
    ),
    policies: (
      <>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M15 3v5h5M9 12h7M9 16h7" />
      </>
    ),
    faqs: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.8 9a2.5 2.5 0 1 1 3.8 2.1c-1 .6-1.6 1.1-1.6 2.4M12 17.5h.01" />
      </>
    ),
    media: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="10" r="2" />
        <path d="m4 18 5-5 3 3 2-2 6 5" />
      </>
    ),
    leads: (
      <>
        <path d="M4 4h16v16H4z" />
        <path d="M8 9h8M8 13h5M16.5 15.5l2 2 3-4" />
      </>
    ),
    profile: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M5 21a7 7 0 0 1 14 0" />
        <path d="M18 4v4M16 6h4" />
      </>
    ),
};

const NavIcon = ({name}) => (
  <span className="nav-icon" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {NAV_ICON_PATHS[name] || NAV_ICON_PATHS.programs}
    </svg>
  </span>
);

const NavigationItem = ({to, icon, children, end = false, onClick}) => (
  <NavLink
    to={to}
    end={end}
    onClick={onClick}
    className={({isActive}) => `nav-item${isActive ? " active" : ""}`}
  >
    <NavIcon name={icon} />
    <span>{children}</span>
  </NavLink>
);

const Layout = () => {
  const {admin, signOut, can} = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const {pathname} = useLocation();

  const contentLinks = RESOURCE_LIST.filter((resource) => can(resourcePermission(resource, "read")));
  const crumbs = pathname.split("/").filter(Boolean);

  const section = useMemo(() => {
    if (crumbs.length === 0) return {title: "Dashboard", eyebrow: "Workspace"};
    if (crumbs[0] === "media") return {title: "Media library", eyebrow: "Operations"};
    if (crumbs[0] === "leads") return {title: "Leads", eyebrow: "Operations"};
    if (crumbs[0] === "profile") return {title: "Profile & security", eyebrow: "Account"};

    const resource = RESOURCE_LIST.find((entry) => entry.name === crumbs[0]);
    if (!resource) return {title: "Admin", eyebrow: "CareerVeda"};

    if (crumbs[1] === "new") {
      return {title: `New ${resource.singular.toLowerCase()}`, eyebrow: resource.label};
    }

    if (crumbs.length > 1) {
      return {title: `Edit ${resource.singular.toLowerCase()}`, eyebrow: resource.label};
    }

    return {title: resource.label, eyebrow: "Content"};
  }, [crumbs]);

  const closeNav = () => setNavOpen(false);
  const initials = String(admin?.name || admin?.email || "CV")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <aside className={`sidebar ${navOpen ? "sidebar--open" : ""}`}>
        <div className="sidebar-brand">
          {/* alt="" on purpose: "CareerVeda" is spelled out immediately after,
              and naming the image too makes a screen reader say it twice. */}
          <img className="sidebar-mark" src={BRAND_LOGO} alt="" />
          <span className="sidebar-brand-copy">
            <strong>CareerVeda</strong>
            <small>Content management</small>
          </span>
          <button type="button" className="sidebar-close" aria-label="Close navigation" onClick={closeNav}>
            ×
          </button>
        </div>

        <nav aria-label="Admin sections">
          <NavigationItem to="/" icon="dashboard" end onClick={closeNav}>
            Dashboard
          </NavigationItem>

          {contentLinks.length > 0 ? <p className="nav-heading">Website content</p> : null}
          {contentLinks.map((resource) => (
            <NavigationItem
              key={resource.name}
              to={`/${resource.name}`}
              icon={resource.name}
              onClick={closeNav}
            >
              {resource.label}
            </NavigationItem>
          ))}

          <p className="nav-heading">Operations</p>
          {can("media.manage") ? (
            <NavigationItem to="/media" icon="media" onClick={closeNav}>
              Media library
            </NavigationItem>
          ) : null}
          {can("forms.read") ? (
            <NavigationItem to="/leads" icon="leads" onClick={closeNav}>
              Leads
            </NavigationItem>
          ) : null}

          <p className="nav-heading">Account</p>
          <NavigationItem to="/profile" icon="profile" onClick={closeNav}>
            Profile &amp; security
          </NavigationItem>
        </nav>

        <div className="sidebar-help">
          <span className="sidebar-help-icon">?</span>
          <div>
            <strong>Need a quick start?</strong>
            <small>Create a draft, review the checklist, then publish.</small>
          </div>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <button
            type="button"
            className="nav-toggle"
            aria-expanded={navOpen}
            aria-label="Toggle navigation"
            onClick={() => setNavOpen((open) => !open)}
          >
            <span aria-hidden="true">☰</span>
          </button>

          <div className="topbar-context">
            <span className="topbar-eyebrow">{section.eyebrow}</span>
            <strong className="topbar-title">{section.title}</strong>
          </div>

          <div className="topbar-actions">
            <a className="topbar-site-link" href={PUBLIC_SITE} target="_blank" rel="noreferrer">
              View website
              <span aria-hidden="true">↗</span>
            </a>

            <div className="topbar-account">
              <span className="topbar-avatar" aria-hidden="true">
                {initials}
              </span>
              <span className="topbar-name">
                {admin.name}
                <span className="topbar-role">{String(admin.role || "").replace(/-/g, " ")}</span>
              </span>
              <button type="button" className="btn btn--quiet" onClick={signOut}>
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main id="main" className="content">
          <Outlet />
        </main>
      </div>

      {navOpen ? <button type="button" className="scrim" onClick={closeNav} aria-label="Close navigation" /> : null}
    </div>
  );
};

export default Layout;
