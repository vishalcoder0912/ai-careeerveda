import {Suspense, lazy, useEffect, useRef, useState} from "react";
import {Link} from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Briefcase,
  GraduationCap,
  Handshake,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  UsersRound,
} from "lucide-react";
import {createLook, hasWebGL, useNeuralFlow, whenLoadedAndIdle} from "./neural/flow";
import "./home-hero.css";

const FEATURES = [
  [Target, "Personalized Learning"],
  [UsersRound, "Expert Mentorship"],
  [Briefcase, "Placement Support"],
  [BadgeCheck, "Verified Projects"],
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

// The brain. On wide screens NeuralFlow's shared stage renders it behind this
// column (so it can travel into the scroll story); this box only reserves the
// space and shows the CSS atmosphere until that canvas is up. Elsewhere
// (phones, reduced motion) the hero renders its own still copy of the same
// scene.
//
// three.js is ~730 KB, so it is its own chunk, fetched only after the page
// has loaded (the headline is the LCP) and paused while off screen. Without
// WebGL the CSS atmosphere alone stands in.
const BrainCanvas = lazy(() => import("./neural/BrainCanvas"));

// The hero frame of the shared look, framed closer for its smaller canvas.
const STILL_LOOK = {...createLook(), camZ: 5.2, scale: 1.1};

const HeroBrainLayer = () => {
  const flow = useNeuralFlow();
  const shared = Boolean(flow?.mode.cinematic);
  const stageRef = useRef(null);
  const [mode, setMode] = useState(null);
  const [onScreen, setOnScreen] = useState(true);

  useEffect(() => {
    if (shared || !hasWebGL()) return undefined;
    const next = {
      still: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      phone: window.matchMedia("(max-width: 767px)").matches,
      count: flow?.mode.count ?? 4000,
    };
    return whenLoadedAndIdle(() => setMode(next));
  }, [shared, flow]);

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
          <BrainCanvas look={STILL_LOOK} mode={mode} active={onScreen} />
        </Suspense>
      )}
    </div>
  );
};

const Hero = ({stats}) => (
  <section id="top" className="hh" aria-labelledby="hh-title">
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
        <HeroBrainLayer />
      </div>
    </div>

    {/* A real heading, visually hidden, so the numbers sit in the page's outline
        under the h1 instead of being an unlabelled list to a crawler. */}
    <h2 id="hh-stats-title" className="hh-sr">CareerVeda in numbers</h2>
    <ul className="hh-stats" aria-labelledby="hh-stats-title">
      {stats.map(([value, label]) => {
        const Icon = STAT_ICONS[label] || GraduationCap;
        return (
          <li key={label}>
            <span className="hh-stats__icon" aria-hidden="true">
              <Icon size={20} strokeWidth={2} />
            </span>
            <span>
              {/* <data> carries the bare number for machines; "13,000+" stays
                  the text people read. */}
              <strong>
                <data value={value.replace(/[^\d.]/g, "")}>{value}</data>
              </strong>
              <small>{label}</small>
            </span>
          </li>
        );
      })}
    </ul>
  </section>
);

export default Hero;
