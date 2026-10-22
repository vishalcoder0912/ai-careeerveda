import {Suspense, lazy, useEffect, useRef, useState} from "react";
import {Link} from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Briefcase,
  GraduationCap,
  Handshake,
  Hammer,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  UsersRound,
} from "lucide-react";
import "./home-hero.css";

const FEATURES = [
  [Target, "Personalized Learning"],
  [UsersRound, "Expert Mentorship"],
  [Briefcase, "Placement Support"],
  [BadgeCheck, "Verified Projects"],
];

const CAREER_PATH = [
  {icon: GraduationCap, tone: "blue", title: "Learn", body: "Live classes + expert faculty"},
  {icon: Hammer, tone: "orange", title: "Build", body: "Real-world projects"},
  {icon: UsersRound, tone: "green", title: "Get Mentored", body: "Industry experts"},
  {icon: Briefcase, tone: "purple", title: "Get Placed", body: "Top companies"},
];

// Keyed by label so the numbers stay whatever siteData.js says; a stat without
// an entry here still renders, just with the generic icon.
const STAT_ICONS = {
  "Successful Learners": Users,
  "Recruitment Partners": Handshake,
  "Average Salary Growth": TrendingUp,
  "Career Programs": BookOpen,
  "Professional Mentors": UserCheck,
};

// three.js is ~730 KB, so the brain is its own chunk, fetched only after the
// page has loaded (the headline is the LCP) and paused while the hero is off
// screen. Without WebGL the CSS halo alone stands in.
const HeroBrain = lazy(() => import("./HeroBrain"));

const hasWebGL = () => {
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
};

const HeroBrainLayer = ({hostRef}) => {
  const stageRef = useRef(null);
  const [mode, setMode] = useState(null);
  const [onScreen, setOnScreen] = useState(true);

  useEffect(() => {
    if (!hasWebGL()) return undefined;
    const phone = window.matchMedia("(max-width: 767px)").matches;
    const weak = (navigator.hardwareConcurrency || 8) <= 4;
    const next = {
      still: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      phone,
      count: phone ? 3800 : weak ? 5500 : 9000,
    };

    const start = () => setMode(next);
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, {once: true});
    return () => window.removeEventListener("load", start);
  }, []);

  useEffect(() => {
    if (!mode || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, [mode]);

  return (
    <div className="hh-orbit" ref={stageRef} aria-hidden="true">
      {mode && (
        <Suspense fallback={null}>
          {/* 0.36: the middle of the visual's open column, past the card on
              the right. Phones stack the card below, so centre it there. */}
          <HeroBrain
            centerX={mode.phone ? 0.5 : 0.36}
            count={mode.count}
            still={mode.still}
            scrollDepth={mode.phone ? 0 : 1}
            active={onScreen}
            hostRef={hostRef}
          />
        </Suspense>
      )}
    </div>
  );
};

const Hero = ({stats}) => {
  const sectionRef = useRef(null);
  return (
  <section id="top" className="hh" aria-labelledby="hh-title" ref={sectionRef}>
    <div className="hh-inner">
      <div className="hh-copy">
        <p className="hh-eyebrow">
          <span className="hh-eyebrow__dot" aria-hidden="true" />
          From Learning to Placement
          <span className="hh-eyebrow__more"> — We Guide Every Step</span>
        </p>
        <h1 id="hh-title" className="hh-title">
          Launch Your Career with <br className="hh-br" />
          <span className="hh-accent">Industry-Led</span> Programs
        </h1>
        <p className="hh-lead">
          Master Data Analytics, Product Management, Data Science and Generative AI
          through live classes, hands-on projects, expert mentorship, and dedicated
          placement support designed to help you become job-ready.
        </p>

        <ul className="hh-features" aria-label="CareerVeda benefits">
          {FEATURES.map(([Icon, label]) => (
            <li key={label}>
              <span className="hh-features__icon" aria-hidden="true">
                <Icon size={16} strokeWidth={2} />
              </span>
              {label}
            </li>
          ))}
        </ul>

        <div className="hh-actions">
          <Link className="hh-btn hh-btn--primary" to="/programs">
            Explore Programs <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link className="hh-btn hh-btn--secondary" to="/#consultation">
            Get in Touch
          </Link>
        </div>
      </div>

      <div className="hh-visual">
        <HeroBrainLayer hostRef={sectionRef} />

        <aside className="hh-path" aria-labelledby="hh-path-title">
          <h2 id="hh-path-title">Your Career Path</h2>
          <ol>
            {CAREER_PATH.map(({icon: Icon, tone, title, body}) => (
              <li key={title}>
                <span className={`hh-path__icon is-${tone}`} aria-hidden="true">
                  <Icon size={17} strokeWidth={2.2} />
                </span>
                <span>
                  <strong>{title}</strong>
                  <small>{body}</small>
                </span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>

    <ul className="hh-stats" aria-label="CareerVeda in numbers">
      {stats.map(([value, label]) => {
        const Icon = STAT_ICONS[label] || GraduationCap;
        return (
          <li key={label}>
            <span className="hh-stats__icon" aria-hidden="true">
              <Icon size={20} strokeWidth={2} />
            </span>
            <span>
              <strong>{value}</strong>
              <small>{label}</small>
            </span>
          </li>
        );
      })}
    </ul>
  </section>
  );
};

export default Hero;
