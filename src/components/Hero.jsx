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
        <p className="hh-note" aria-hidden="true">
          Better Skills <span>✦</span>
          <br />
          Bigger Opportunities
          <svg viewBox="0 0 60 40" className="hh-note__arrow">
            <path d="M4 6c18 2 34 10 44 26" />
            <path d="M40 30l8 3 1-9" />
          </svg>
        </p>

        <figure className="hh-photo">
          {/* AI-generated hero image. */}
          <img
            src="/images/hero-student.webp"
            srcSet="/images/hero-student-600.webp 600w, /images/hero-student.webp 855w"
            sizes="(max-width: 767px) 92vw, 40vw"
            width="855"
            height="984"
            alt="A smiling CareerVeda student holding a laptop, with her backpack on"
            fetchPriority="high"
          />
        </figure>

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

export default Hero;
