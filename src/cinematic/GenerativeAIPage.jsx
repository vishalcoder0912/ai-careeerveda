import {useEffect, useState} from "react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {useLenis} from "../lib/smoothScroll";
import {killFX, syncLenisToScrollTrigger, reducedMotionNow} from "./fx/registry";
import {
  ParticleField,
  FilmGrain,
  CustomCursor,
} from "./components/Atmosphere";
import {GlowTrail} from "./components/GlowTrail";
import {ClickSpark} from "./components/ClickSpark";
import SiteNavbar from "../components/SiteNavbar";
import {navItems} from "../data/siteData";
import {HeroSection} from "./components/Hero";
import {TimelineSection} from "./components/Timeline";
import {SkillsSection} from "./components/Skills";
import {AIQuote} from "./components/Quote";
import {ProgramArchitecture} from "./components/Architecture";
import {ModuleGrid} from "./components/ModuleGrid";
import {AgentSystem} from "./components/AgentSystem";
import {AgentWorkflow} from "./components/AgentWorkflow";
import {ProjectsSection} from "./components/Projects";
import {CareerOutcomes} from "./components/Careers";
import {StatisticsSection} from "./components/Stats";
import {LearningExperience} from "./components/Learning";
import {CertificationSection} from "./components/Certifications";
import {FinalCTA} from "./components/FinalCta";
import {GaFooter} from "./components/GaFooter";
import "./cinematic.css";
import "./cinematic-site-theme.css";
import "./cinematic-2026-light.css";

/* Phones and tablets only (the page's own desktop breakpoint is 900px), and
   never for reduced-motion readers. Desktop renders exactly as before. */
const MQ_MOBILE_MOTION = "(max-width: 899px) and (prefers-reduced-motion: no-preference)";

export function GenerativeAIPage() {
  const lenis = useLenis();
  const [mobileMotion, setMobileMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MQ_MOBILE_MOTION);
    const sync = () => setMobileMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  /* React Bits' FadeContent/BlurText entrance on the section headings: each
     title de-blurs and rises as it scrolls in. gsap.matchMedia reverts every
     inline style it set the moment the viewport leaves the query, so a resize
     to desktop is left with untouched headings. */
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(MQ_MOBILE_MOTION, () => {
      gsap.utils.toArray(".ga-page .ga-display").forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 28,
          filter: "blur(10px)",
          duration: 0.9,
          ease: "power3.out",
          clearProps: "filter",
          scrollTrigger: {trigger: el, start: "top 88%", once: true},
        });
      });
    });
    return () => mm.revert();
  }, []);

  useEffect(() => {
    document.body.classList.add("ga-body");

    /* One shared reveal observer for every .ga-reveal element. Reduces dozens
       of individual IntersectionObservers to one. */
    const reduced = reducedMotionNow();
    if (!reduced) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("ga-in");
              io.unobserve(entry.target);
            }
          });
        },
        {threshold: 0.16, rootMargin: "0px 0px -6% 0px"},
      );
      document.querySelectorAll(".ga-reveal").forEach((el) => io.observe(el));
      const onNew = () => {
        document.querySelectorAll(".ga-reveal:not(.ga-in)").forEach((el) => io.observe(el));
      };
      const t = setTimeout(onNew, 800);
      window.addEventListener("load", onNew, {once: true});
      const mo = new MutationObserver(onNew);
      mo.observe(document.getElementById("root"), {childList: true, subtree: true});
      return () => {
        io.disconnect();
        mo.disconnect();
        clearTimeout(t);
        window.removeEventListener("load", onNew);
        document.body.classList.remove("ga-body");
      };
    }

    return () => document.body.classList.remove("ga-body");
  }, []);

  useEffect(() => {
    /* Lenis is published to the tree asynchronously (null → instance), so this
       effect must NOT key off [lenis]: the re-render that supplies the instance
       would re-run it, and its cleanup calls killFX() — tearing down every
       pinned trigger the sections just created. Runs once; the [lenis] effect
       below re-attaches the scroll hook when the instance appears. */
    const unsync = syncLenisToScrollTrigger(lenis);

    const refresh = () => ScrollTrigger.refresh();
    const t1 = setTimeout(refresh, 120);
    const t2 = setTimeout(refresh, 1200);
    window.addEventListener("load", refresh, {once: true});

    return () => {
      unsync();
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("load", refresh);
      killFX();
    };
    /* Runs exactly once on purpose: re-keying on [lenis] would re-run this and
       kill every registered trigger the moment Lenis appears. The subscription
       is re-attached by the effect directly below. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Re-attach the module-level scroll hook if Lenis appears after the effect
     above (there is nothing to kill while scrolling — re-subscribing is safe). */
  useEffect(() => {
    if (!lenis) return undefined;
    return syncLenisToScrollTrigger(lenis);
  }, [lenis]);

  return (
    <div className="ga-page">
      <ParticleField />
      <FilmGrain />
      <CustomCursor />
      <GlowTrail />
      {mobileMotion && <ClickSpark />}

      {/* The site navbar, exactly as the home page gets it: the shell reserves
          --navbar-height of document space and the bar itself is fixed, so it
          floats over the hero and docks on scroll (navbar-area.css). */}
      <div className="navbar-shell">
        <SiteNavbar navItems={navItems} />
      </div>

      <main>
        <HeroSection />
        <TimelineSection />
        <SkillsSection />
        <AIQuote />
        <ProgramArchitecture />
        <ModuleGrid />
        <AgentSystem />
        <AgentWorkflow />
        <ProjectsSection />
        <CareerOutcomes />
        <StatisticsSection />
        <LearningExperience />
        <CertificationSection />
        <FinalCTA />
      </main>

      <GaFooter />
    </div>
  );
}

export default GenerativeAIPage;