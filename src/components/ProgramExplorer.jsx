import {useState,useCallback,useMemo,useRef,useEffect} from "react";
import {Link} from "react-router-dom";
import {AnimatePresence,motion,useScroll,useTransform,useReducedMotion} from "framer-motion";
import {programCatalog} from "../data/programCatalog";
import {faqs} from "../data/faqs";
import {useContentList} from "../hooks/useContent";
import {adaptProgram} from "../lib/contentAdapters";
import {cdnImage} from "../lib/imageCdn";
import {titleParts} from "./program-detail/programAssist";
import {matchJobs} from "./program-detail/jobTracks";
import SkillMark from "./SkillMark";
import "./program-explorer.css";

// Tab labels are the program sections from the reference, minus the ones the
// preview card has nothing honest to show: Jobs appears only when the catalogue
// has real openings that match, Fees only when a fee is actually published.

// The artwork sits in a 4:3 frame in the card's right-hand column, ~420px wide at
// most. The originals are full-size PNGs (investment-banking alone is 122 KB).
const PROGRAM_IMAGE_WIDTH = 840;

const contentVariants = {
  enter:{opacity:0,y:14},
  center:{opacity:1,y:0},
  exit:{opacity:0,y:-10},
};

// Small inline stroke icons — same family as the programme detail page, no icon
// library.
const metaIconPaths = {
  calendar: <path d="M8 2v4M16 2v4M3 9h18M5 4h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />,
  user: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c0-4 3.6-7 8-7s8 3 8 7" />,
  monitor: <path d="M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6ZM8 20h8M12 15v5" />,
  users: <path d="M16 21v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-1a4 4 0 0 0-3-3.9M15.5 3.2a4 4 0 0 1 0 7.6" />,
};

const MetaStripIcon = ({name}) => (
  <svg
    className="program-meta-icon"
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {metaIconPaths[name]}
  </svg>
);

const ProgramExplorer = () => {
  // Published programs from the API, ordered by the panel's displayOrder — the
  // rail numbers itself off that order, so reordering programs in the admin
  // renumbers the badges here. Falls back to the static catalogue.
  const {items: PROGRAMS} = useContentList("programs", {
    fallback: programCatalog,
    adapt: adaptProgram,
  });

  const [activeId,setActiveId] = useState(programCatalog[0]?.id || "");
  const [previewId,setPreviewId] = useState(null);
  const [activeTab,setActiveTab] = useState("Overview");
  const listRef = useRef(null);
  const detailRef = useRef(null);
  const explorerRef = useRef(null);

  const displayId = previewId || activeId;
  // The selected program can vanish under us when the API list arrives — the
  // admin may have unpublished it — so the first program is the standing
  // fallback rather than an undefined that would take the card down with it.
  const activeProgram = useMemo(
    () => PROGRAMS.find((p) => p.id === displayId) || PROGRAMS[0],
    [PROGRAMS,displayId],
  );
  const tabContent = useMemo(
    () => activeProgram?.[activeTab.toLowerCase()] || [],
    [activeProgram,activeTab],
  );

  const handleClick = useCallback((id) => {
    setActiveId(id);
    setPreviewId(null);
  }, []);

  const handleHoverStart = useCallback((id) => {
    setPreviewId(id);
  }, []);

  const handleHoverEnd = useCallback(() => {
    setPreviewId(null);
  }, []);

  // Subtle scroll parallax for the artwork and its floating skill chips, tied to
  // the explorer's own path through the viewport. The ranges are kept to a few
  // pixels so the movement reads as depth, not motion for its own sake.
  const prefersReducedMotion = useReducedMotion();
  const {scrollYProgress} = useScroll({
    target: explorerRef,
    offset: ["start end", "end start"],
  });
  const mediaY = useTransform(scrollYProgress, [0, 1], [8, -8]);
  const chipsY = useTransform(scrollYProgress, [0, 1], [18, -18]);
  const parallaxMediaStyle = {y: prefersReducedMotion ? 0 : mediaY};
  const parallaxChipsStyle = {y: prefersReducedMotion ? 0 : chipsY};

  // The right-hand highlights panel restates the record's own fields next to the
  // card; nothing here is invented. Placement support is read from the badges the
  // catalog already carries, so a program without it simply omits the row.
  const placementBadge = Array.isArray(activeProgram.badges)
    ? activeProgram.badges.find((b) => b.includes("Placement"))
    : null;
  const programFee = activeProgram.fee || (activeProgram.startingPrice
    ? {label: "Program Investment", amount: activeProgram.startingPrice}
    : null);
  const feeAmount = programFee ? String(programFee.amount).replace(/^₹/, "") : null;

  // Two-tone headline, matching the programme detail page: the "PG Program in"
  // prefix stays ink and the track name carries the brand accent.
  const {prefix, keyword} = titleParts(activeProgram.fullTitle || activeProgram.title);

  // Real openings for this track, from the live jobs data — never invented.
  const matchedJobs = matchJobs(activeProgram, 3);
  const hasJobs = matchedJobs.length > 0;
  const hasFee = Boolean(feeAmount);

  const tabs = [
    "Overview",
    "Curriculum",
    "Outcomes",
    ...(hasJobs ? ["Jobs"] : []),
    ...(hasFee ? ["Fees"] : []),
    "FAQs",
  ];

  const mentorshipValue = Array.isArray(activeProgram.mentorship)
    ? activeProgram.mentorship.join(", ")
    : activeProgram.mentorship;

  const metaItems = [
    activeProgram.duration && {icon: "calendar", label: "Duration", value: activeProgram.duration},
    mentorshipValue && {icon: "user", label: "Mentorship", value: mentorshipValue},
    activeProgram.format && {icon: "monitor", label: "Format", value: activeProgram.format},
    activeProgram.learners && {icon: "users", label: "Learners", value: activeProgram.learners},
  ].filter(Boolean);

  const feeTabRows = [
    activeProgram.emi && {label: "EMI available", value: activeProgram.emi},
    activeProgram.nextBatch && {label: "Next batch", value: activeProgram.nextBatch},
    activeProgram.seats && {label: "Seats", value: activeProgram.seats},
  ].filter(Boolean);

  // Keyed on activeId, never displayId. Following the hover preview here was a
  // feedback loop: smooth-scrolling the list moved the items under a stationary
  // cursor, which fired mouseenter on a neighbour, which scrolled again — the
  // rail never settled and pegged a core. Hovering an item you are already
  // pointing at does not need scrolling; only a committed selection does.
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector(`[data-program-id="${activeId}"]`);
    if (activeEl) activeEl.scrollIntoView({behavior:"smooth",block:"nearest"});
  }, [activeId]);

  // Only reachable if both the API and the static catalogue are empty, which
  // would mean the site has no programs at all. Better a missing section than a
  // card rendering undefined.
  if (!activeProgram) return null;

  return (
    <div className="program-explorer" data-cinematic-card="true">
      <aside className="program-sidebar" aria-label="CareerVeda program list">
        <div className="program-sidebar-head">
          <span>01</span>
          <strong>Programs</strong>
        </div>
        <div className="program-track-list" ref={listRef} role="tablist" aria-label="Programs">
          {PROGRAMS.map((program, index) => {
            const isActive = activeId === program.id;
            const isPreviewed = previewId === program.id && !isActive;
            return (
              <button
                key={program.id}
                data-program-id={program.id}
                aria-selected={isActive}
                className={`program-track-item ${isActive ? "is-active" : ""} ${isPreviewed ? "is-previewed" : ""}`}
                onClick={() => handleClick(program.id)}
                onMouseEnter={() => handleHoverStart(program.id)}
                onMouseLeave={handleHoverEnd}
                onFocus={() => handleHoverStart(program.id)}
                onBlur={handleHoverEnd}
                type="button"
                role="tab"
              >
                {/* Counted off the list, not stored on the record. These badges say
                    "first in the list", so reordering programCatalog has to renumber
                    them — when the number lived in the data it stayed behind, and the
                    rail opened on a card labelled 04 sitting in position 1. */}
                <span className={`track-number ${isActive ? "track-number--selected" : ""}`}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="track-text">
                  <strong>{program.title}</strong>
                  <small>{program.category}</small>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <article className="program-detail-card" ref={detailRef}>
        <div className="program-card-topline">
          <span className="category-badge">{activeProgram.category}</span>
          <small className="admissions-badge">Admissions Open &middot; Limited Seats</small>
        </div>

        <div className="program-card-body">
          <AnimatePresence mode="wait">
            <motion.div
              key={displayId}
              variants={contentVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{duration: 0.4, ease: "easeOut"}}
              className="program-card-content"
            >
              <div className="program-detail-head">
                <div className="program-head-text">
                  <p className="section-label">CareerVeda Program Studio</p>
{/* h2, not h3: the explorer sits directly under the page's
                        h1 with no intermediate section heading, so a h3 skipped
                        a level and Lighthouse failed /programs on heading-order. */}
                  <h2>
                    {prefix}
                    {keyword && <span className="program-accent">{keyword}</span>}
                  </h2>
                  <strong className="program-subtitle">{activeProgram.subtitle}</strong>
                  {/* The description belongs beside the artwork, not beneath it:
                      as a sibling of the head it spanned the full card width and
                      ran under the image, leaving a ragged L-shaped block. */}
                  <p className="program-description">{activeProgram.description}</p>
                </div>
                {/* The artwork takes the head's right-hand column, which the
                    decorative orb otherwise occupies. Stacking it into the flow
                    instead would push the lower half of the card past the
                    780px clip. Programs with no image keep the orb. */}
                {activeProgram.image ? (
                  <div className="program-head-visual">
                    <div className="program-head-media">
                      <motion.div
                        className="program-media-parallax"
                        style={parallaxMediaStyle}
                        initial={prefersReducedMotion ? false : {scale: 0.97}}
                        animate={{scale: 1}}
                        transition={{duration: 0.4, ease: [0.22, 1, 0.36, 1]}}
                      >
                        <img
                          src={cdnImage(activeProgram.image, PROGRAM_IMAGE_WIDTH)}
                          alt={`${activeProgram.title} program`}
                          width={PROGRAM_IMAGE_WIDTH}
                          height={PROGRAM_IMAGE_WIDTH * 0.75}
                          loading="lazy"
                          decoding="async"
                          draggable="false"
                          // A dead URL would leave an empty framed box, so drop the
                          // frame and let the card read as if it had no artwork.
                          onError={(event) => {
                            event.currentTarget.closest(".program-head-visual")?.remove();
                          }}
                        />
                      </motion.div>
                    </div>
                    {activeProgram.skills?.length > 0 && (
                      <motion.div
                        className="program-media-chips"
                        style={parallaxChipsStyle}
                        aria-hidden="true"
                      >
                        {activeProgram.skills.slice(0, 4).map((skill, index) => (
                          <span key={skill} className={`media-chip media-chip--${index + 1}`}>
                            <SkillMark name={skill} />
                            {skill}
                          </span>
                        ))}
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <div className="program-status-orb" aria-hidden="true">
                    <span />
                  </div>
                )}
              </div>

              <div className="program-meta-strip">
                {metaItems.map((item) => (
                  <div className="program-meta-item" key={item.label}>
                    <MetaStripIcon name={item.icon} />
                    <span>
                      <strong>{item.value}</strong>
                      <small>{item.label}</small>
                    </span>
                  </div>
                ))}
              </div>

              <div className="program-tabs" role="tablist" aria-label="Program details">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    aria-selected={activeTab === tab}
                    className={`tab-pill ${activeTab === tab ? "is-active" : ""}`}
                    onClick={() => setActiveTab(tab)}
                    role="tab"
                    type="button"
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Its own AnimatePresence, keyed on the tab: switching tabs swaps
                  only this list. Keying the whole card on the tab remounted the
                  title, artwork and meta grid on every tab click. */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeProgram?.id}-${activeTab}`}
                  variants={contentVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{duration: 0.2, ease: "easeOut"}}
                  className="program-tab-pane"
                >
                  {activeTab === "Jobs" ? (
                    <ul className="program-jobs-list">
                      {matchedJobs.map((job) => (
                        <li className="program-job" key={job.id}>
                          <div className="program-job__head">
                            <span className="program-job__title">{job.title}</span>
                            <a
                              href={job.applyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="program-job__apply"
                            >
                              Apply ↗
                            </a>
                          </div>
                          <span className="program-job__meta">
                            {[job.company, job.location, job.salary].filter(Boolean).join(" · ")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : activeTab === "Fees" ? (
                    <div className="program-fees-tab">
                      <p className="program-fees-tab__label">{programFee?.label || "Program Investment"}</p>
                      <p className="program-fees-tab__amount">₹ {feeAmount}</p>
                      {programFee?.note && <p className="program-fees-tab__note">{programFee.note}</p>}
                      {feeTabRows.length > 0 && (
                        <dl className="program-fees-tab__rows">
                          {feeTabRows.map((row) => (
                            <div key={row.label}>
                              <dt>{row.label}</dt>
                              <dd>{row.value}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      <Link to={`/programs/${activeProgram.id}#pd-fees`} className="program-fees-tab__link">
                        Full fee breakdown on the program page →
                      </Link>
                    </div>
                  ) : activeTab === "FAQs" ? (
                    <ul className="program-faq-mini">
                      {faqs.slice(0, 4).map(([question, answer]) => (
                        <li key={question}>
                          <details>
                            <summary>{question}</summary>
                            <p>{answer}</p>
                          </details>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="program-detail-list">
                      {tabContent.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="program-tool-row">
                {activeProgram.skills.map((skill) => (
                  <span key={skill} className="skill-chip">
                    <SkillMark name={skill} />
                    {skill}
                  </span>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="program-action-row">
          {/* No price, no price block. Product Management has no fee set yet, and
              a bare "Starting from" over an empty line reads as a broken card
              rather than an honest "not priced yet". */}
          {activeProgram.startingPrice && (
            <div className="program-pricing">
              <small>Starting from</small>
              <strong>{activeProgram.startingPrice}</strong>
            </div>
          )}
          <div className="program-cta-group">
            {/* The card is a summary; the full syllabus, fees, batch dates and
                outcomes live on the program's own page. Note this follows the
                *displayed* program, so hovering a program in the sidebar and
                clicking through takes you to the one you were looking at. */}
            <Link to={`/programs/${activeProgram.id}`} className="cta-primary">
              Explore Program
            </Link>
            <Link to="/#consultation" className="cta-secondary">Download Syllabus</Link>
          </div>
        </div>
      </article>

      <aside className="program-highlights" aria-label="Program highlights">
        <div className="program-highlights-head">
          <p className="program-highlights-eyebrow">Program Highlights</p>
        </div>

        <ul className="program-highlight-list">
          {[
            activeProgram.duration && {label: "Duration", value: activeProgram.duration},
            activeProgram.mentorship && {
              label: "Mentorship",
              value: Array.isArray(activeProgram.mentorship)
                ? activeProgram.mentorship.join(", ")
                : activeProgram.mentorship,
            },
            activeProgram.format && {label: "Format", value: activeProgram.format},
            placementBadge && {label: "Placement Support", value: placementBadge},
          ].filter(Boolean).map((row) => (
            <li key={row.label} className="program-highlight-row">
              <small className="hl-label">{row.label}</small>
              <strong className="hl-value">{row.value}</strong>
            </li>
          ))}
        </ul>

        {programFee && feeAmount && (
          <div className="program-highlight-fee">
            <small>{programFee.label || "Program Investment"}</small>
            <strong>&#8377; {feeAmount}</strong>
            {programFee.note && <span>{programFee.note}</span>}
          </div>
        )}

        {activeProgram.emi && (
          <div className="program-highlight-emi">
            <span className="emi-badge">EMI Available</span>
            <p>{activeProgram.emi}</p>
          </div>
        )}

        <div className="program-highlights-cta">
          <Link to={`/programs/${activeProgram.id}`} className="cta-primary">
            Explore Program &rarr;
          </Link>
          <Link to="/#consultation" className="cta-secondary">Download Syllabus</Link>
        </div>
      </aside>
    </div>
  );
};

export default ProgramExplorer;