import {useEffect, useRef, useState} from "react";
import {useLenis} from "../../lib/smoothScroll";
import {navLinks} from "../data";
import {X} from "lucide-react";

export const CinematicNav = () => {
  const lenis = useLenis();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const barRef = useRef(null);

  useEffect(() => {
    const read = () => setScrolled(window.scrollY > 24);
    read();
    window.addEventListener("scroll", read, {passive: true});
    return () => window.removeEventListener("scroll", read);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (href) => (e) => {
    e.preventDefault();
    setOpen(false);
    const id = href.replace("#", "");
    const el = document.getElementById(id);
    if (!el) return;
    if (lenis) lenis.scrollTo(el, {offset: 0, duration: 1.6});
    else el.scrollIntoView({behavior: "smooth"});
  };

  useEffect(() => {
    if (open && lenis) lenis.stop();
    else if (lenis) lenis.start();
    return () => {
      if (lenis) lenis.start();
    };
  }, [open, lenis]);

  return (
    <header className={`ga-nav ${scrolled ? "ga-nav-scrolled" : ""} ${open ? "ga-nav-open" : ""}`} ref={barRef}>
      <div className="ga-nav-inner">
        <a
          href="#ga-top"
          onClick={go("#ga-top")}
          className="ga-brand"
          aria-label="PG Program in Generative AI & Agentic AI — back to top"
        >
          <span className="ga-brand-mark" aria-hidden="true">
            <span className="ga-brand-dot">◦</span>
          </span>
          <span className="ga-brand-text">
            <strong>PG·AI</strong>
            <small>GenAI × Agentic</small>
          </span>
        </a>

        <nav className="ga-nav-links" aria-label="Section navigation">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} onClick={go(link.href)}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ga-nav-actions">
          <a href="#ga-cta" onClick={go("#ga-cta")} className="ga-btn ga-btn-ghost" data-cursor>
            Apply Now
          </a>
          <button
            type="button"
            className="ga-burger"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Toggle menu"
          >
            {open ? <X size={20} /> : (
              <span className="ga-burger-lines" aria-hidden="true"><i /><i /><i /></span>
            )}
          </button>
        </div>
      </div>

      <div className="ga-nav-overlay" aria-hidden={!open}>
        <nav className="ga-nav-overlay-links">
          {navLinks.map((link, i) => (
            <a
              key={link.href}
              href={link.href}
              onClick={go(link.href)}
              style={open ? {transitionDelay: `${80 + i * 60}ms`} : undefined}
            >
              <span className="ga-overlay-index">0{i + 1}</span>
              {link.label}
            </a>
          ))}
          <a href="#ga-cta" onClick={go("#ga-cta")} className="ga-overlay-cta">
            Apply Now
          </a>
        </nav>
      </div>
    </header>
  );
};