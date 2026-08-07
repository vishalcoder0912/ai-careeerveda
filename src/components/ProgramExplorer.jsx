import {useState,useCallback,useMemo,useRef,useEffect} from "react";
import {Link} from "react-router-dom";
import {AnimatePresence,motion} from "framer-motion";
import {programCatalog} from "../data/programCatalog";
import {useContentList} from "../hooks/useContent";
import {adaptProgram} from "../lib/contentAdapters";
import {cdnImage} from "../lib/imageCdn";
import "./program-explorer.css";

const TAB_OPTIONS = ["Overview", "Curriculum", "Outcomes"];

// The artwork sits in a 4:3 frame in the card's right-hand column, ~420px wide at
// most. The originals are full-size PNGs (investment-banking alone is 122 KB).
const PROGRAM_IMAGE_WIDTH = 840;

const contentVariants = {
  enter:{opacity:0,y:12},
  center:{opacity:1,y:0},
  exit:{opacity:0,y:-8},
};

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
              transition={{duration:0.25,ease:"easeOut"}}
              className="program-card-content"
            >
              <div className="program-detail-head">
                <div className="program-head-text">
                  <p className="section-label">CareerVeda Program Studio</p>
                  <h3>{activeProgram.title}</h3>
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
                  <div className="program-head-media">
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
                        event.currentTarget.parentElement?.remove();
                      }}
                    />
                  </div>
                ) : (
                  <div className="program-status-orb" aria-hidden="true">
                    <span />
                  </div>
                )}
              </div>

              <div className="program-meta-grid">
                {[
                  {label:"Duration",value:activeProgram.duration},
                  {label:"Mentorship",value:Array.isArray(activeProgram.mentorship) ? activeProgram.mentorship.join(", ") : activeProgram.mentorship},
                  {label:"Format",value:activeProgram.format},
                ].map((item) => (
                  <div key={item.label} className="meta-card">
                    <span className="meta-value">{item.value}</span>
                    <small className="meta-label">{item.label}</small>
                  </div>
                ))}
              </div>

              <div className="program-tabs" role="tablist" aria-label="Program details">
                {TAB_OPTIONS.map((tab) => (
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
                <motion.ul
                  key={activeTab}
                  variants={contentVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{duration:0.2,ease:"easeOut"}}
                  className="program-detail-list"
                >
                  {tabContent.map((point,idx) => (
                    <li key={idx}>{point}</li>
                  ))}
                </motion.ul>
              </AnimatePresence>

              <div className="program-tool-row">
                {activeProgram.skills.map((skill) => (
                  <span key={skill} className="skill-chip">{skill}</span>
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
    </div>
  );
};

export default ProgramExplorer;