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
import {skillPhoto} from "./skillPhotos";
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

// Everything the card and the highlights panel say about a program, read off
// the record's own fields; nothing here is invented. Placement support comes
// from the badges the catalog already carries, so a program without it simply
// omits the row.
const programFacts = (program) => {
  const placementBadge = Array.isArray(program.badges)
    ? program.badges.find((b) => b.includes("Placement"))
    : null;
  const fee = program.fee || (program.startingPrice
    ? {label: "Program Investment", amount: program.startingPrice}
    : null);
  const feeAmount = fee ? String(fee.amount).replace(/^₹/, "") : null;
  const mentorship = Array.isArray(program.mentorship)
    ? program.mentorship.join(", ")
    : program.mentorship;

  return {
    fee,
    feeAmount,
    metaItems: [
      program.duration && {icon: "calendar", label: "Duration", value: program.duration},
      mentorship && {icon: "user", label: "Mentorship", value: mentorship},
      program.format && {icon: "monitor", label: "Format", value: program.format},
      program.learners && {icon: "users", label: "Learners", value: program.learners},
    ].filter(Boolean),
    feeTabRows: [
      program.emi && {label: "EMI available", value: program.emi},
      program.nextBatch && {label: "Next batch", value: program.nextBatch},
      program.seats && {label: "Seats", value: program.seats},
    ].filter(Boolean),
    highlightRows: [
      program.duration && {label: "Duration", value: program.duration},
      mentorship && {label: "Mentorship", value: mentorship},
      program.format && {label: "Format", value: program.format},
      placementBadge && {label: "Placement Support", value: placementBadge},
    ].filter(Boolean),
    // A program can declare a cinematic landing of its own via `landingPath`.
    // The explorer's primary CTA follows it there; the fee tab stays on the full
    // detail page, which is the only page that carries the price breakdown it
    // links to. No programme declares one today, so the CTA uses /programs/:slug.
    explorePath:
      program.landingPath ||
      programCatalog.find((entry) => entry.id === program.id)?.landingPath ||
      `/programs/${program.id}`,
  };
};

const TrackButton = ({program, index, isActive, isPreviewed, onSelect, onPreview, onPreviewEnd}) => {
  // The shared "PG Program in" prefix gets its own span so the phone grid can
  // drop it and fit every track name on screen.
  const trackTitle = titleParts(program.title);
  return (
    <button
      data-program-id={program.id}
      aria-selected={isActive}
      className={`program-track-item ${isActive ? "is-active" : ""} ${isPreviewed ? "is-previewed" : ""}`}
      onClick={() => onSelect(program.id)}
      onMouseEnter={() => onPreview(program.id)}
      onMouseLeave={onPreviewEnd}
      onFocus={() => onPreview(program.id)}
      onBlur={onPreviewEnd}
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
        <strong>
          {trackTitle.prefix && <span className="track-prefix">{trackTitle.prefix}</span>}
          {trackTitle.keyword}
        </strong>
        <small>{program.category}</small>
      </div>
    </button>
  );
};

// The artwork takes the head's right-hand column, which the decorative orb
// otherwise occupies. Stacking it into the flow instead would push the lower
// half of the card past the 780px clip. Programs with no image keep the orb.
const ProgramArtwork = ({program, parallaxStyle, reducedMotion}) =>
  program.image ? (
    <div className="program-head-visual">
      <div className="program-head-media">
        <motion.div
          className="program-media-parallax"
          style={parallaxStyle}
          initial={reducedMotion ? false : {scale: 0.97}}
          animate={{scale: 1}}
          transition={{duration: 0.4, ease: [0.22, 1, 0.36, 1]}}
        >
          <img
            src={cdnImage(program.image, PROGRAM_IMAGE_WIDTH)}
            alt={`${program.title} program`}
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
    </div>
  ) : (
    <div className="program-status-orb" aria-hidden="true">
      <span />
    </div>
  );

const JobsTab = ({jobs}) => (
  <ul className="program-jobs-list">
    {jobs.map((job) => (
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
);

const FeesTab = ({programId, fee, feeAmount, rows}) => (
  <div className="program-fees-tab">
    <p className="program-fees-tab__label">{fee?.label || "Program Investment"}</p>
    <p className="program-fees-tab__amount">₹ {feeAmount}</p>
    {fee?.note && <p className="program-fees-tab__note">{fee.note}</p>}
    {rows.length > 0 && (
      <dl className="program-fees-tab__rows">
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    )}
    <Link to={`/programs/${programId}#pd-fees`} className="program-fees-tab__link">
      Full fee breakdown on the program page →
    </Link>
  </div>
);

const FaqTab = () => (
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
);

// Overview, Curriculum and Outcomes are plain point lists on the record.
const TabPane = ({tab, program, jobs, facts}) => {
  if (tab === "Jobs") return <JobsTab jobs={jobs} />;
  if (tab === "Fees") {
    return <FeesTab programId={program.id} fee={facts.fee} feeAmount={facts.feeAmount} rows={facts.feeTabRows} />;
  }
  if (tab === "FAQs") return <FaqTab />;
  return (
    <ul className="program-detail-list">
      {(program[tab.toLowerCase()] || []).map((point, idx) => (
        <li key={idx}>{point}</li>
      ))}
    </ul>
  );
};

const SkillChips = ({skills}) => (
  <div className="program-tool-row">
    {skills.map((skill) => {
      const photo = skillPhoto(skill);
      return (
        <span key={skill} className="skill-chip">
          {photo ? (
            <img
              className="skill-chip-photo"
              src={photo}
              alt=""
              width={26}
              height={26}
              loading="lazy"
              decoding="async"
              draggable="false"
            />
          ) : (
            <SkillMark name={skill} />
          )}
          {skill}
        </span>
      );
    })}
  </div>
);

const ProgramHighlights = ({program, facts}) => (
  <aside className="program-highlights" aria-label="Program highlights">
    <div className="program-highlights-head">
      <p className="program-highlights-eyebrow">Program Highlights</p>
    </div>

    <ul className="program-highlight-list">
      {facts.highlightRows.map((row) => (
        // Duration, mentorship and format already sit in the card's meta
        // strip; on stacked layouts they are hidden here as repeats.
        <li
          key={row.label}
          className={`program-highlight-row${row.label === "Placement Support" ? "" : " is-repeat"}`}
        >
          <small className="hl-label">{row.label}</small>
          <strong className="hl-value">{row.value}</strong>
        </li>
      ))}
    </ul>

    {facts.fee && facts.feeAmount && (
      <div className="program-highlight-fee">
        <small>{facts.fee.label || "Program Investment"}</small>
        <strong>&#8377; {facts.feeAmount}</strong>
        {facts.fee.note && <span>{facts.fee.note}</span>}
      </div>
    )}

    {program.emi && (
      <div className="program-highlight-emi">
        <span className="emi-badge">EMI Available</span>
        <p>{program.emi}</p>
      </div>
    )}

    <div className="program-highlights-cta">
      <Link to={facts.explorePath} className="cta-primary">
        Explore Program &rarr;
      </Link>
      <Link to="/#consultation" className="cta-secondary">Download Syllabus</Link>
    </div>
  </aside>
);

const ProgramExplorer = () => {
  // Published programs from the API, ordered by the panel's displayOrder — the
  // rail numbers itself off that order, so reordering programs in the admin
  // renumbers the badges here. Falls back to the static catalogue.
  const {items: PROGRAMS} = useContentList("programs", {
    fallback: programCatalog,
    adapt: adaptProgram,
  });

  // null until the visitor picks one: the default is whatever leads the list
  // actually rendered. Seeding it from programCatalog[0] opened the card on a
  // program the API list places last.
  const [activeId,setActiveId] = useState(null);
  const [previewId,setPreviewId] = useState(null);
  const [activeTab,setActiveTab] = useState("Overview");
  // Phones only (programs-page-responsive.css): the tab content and skill
  // chips stay folded until a tab is tapped, and tapping the open tab folds
  // them again. Desktop ignores the flag and always shows the pane. A class,
  // not a different initial tab, so prerendered and hydrated markup match.
  const [tabsOpen,setTabsOpen] = useState(false);
  const handleTab = (tab) => {
    if (tabsOpen && tab === activeTab) {
      setTabsOpen(false);
      return;
    }
    setActiveTab(tab);
    setTabsOpen(true);
  };
  const listRef = useRef(null);
  const detailRef = useRef(null);
  const explorerRef = useRef(null);

  const selectedId = PROGRAMS.some((p) => p.id === activeId) ? activeId : PROGRAMS[0]?.id;
  const displayId = previewId || selectedId;
  // The selected program can vanish under us when the API list arrives — the
  // admin may have unpublished it — so the first program is the standing
  // fallback rather than an undefined that would take the card down with it.
  const activeProgram = useMemo(
    () => PROGRAMS.find((p) => p.id === displayId) || PROGRAMS[0],
    [PROGRAMS,displayId],
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
  const parallaxMediaStyle = {y: prefersReducedMotion ? 0 : mediaY};

  // Keyed on activeId, never displayId. Following the hover preview here was a
  // feedback loop: smooth-scrolling the list moved the items under a stationary
  // cursor, which fired mouseenter on a neighbour, which scrolled again — the
  // rail never settled and pegged a core. Hovering an item you are already
  // pointing at does not need scrolling; only a committed selection does.
  useEffect(() => {
    // Nothing chosen yet: scrolling here on mount would yank the page.
    if (!activeId || !listRef.current) return;
    const activeEl = listRef.current.querySelector(`[data-program-id="${activeId}"]`);
    if (activeEl) activeEl.scrollIntoView({behavior:"smooth",block:"nearest"});
  }, [activeId]);

  // On the horizontal (mobile/tablet) rail, scroll-snap stays locked to the
  // chip it first snapped to. When the API list replaces the fallback and that
  // chip moves to the end, the rail follows it there — so put it back at the
  // start until the visitor has chosen something.
  useEffect(() => {
    if (activeId || !listRef.current) return;
    listRef.current.scrollLeft = 0;
  }, [PROGRAMS, activeId]);

  // Only reachable if both the API and the static catalogue are empty, which
  // would mean the site has no programs at all. Better a missing section than a
  // card rendering undefined.
  if (!activeProgram) return null;

  const facts = programFacts(activeProgram);

  // Two-tone headline, matching the programme detail page: the "PG Program in"
  // prefix stays ink and the track name carries the brand accent.
  const {prefix, keyword} = titleParts(activeProgram.fullTitle || activeProgram.title);

  // Real openings for this track, from the live jobs data — never invented.
  const matchedJobs = matchJobs(activeProgram, 3);

  const tabs = [
    "Overview",
    "Curriculum",
    "Outcomes",
    ...(matchedJobs.length > 0 ? ["Jobs"] : []),
    ...(facts.feeAmount ? ["Fees"] : []),
    "FAQs",
  ];

  return (
    <div className="program-explorer" data-cinematic-card="true">
      <aside className="program-sidebar" aria-label="CareerVeda program list">
        <div className="program-sidebar-head">
          <span>01</span>
          <strong>Programs</strong>
          {/* Shown only where the rail scrolls sideways (mobile/tablet). */}
          <small className="program-rail-hint" aria-hidden="true">
            {PROGRAMS.length} tracks &middot; swipe &rarr;
          </small>
        </div>
        <div className="program-track-list" ref={listRef} role="tablist" aria-label="Programs">
          {PROGRAMS.map((program, index) => (
            <TrackButton
              key={program.id}
              program={program}
              index={index}
              isActive={selectedId === program.id}
              isPreviewed={previewId === program.id && selectedId !== program.id}
              onSelect={handleClick}
              onPreview={handleHoverStart}
              onPreviewEnd={handleHoverEnd}
            />
          ))}
        </div>
      </aside>

      <article className={`program-detail-card${tabsOpen ? " tabs-open" : ""}`} ref={detailRef}>
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
                <ProgramArtwork
                  program={activeProgram}
                  parallaxStyle={parallaxMediaStyle}
                  reducedMotion={prefersReducedMotion}
                />
              </div>

              <div className="program-meta-strip">
                {facts.metaItems.map((item) => (
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
                    onClick={() => handleTab(tab)}
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
                  key={`${activeProgram.id}-${activeTab}`}
                  variants={contentVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{duration: 0.2, ease: "easeOut"}}
                  className="program-tab-pane"
                >
                  <TabPane tab={activeTab} program={activeProgram} jobs={matchedJobs} facts={facts} />
                </motion.div>
              </AnimatePresence>

              <SkillChips skills={activeProgram.skills} />
            </motion.div>
          </AnimatePresence>
        </div>

        </article>

      <ProgramHighlights program={activeProgram} facts={facts} />
    </div>
  );
};

export default ProgramExplorer;
