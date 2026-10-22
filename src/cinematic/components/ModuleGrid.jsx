import {useEffect, useId, useRef, useState} from "react";
import {Link} from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Hammer,
  X,
} from "lucide-react";
import {useLockSmoothScroll} from "../../lib/smoothScroll";
import {Lines, useCinematic} from "../content";
import {SectionLabel} from "./Atmosphere";
import "./stage-dialog.css";

// Stage art: Microsoft Fluent Emoji 3D (MIT), 128px webp, named per stage id in
// the program's modules.art. Decorative — the stage title beside it carries
// the meaning, so alt is empty.
const stageArt = (name) => `/images/curriculum/${name}.webp`;

// A stage card is a button: it opens the stage in StageDialog instead of
// expanding in place, so every card in the grid keeps the same height.
const JourneyCard = ({phase, index, art, unit, onOpen}) => (
  <div
    className="ga-journey-cell ga-reveal ga-reveal-up"
    style={{transitionDelay: `${index * 70}ms`}}
  >
    <article className="ga-journey-card">
      <button
        type="button"
        className="ga-journey-card-btn"
        aria-haspopup="dialog"
        onClick={onOpen}
      >
        <span className="ga-journey-top">
          <span className="ga-journey-num">{phase.id}</span>
          <img
            className="ga-journey-art"
            src={stageArt(art[phase.id])}
            alt=""
            width="56"
            height="56"
            loading="lazy"
          />
        </span>

        <span className="ga-journey-card-body">
          <span className="ga-journey-title">{phase.title}</span>
          <span className="ga-journey-range">{phase.range}</span>
          <span className="ga-journey-desc">{phase.description}</span>
        </span>

        <span className="ga-journey-foot">
          <span className="ga-journey-motif">{phase.motif}</span>
          <span className="ga-journey-weeks-count" aria-hidden="true">
            View {phase.weeks.length} {unit} &#8594;
          </span>
        </span>
      </button>
    </article>
  </div>
);

// One modal for every stage: its weeks, topics and deliverables, a "Back to
// all stages" control, and previous/next to walk the roadmap without closing.
// Native <dialog> gives the focus trap, Esc and focus return for free.
const StageDialog = ({stages, art, unit, index, onClose, onGo}) => {
  const dialogRef = useRef(null);
  const bodyRef = useRef(null);
  const titleId = useId();
  const open = index >= 0;
  const phase = open ? stages[index] : null;

  useLockSmoothScroll(open);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Moving to another stage starts its content from the top.
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [index]);

  const topicCount = phase ? phase.weeks.reduce((n, w) => n + w.topics.length, 0) : 0;
  const builds = phase ? phase.weeks.filter((w) => w.build).length : 0;
  const prev = index > 0 ? stages[index - 1] : null;
  const next = open && index < stages.length - 1 ? stages[index + 1] : null;
  const total = String(stages.length).padStart(2, "0");

  return (
    <dialog
      ref={dialogRef}
      className="ga-stage-dialog"
      aria-labelledby={titleId}
      data-lenis-prevent
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // A click on the backdrop lands on the <dialog> element itself.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {phase && (
        <div className="ga-stage">
          <div className="ga-stage-bar">
            <button type="button" className="ga-stage-back" onClick={onClose}>
              <ArrowLeft size={16} aria-hidden="true" />
              Back to all stages
            </button>
            <button type="button" className="ga-stage-close" onClick={onClose} aria-label="Close">
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="ga-stage-body" ref={bodyRef}>
            <header className="ga-stage-head">
              <img className="ga-stage-art" src={stageArt(art[phase.id])} alt="" width="72" height="72" />
              <span className="ga-stage-num" aria-hidden="true">{phase.id}</span>
              <div>
                <p className="ga-stage-kicker">
                  Stage {phase.id} of {total} · {phase.range}
                </p>
                <h3 id={titleId} className="ga-stage-title">{phase.title}</h3>
                <p className="ga-stage-desc">{phase.description}</p>
              </div>
            </header>

            <ul className="ga-stage-stats" aria-label="Stage at a glance">
              <li>
                <CalendarDays size={16} aria-hidden="true" />
                <strong>{phase.weeks.length}</strong> {unit}
              </li>
              <li>
                <BookOpen size={16} aria-hidden="true" />
                <strong>{topicCount}</strong> topics
              </li>
              <li>
                <Hammer size={16} aria-hidden="true" />
                <strong>{builds}</strong> builds
              </li>
              <li className="ga-stage-motif">{phase.motif}</li>
            </ul>

            <ol className="ga-stage-weeks">
              {phase.weeks.map((week) => (
                <li className="ga-stage-week" key={week.id}>
                  <span className="ga-stage-week-id">{week.id}</span>
                  <div className="ga-stage-week-main">
                    <h4>{week.title}</h4>
                    <ul className="ga-stage-topics">
                      {week.topics.map((t) => <li key={t}>{t}</li>)}
                    </ul>
                    {week.build && (
                      <p className="ga-stage-build">
                        <Hammer size={14} aria-hidden="true" />
                        <span>
                          <b>Deliverable</b> {week.build}
                        </span>
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <nav className="ga-stage-foot" aria-label="Other stages">
            <button type="button" disabled={!prev} onClick={() => onGo(index - 1)}>
              <ChevronLeft size={16} aria-hidden="true" />
              <span>{prev ? prev.title : "First stage"}</span>
            </button>
            <button type="button" disabled={!next} onClick={() => onGo(index + 1)}>
              <span>{next ? next.title : "Last stage"}</span>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </nav>
        </div>
      )}
    </dialog>
  );
};

// The locked bonus card that closes the grid — only for programs that
// declare one (modules.lockCard).
const JourneyLockCard = ({card, index, programTitle}) => {
  const handleLockClick = () => {
    if (typeof window.gtag === "function") {
      window.gtag("event", "roadmap_lock_click", {
        program: card.programId,
        course: programTitle,
        page_path: window.location.pathname,
      });
    }
  };

  return (
    <div
      className="ga-journey-cell ga-reveal ga-reveal-up ga-journey-cell-locked"
      style={{transitionDelay: `${index * 70}ms`}}
    >
      <Link
        className="ga-journey-card ga-journey-lock-card"
        to={`/enroll?program=${card.programId}`}
        onClick={handleLockClick}
      >
        <span className="ga-journey-top">
          <span className="ga-journey-num ga-journey-num-lock" aria-hidden="true">
            {card.badge}
          </span>
          <img className="ga-journey-art" src={stageArt("labs")} alt="" width="56" height="56" loading="lazy" />
        </span>

        <span className="ga-journey-card-body">
          <span className="ga-journey-title">{card.title}</span>
          <span className="ga-journey-range">{card.range}</span>
          <span className="ga-journey-desc">{card.description}</span>
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
  const {modules, programTitle} = useCinematic();
  const {stages, art, unit, lockCard, tracks} = modules;
  // Index of the stage shown in the dialog; -1 when it is closed.
  const [active, setActive] = useState(-1);

  return (
    <section className="ga-modules" id="ga-modules">
      <div className="ga-modules-head">
        <SectionLabel index="05">{modules.label}</SectionLabel>
        <h2 className="ga-display">
          <Lines lines={modules.title} />
        </h2>
        <p className="ga-sub">{modules.sub}</p>
      </div>

      <div className="ga-journey">
        <div className="ga-journey-grid">
          {stages.map((phase, i) => (
            <JourneyCard
              key={phase.id}
              phase={phase}
              index={i}
              art={art}
              unit={unit}
              onOpen={() => setActive(i)}
            />
          ))}
          {lockCard && <JourneyLockCard card={lockCard} index={stages.length} programTitle={programTitle} />}
        </div>
      </div>

      <StageDialog
        stages={stages}
        art={art}
        unit={unit}
        index={active}
        onClose={() => setActive(-1)}
        onGo={setActive}
      />

      {tracks?.length > 0 && (
        <div className="ga-mod-tracks">
          <span className="ga-meta ga-mod-tracks-label">{modules.tracksLabel}</span>
          <div className="ga-mod-tracks-row">
            {tracks.map((t) => (
              <span className="ga-mod-track" key={t.title}>
                <strong>{t.title}</strong>
                <em>{t.range}</em>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default ModuleGrid;
