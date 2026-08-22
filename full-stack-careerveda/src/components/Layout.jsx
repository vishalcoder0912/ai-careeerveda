import { Suspense, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import SiteNavbar from "./SiteNavbar";
import SocialLinks from "./SocialLinks";
import WhatsAppButton from "./WhatsAppButton";
import { navItems } from "../data/siteData";
import { Link } from "react-router-dom";
import BrandLockup from "./BrandLockup";
import { externalLinks } from "../config/externalLinks";
import { useContentList } from "../hooks/useContent";
import { installRoutePrefetch } from "../lib/routeChunks";

const Layout = () => {
  // Start each route's chunk when a visitor hovers, tabs to, or first touches a
  // link to it, so the click itself has nothing left to download. One delegated
  // listener covers the navbar, the drawer, the footer and every in-page link.
  useEffect(installRoutePrefetch, []);

  // Only slug and title are needed here, but the same published list drives the
  // footer and PolicyPage — so a policy is linked exactly when its page will
  // render, with no second list to keep in step.
  const { items: policyLinks, isLive: policiesLive } = useContentList("policies", {
    adapt: ({ slug, title }) => ({ slug, title }),
  });

  // The static policy list is the offline floor for the footer, but the module
  // carries every policy's full prose (~36 KB) for four titles' worth of links.
  // It is fetched after first paint so it stays out of the entry chunk — the
  // API answers before the footer is read, and this is only what renders when
  // the backend is unreachable.
  const [policyFallback, setPolicyFallback] = useState([]);
  useEffect(() => {
    let cancelled = false;
    import("../data/policies").then((module) => {
      if (!cancelled) setPolicyFallback(module.publishedPolicies);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The API's answer is authoritative when it comes, including an empty one
  // (every policy unpublished — then nothing is linked). The static list only
  // stands in while the server has not answered.
  const footerPolicies = policyLinks.length
    ? policyLinks
    : policiesLive
      ? []
      : policyFallback;

  return (
    <>
      <SiteNavbar navItems={navItems} />
      {/* Every route but the home page is a lazy chunk (see App.jsx), so the
          Outlet needs a boundary to render into while one loads. The nav and
          footer stay put across the swap, which is why it lives here and not
          around the whole app. */}
      <Suspense fallback={<div className="route-fallback" aria-busy="true" />}>
        <Outlet />
      </Suspense>
      <footer className="site-footer">
        <div>
          <Link className="brand" to="/">
            <BrandLockup />
          </Link>
          <p>Empowering learners worldwide to achieve career excellence</p>
          {/* Under the brand, not in the link columns: these are the same CareerVeda,
              not more places on the site. Renders nothing until a profile URL is set
              in externalLinks.js. */}
          <SocialLinks />
        </div>
        <div>
          <h3>Discover More</h3>
          <Link to="/about">About Us</Link>
          <Link to="/programs">Our Programs</Link>
          <Link to="/jobs">Job Openings</Link>
          <Link to="/alumni">Alumni</Link>
          <Link to="/faculty">Our Faculty</Link>
          <Link to="/blog">Our Blog</Link>
          <Link to="/contact">Contact Us</Link>
          <Link to="/enroll">Enroll Now</Link>
          {/* The LMS and the hiring form are other people's sites, so they open in
              a new tab rather than replacing the page someone is reading. rel
              closes the reverse-tabnabbing hole target="_blank" opens. Both are
              absent from the list until a URL is filled in — see externalLinks.js. */}
          {externalLinks.map(({label, href}) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer">
              {label}
            </a>
          ))}
        </div>
        <div>
          <h3>Policies</h3>
          {/* Driven by the data, not typed out here: a policy is linked exactly when
              it is publishable. Hardcoding the four is how the footer came to link
              a Refund Policy that was still [PLACEHOLDER] text. Finish one in
              policies.js and its link appears here on its own. */}
          {footerPolicies.map(({slug, title}) => (
            <Link key={slug} to={`/${slug}`}>{title}</Link>
          ))}
        </div>
        <div>
          <h3>Contact Us</h3>
          <p>
            CareerVeda OPC Private Limited, Awfis Majestic Signia, 1st Floor,
            Majestic Signia, Plot No. A-27, Block A, Industrial Area, Sector 62,
            Noida, Uttar Pradesh 201309
          </p>
          <p>+91 9217801191</p>
          <p>Info@careerveda.in</p>
          <p>Mon-Sat: 10:00 AM to 07:00 PM · Sunday: Closed</p>
        </div>
        <small>© 2026 CareerVeda. All rights reserved.</small>
      </footer>
      {/* Outside the Suspense boundary on purpose: it is pinned to the viewport
          and must stay tappable while a route chunk loads. It reads the route
          itself to decide which message to prefill — see config/whatsapp.js. */}
      <WhatsAppButton />
    </>
  );
};

export default Layout;
