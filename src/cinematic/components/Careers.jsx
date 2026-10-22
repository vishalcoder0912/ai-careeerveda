import {useEffect, useRef, useState} from "react";
import {AnimatePresence, motion, useReducedMotion} from "framer-motion";
import {reducedMotionNow} from "../fx/registry";
import {Lines, useCinematic} from "../content";
import {SectionLabel} from "./Atmosphere";

const AUTOPLAY_MS = 3600;
const NODE_R = 42;
const SALARY_EASE = [0.22, 1, 0.36, 1];

/* Polar position of a role node around the orbit, top-first, as percentages
   of the orbit container (and matching viewBox units for the SVG lines). */
const nodePoint = (i, count) => {
  const rad = ((i * (360 / count) - 90) * Math.PI) / 180;
  return {
    x: (50 + NODE_R * Math.cos(rad)).toFixed(3),
    y: (50 + NODE_R * Math.sin(rad)).toFixed(3),
  };
};

const RoleNode = ({role, index, count, active, onActivate}) => {
  const p = nodePoint(index, count);
  return (
    <button
      type="button"
      className={`ga-orbit-node${active ? " ga-orbit-node--active" : ""}`}
      style={{left: `${p.x}%`, top: `${p.y}%`}}
      onClick={() => onActivate(index)}
      aria-label={role.role}
      aria-pressed={active}
    >
      <span className="ga-orbit-node__dot" aria-hidden="true" />
      <span className="ga-orbit-node__label">{role.role}</span>
    </button>
  );
};

/* ── React-side motion (framer-motion) ────────────────────────────────────── */
const panelVariants = {
  hidden: {opacity: 0, y: 14},
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.38,
      ease: SALARY_EASE,
      staggerChildren: 0.05,
      delayChildren: 0.04,
    },
  },
  exit: {opacity: 0, y: -10, transition: {duration: 0.2, ease: "easeIn"}},
};

const chipVariants = {
  hidden: {opacity: 0, y: 8},
  show: {opacity: 1, y: 0, transition: {duration: 0.3, ease: SALARY_EASE}},
  exit: {opacity: 0, transition: {duration: 0.12}},
};

const coreVariants = {
  hidden: {opacity: 0, y: 8},
  show: {opacity: 1, y: 0, transition: {duration: 0.4, ease: SALARY_EASE}},
  exit: {opacity: 0, y: -6, transition: {duration: 0.15, ease: "easeIn"}},
};

const SalaryBlock = ({role}) =>
  role.salaryVaried ? (
    <>
      <strong className="ga-salary">{role.salaryMappedRange}</strong>
      <span className="ga-salary-note">Closest range · {role.salaryMappedTo}</span>
    </>
  ) : (
    <>
      <strong className="ga-salary">{role.salary}</strong>
      <span className="ga-salary-note">
        {role.location} · {role.year} · {role.years || "3–6 yrs"}
      </span>
    </>
  );

export const CareerOutcomes = () => {
  const {careers} = useCinematic();
  const careerRoles = careers.roles;
  const [active, setActive] = useState(0);
  const hovering = useRef(false);
  const reduced = useReducedMotion();
  const reducedScroll = typeof window !== "undefined" && reducedMotionNow();
  const count = careerRoles.length;
  const current = careerRoles[active];

  useEffect(() => {
    if (reducedScroll || count <= 1) return undefined;
    const timer = setInterval(() => {
      if (hovering.current) return;
      setActive((i) => (i + 1) % count);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [count, reducedScroll]);

  const renderChips = (dim) => {
    const Chip = dim ? "li" : motion.li;
    return (
      <ul className="ga-skill-chips">
        {current.skills.map((s) => (
          <Chip key={s} {...(dim ? {} : {variants: chipVariants})}>
            {s}
          </Chip>
        ))}
      </ul>
    );
  };

  const panelBody = reduced ? (
    <div key={active} className="ga-careers-panel__card">
      <span className="ga-careers-panel__count" aria-hidden="true">
        {String(active + 1).padStart(2, "0")} <i>/</i> {String(count).padStart(2, "0")}
      </span>
      <div className="ga-careers-panel__role">
        <h3>{current.role}</h3>
        <p>{current.domain}</p>
      </div>
      <p className="ga-careers-panel__desc">{current.description}</p>
      <div className="ga-careers-panel__divider" aria-hidden="true" />
      <div className="ga-careers-panel__salary">
        <SalaryBlock role={current} />
        <span className="ga-salary-source">Source: {current.source}</span>
      </div>
      <div className="ga-careers-panel__divider" aria-hidden="true" />
      <div className="ga-careers-panel__skills">
        <span className="ga-skill-label">Skills</span>
        {renderChips(true)}
      </div>
    </div>
  ) : (
    <motion.div
      key={active}
      className="ga-careers-panel__card"
      variants={panelVariants}
      initial="hidden"
      animate="show"
      exit="exit"
    >
      <span className="ga-careers-panel__count" aria-hidden="true">
        {String(active + 1).padStart(2, "0")} <i>/</i> {String(count).padStart(2, "0")}
      </span>
      <div className="ga-careers-panel__role">
        <h3>{current.role}</h3>
        <p>{current.domain}</p>
      </div>
      <p className="ga-careers-panel__desc">{current.description}</p>
      <div className="ga-careers-panel__divider" aria-hidden="true" />
      <div className="ga-careers-panel__salary">
        <SalaryBlock role={current} />
        <span className="ga-salary-source">Source: {current.source}</span>
      </div>
      <div className="ga-careers-panel__divider" aria-hidden="true" />
      <div className="ga-careers-panel__skills">
        <span className="ga-skill-label">Skills</span>
        {renderChips(false)}
      </div>
    </motion.div>
  );

  const coreRole = reduced ? (
    <h3 key={active} className="ga-orbit-core__role">
      {current.role}
    </h3>
  ) : (
    <motion.h3
      key={active}
      className="ga-orbit-core__role"
      variants={coreVariants}
      initial="hidden"
      animate="show"
      exit="exit"
    >
      {current.role}
    </motion.h3>
  );

  return (
    <section
      className="ga-careers"
      id="ga-career"
      onMouseEnter={() => {
        hovering.current = true;
      }}
      onMouseLeave={() => {
        hovering.current = false;
      }}
    >
      <div className="ga-careers-orbit-col ga-reveal ga-reveal-rise">
        <div
          className="ga-orbit"
          style={{"--active": active}}
          role="img"
          aria-label="Career orbit — each node is a role this track can lead to"
        >
          <svg
            className="ga-orbit-lines"
            viewBox="0 0 100 100"
            aria-hidden="true"
            focusable="false"
          >
            {careerRoles.map((c, i) => {
              const p = nodePoint(i, careerRoles.length);
              const isActive = i === active;
              return (
                <line
                  key={c.role}
                  className={`ga-orbit-line${isActive ? " ga-orbit-line--active" : ""}`}
                  x1="50"
                  y1="50"
                  x2={p.x}
                  y2={p.y}
                />
              );
            })}
          </svg>

          <span className="ga-orbit-ring ga-orbit-ring--outer" aria-hidden="true" />
          <span className="ga-orbit-ring ga-orbit-ring--mid" aria-hidden="true" />
          <span className="ga-orbit-ring ga-orbit-ring--inner" aria-hidden="true" />
          <span className="ga-orbit-ring ga-orbit-ring--ticks" aria-hidden="true" />

          {careerRoles.map((c, i) => (
            <RoleNode key={c.role} role={c} index={i} count={careerRoles.length} active={i === active} onActivate={setActive} />
          ))}

          <div className="ga-orbit-core">
            <span className="ga-orbit-core__label">Live role for this track</span>
            <AnimatePresence mode="wait" initial={false}>
              {coreRole}
            </AnimatePresence>
            <span className="ga-orbit-core__domain">{current.domain}</span>
          </div>
        </div>
      </div>

      <header className="ga-careers-head ga-reveal ga-reveal-up">
        <SectionLabel index="09">{careers.label}</SectionLabel>
        <h2 className="ga-display">
          <Lines lines={careers.title} />
        </h2>
        <p className="ga-careers-lead">{careers.lead}</p>
      </header>

      <div className="ga-careers-panel ga-reveal ga-reveal-up">
        <AnimatePresence mode="wait" initial={false}>
          {panelBody}
        </AnimatePresence>

        <a className="ga-careers-cta" href="/jobs">
          Explore role <span aria-hidden="true">&rarr;</span>
        </a>
      </div>
    </section>
  );
};

export default CareerOutcomes;