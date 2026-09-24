import {useState} from "react";
import {Link} from "react-router-dom";
import {Lock, ArrowRight} from "lucide-react";
import {curriculumJourney, continuousTracks} from "../data";
import {SectionLabel} from "./Atmosphere";

const AGENTIC_PROGRAM = "ai-systems-agentic-ai";
const AGENTIC_TITLE = "PG Program in AI Systems & Agentic AI Engineering";

const WeekRow = ({week}) => {
  const [open, setOpen] = useState(false);
  const panelId = `ga-jw-${week.id}-topics`;

  return (
    <div className={`ga-journey-week${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="ga-journey-week-btn"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ga-journey-week-id">{week.id}</span>
        <span className="ga-journey-week-title">{week.title}</span>
        <span className="ga-journey-week-meta" aria-hidden="true">
          {week.topics.length} topics
        </span>
        <span className="ga-journey-week-arrow" aria-hidden="true" />
      </button>

      <div className="ga-journey-week-reveal" id={panelId} role="region">
        <div className="ga-journey-week-reveal-inner">
          <ul className="ga-journey-topics">
            {week.topics.map((t) => <li key={t}>{t}</li>)}
          </ul>
          {week.build && (
            <div className="ga-journey-build">
              <span className="ga-journey-build-label">Deliverable</span>
              <span className="ga-journey-build-text">{week.build}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const JourneyCard = ({phase, index, open, onToggle}) => {
  const triggerId = `ga-journey-${phase.id}-trigger`;
  const panelId = `ga-journey-${phase.id}-weeks`;

  return (
    <div
      className="ga-journey-cell ga-reveal ga-reveal-up"
      style={{transitionDelay: `${index * 70}ms`}}
    >
      <article
        className={`ga-journey-card${open ? " is-open" : ""}`}
      >
        <button
          type="button"
          className="ga-journey-card-btn"
          aria-expanded={open}
          aria-controls={panelId}
          id={triggerId}
          onClick={onToggle}
        >
          <span className="ga-journey-top">
            <span className="ga-journey-num">{phase.id}</span>
            <span className="ga-journey-arrow" aria-hidden="true" />
          </span>

          <span className="ga-journey-card-body">
            <span className="ga-journey-title">{phase.title}</span>
            <span className="ga-journey-range">{phase.range}</span>
            <span className="ga-journey-desc">{phase.description}</span>
          </span>

          <span className="ga-journey-foot">
            <span className="ga-journey-motif">{phase.motif}</span>
            <span className="ga-journey-weeks-count" aria-hidden="true">
              {phase.weeks.length} weeks
            </span>
          </span>
        </button>

        <div
          className="ga-journey-reveal"
          id={panelId}
          role="region"
          aria-labelledby={triggerId}
        >
          <div className="ga-journey-reveal-inner">
            <div className="ga-journey-weeks">
              {phase.weeks.map((w) => <WeekRow key={w.id} week={w} />)}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
};

const JourneyLockCard = () => {
  const handleLockClick = () => {
    if (typeof window.gtag === "function") {
      window.gtag("event", "roadmap_lock_click", {
        program: AGENTIC_PROGRAM,
        course: AGENTIC_TITLE,
        page_path: window.location.pathname,
      });
    }
  };

  return (
    <div
      className="ga-journey-cell ga-reveal ga-reveal-up ga-journey-cell-locked"
      style={{transitionDelay: `${curriculumJourney.length * 70}ms`}}
    >
      <Link
        className="ga-journey-card ga-journey-lock-card"
        to={`/enroll?program=${AGENTIC_PROGRAM}`}
        onClick={handleLockClick}
      >
        <span className="ga-journey-top">
          <span className="ga-journey-num ga-journey-num-lock" aria-hidden="true">
            <Lock size={15} strokeWidth={2.6} />
          </span>
          <span className="ga-journey-arrow" aria-hidden="true">
            <ArrowRight size={17} />
          </span>
        </span>

        <span className="ga-journey-card-body">
          <span className="ga-journey-title">Agentic AI Application Labs</span>
          <span className="ga-journey-range">Unlocked at enrollment</span>
          <span className="ga-journey-desc">
            Six bonus weeks of hands-on agentic builds — MCP tooling, multi-agent orchestration and a production capstone.
          </span>
        </span>

        <span className="ga-journey-foot">
          <span className="ga-journey-motif">Locked</span>
          <span className="ga-journey-unlock-pill">Unlock &#8594;</span>
        </span>
      </Link>
    </div>
  );
};

export const ModuleGrid = () => {
  const [openIndex, setOpenIndex] = useState(0);

  const toggle = (i) =>
    setOpenIndex((prev) => (prev === i ? -1 : i));

  return (
    <section className="ga-modules" id="ga-modules">
      <div className="ga-modules-head">
        <SectionLabel index="05">Curriculum Journey</SectionLabel>
        <h2 className="ga-display">
          Five Stages.
          <br />
          <em>Twenty-Four Weeks.</em>
        </h2>
        <p className="ga-sub">
          One roadmap from Python to production agents — open a stage to walk through its weeks.
        </p>
      </div>

      <div className="ga-journey">
        <div className="ga-journey-grid">
          {curriculumJourney.map((phase, i) => (
            <JourneyCard
              key={phase.id}
              phase={phase}
              index={i}
              open={openIndex === i}
              onToggle={() => toggle(i)}
            />
          ))}
          <JourneyLockCard />
        </div>
      </div>

      <div className="ga-mod-tracks">
        <span className="ga-meta ga-mod-tracks-label">Continuous tracks — run through all 24 weeks</span>
        <div className="ga-mod-tracks-row">
          {continuousTracks.map((t) => (
            <span className="ga-mod-track" key={t.title}>
              <strong>{t.title}</strong>
              <em>{t.range}</em>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ModuleGrid;