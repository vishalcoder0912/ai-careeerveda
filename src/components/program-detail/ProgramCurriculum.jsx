import {useState} from "react";
import {Link} from "react-router-dom";
import {Reveal, StaggerGroup, StaggerItem} from "../motionPrimitives";

/* The curriculum as a data-driven card grid.
 *
 * The program record carries `modules` (number, title, points, optional
 * deliverable). Older records fold the deliverable into a trailing
 * "Portfolio deliverable: …" bullet instead, so the footer extracts that too —
 * the two shapes render identically. Accent identity per module comes from a
 * small lookup (icon + colour), applied as a CSS custom property so the whole
 * card stays white while only the number, icon, deliverable area and arrow
 * pick up the module's hue.
 *
 * Animation reuses the project's IntersectionObserver primitives (Reveal /
 * StaggerGroup / StaggerItem) — no new dependencies, no effect churn. */

const ACCENTS = {
  blue: "#2563eb",
  green: "#16a34a",
  violet: "#7c3aed",
  orange: "#ea7308",
  pink: "#ec4899",
  cyan: "#0891b2",
  purple: "#9333ea",
  red: "#e11d48",
  teal: "#0d9488",
  indigo: "#4f46e5",
};

const MODULE_ART = {
  1: {icon: "book", accent: "blue"},
  2: {icon: "users", accent: "green"},
  3: {icon: "chart", accent: "violet"},
  4: {icon: "userSearch", accent: "orange"},
  5: {icon: "target", accent: "pink"},
  6: {icon: "clipboard", accent: "cyan"},
  7: {icon: "penTool", accent: "purple"},
  8: {icon: "refresh", accent: "blue"},
  9: {icon: "lineChart", accent: "green"},
  10: {icon: "cpu", accent: "violet"},
  11: {icon: "trending", accent: "red"},
  12: {icon: "userCheck", accent: "teal"},
  13: {icon: "grad", accent: "indigo"},
  14: {icon: "flag", accent: "orange"},
  15: {icon: "layers", accent: "cyan"},
  16: {icon: "doc", accent: "indigo"},
};

// Lucide-shaped strokes, drawn inline so the section adds no icon dependency.
const ICON_PATHS = {
  book: (
    <>
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </>
  ),
  userSearch: (
    <>
      <path d="M2 21a8 8 0 0 1 13.29-6" />
      <circle cx="10" cy="8" r="5" />
      <path d="m19 19 3 3" />
      <circle cx="17" cy="17" r="3" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  clipboard: (
    <>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </>
  ),
  penTool: (
    <>
      <path d="M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z" />
      <path d="m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.889a1 1 0 0 0 .776.746L13 18" />
      <path d="m2.3 2.3 7.286 7.286" />
      <circle cx="11" cy="11" r="2" />
    </>
  ),
  refresh: (
    <>
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </>
  ),
  lineChart: (
    <>
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </>
  ),
  cpu: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M15 2v2" />
      <path d="M15 20v2" />
      <path d="M2 15h2" />
      <path d="M2 9h2" />
      <path d="M20 15h2" />
      <path d="M20 9h2" />
      <path d="M9 2v2" />
      <path d="M9 20v2" />
    </>
  ),
  trending: (
    <>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </>
  ),
  userCheck: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </>
  ),
  grad: (
    <>
      <path d="M22 10v6" />
      <path d="M2 10 12 5l10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </>
  ),
  doc: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </>
  ),
  layers: (
    <>
      <path d="M12 2 2 7l10 5 10-5z" />
      <path d="m2 17 10 5 10-5" />
      <path d="m2 12 10 5 10-5" />
    </>
  ),
  flag: (
    <>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" x2="4" y1="22" y2="15" />
    </>
  ),
};

const Icon = ({kind, size = 20, strokeWidth = 1.8, className}) => (
  <svg
    width={size}
    height={size}
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {ICON_PATHS[kind]}
  </svg>
);

const ArrowIcon = ({size = 15}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

const DELIVERABLE_PATTERN = /^(?:Portfolio|Final) deliverable:\s*/i;

const modulePoints = (module) => {
  const folded = (module.points || []).findIndex((point) => DELIVERABLE_PATTERN.test(point));
  return folded >= 0 ? module.points.filter((_, index) => index !== folded) : module.points || [];
};

const moduleDeliverable = (module) => {
  if (module.deliverable) return module.deliverable;
  const folded = (module.points || []).find((point) => DELIVERABLE_PATTERN.test(point));
  return folded ? folded.replace(DELIVERABLE_PATTERN, "") : null;
};

const RoadmapGraphic = ({from = "From Product Thinker", to = "to Product Leader"}) => (
  <Reveal className="pd-curriculum__map" amount={0.1} aria-hidden="true">
    <svg viewBox="0 0 380 300" role="presentation">
      <defs>
        <linearGradient id="pd-road-grad" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#60a5fa" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <circle cx="330" cy="58" r="92" fill="#a78bfa" opacity="0.07" />
      <circle cx="56" cy="252" r="112" fill="#60a5fa" opacity="0.07" />
      <path
        className="pd-road-path"
        d="M 40 250 C 170 260, 260 120, 318 66"
        stroke="url(#pd-road-grad)"
      />
      <g className="pd-milestone" style={{"--m-delay": "0s"}}>
        <circle cx="147" cy="225" r="11" fill="#60a5fa" opacity="0.18" />
        <circle cx="147" cy="225" r="4" fill="#3b82f6" />
        <text x="147" y="250">Learn</text>
      </g>
      <g className="pd-milestone" style={{"--m-delay": "0.22s"}}>
        <circle cx="208" cy="181" r="11" fill="#818cf8" opacity="0.18" />
        <circle cx="208" cy="181" r="4" fill="#6366f1" />
        <text x="208" y="206">Build</text>
      </g>
      <g className="pd-milestone" style={{"--m-delay": "0.44s"}}>
        <circle cx="262" cy="132" r="11" fill="#a78bfa" opacity="0.18" />
        <circle cx="262" cy="132" r="4" fill="#a855f7" />
        <text x="262" y="157">Grow</text>
      </g>
      <g className="pd-road-target">
        <g transform="translate(318 66)">
          <circle r="13" stroke="#a78bfa" strokeWidth="1" fill="none" opacity="0.7" />
          <circle r="7" stroke="#4f46e5" strokeWidth="2" fill="rgba(79,70,229,0.08)" />
          <circle r="2.5" fill="#4f46e5" />
        </g>
      </g>
      <text className="pd-road-caption pd-road-caption--from" x="40" y="289">
        {from}
      </text>
      <text className="pd-road-caption pd-road-caption--to" x="330" y="30" textAnchor="end">
        {to}
      </text>
    </svg>
  </Reveal>
);

const CtaArt = () => (
  <svg className="pd-cta-card__art" viewBox="0 0 120 96" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="pd-cta-art-grad" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stopColor="#2563eb" />
        <stop offset="1" stopColor="#7c3aed" />
      </linearGradient>
    </defs>
    <circle cx="98" cy="22" r="30" fill="#a78bfa" opacity="0.12" />
    <circle cx="20" cy="80" r="26" fill="#60a5fa" opacity="0.1" />
    <path
      d="M6 78 C 30 74 36 58 54 56 C 72 54 78 40 96 30"
      stroke="url(#pd-cta-art-grad)"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeDasharray="4 6"
    />
    <circle cx="6" cy="78" r="3.5" fill="#60a5fa" />
    <circle cx="96" cy="30" r="9" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="2 3" />
    <circle cx="96" cy="30" r="4" fill="#7c3aed" />
  </svg>
);

const ModulePhoto = ({src}) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;

  return (
    <div className="pd-modcard__media">
      <img
        src={src}
        alt=""
        width={800}
        height={533}
        loading="lazy"
        decoding="async"
        draggable="false"
        onError={() => setFailed(true)}
      />
    </div>
  );
};

const CurriculumCard = ({module}) => {
  const art = MODULE_ART[module.n] || MODULE_ART[1];
  const accent = ACCENTS[art.accent];
  const points = modulePoints(module);
  const deliverable = moduleDeliverable(module);

  return (
    <StaggerItem as="article" interactive className="pd-modcard" style={{"--mod-accent": accent}}>
      <ModulePhoto src={module.image} />
      <header className="pd-modcard__head">
        <span className="pd-modcard__num">{String(module.n).padStart(2, "0")}</span>
        <span className="pd-modcard__icon">
          <Icon kind={art.icon} size={19} />
        </span>
      </header>
      <h3 className="pd-modcard__title">{module.title}</h3>
      <ul className="pd-modcard__topics">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <footer className="pd-modcard__deliverable">
        <Icon kind="doc" className="pd-modcard__deliverable-icon" size={16} strokeWidth={1.7} />
        <span className="pd-modcard__deliverable-text">
          <span className="pd-modcard__deliverable-label">Module Deliverable</span>
          <span className="pd-modcard__deliverable-value">{deliverable}</span>
        </span>
        <span className="pd-modcard__arrow" aria-hidden="true">
          <ArrowIcon />
        </span>
      </footer>
    </StaggerItem>
  );
};

const CurriculumCta = ({href, moduleCount}) => (
  <StaggerItem as={Link} interactive className="pd-cta-card" to={href}>
    <span className="pd-cta-card__kicker">Build. Learn.</span>
    <span className="pd-cta-card__title">Get Hired.</span>
    <span className="pd-cta-card__meta">
      {moduleCount} modules · Real projects · Career support
    </span>
    <span className="pd-cta-card__arrow" aria-hidden="true">
      <ArrowIcon size={16} />
    </span>
    <CtaArt />
  </StaggerItem>
);

const ProgramCurriculum = ({program, applyHref}) => {
  const modules = program.modules || [];
  const moduleCount = modules.length;

  return (
    <section className="pd-section pd-curriculum" id="pd-curriculum">
      <div className="pd-inner">
        <div className="pd-curriculum__header">
          <Reveal className="pd-curriculum__intro">
            <p className="pd-curriculum__eyebrow">Curriculum</p>
            <h2>{program.fullTitle || program.title} curriculum</h2>
            <p className="pd-curriculum__desc">
              {program.curriculumIntro || program.description}
            </p>
            <p className="pd-curriculum__meta">
              <Icon kind="layers" size={15} />
              <span>{moduleCount} Modules</span>
              <span className="pd-curriculum__meta-dot" aria-hidden="true">
                ·
              </span>
              <Icon kind="flag" size={15} />
              <span>Learning Roadmap</span>
            </p>
          </Reveal>

          <RoadmapGraphic from={program.roadFrom} to={program.roadTo} />
        </div>

        {moduleCount > 0 ? (
          <StaggerGroup className="pd-curriculum__grid" amount={0.05} stagger={0.045}>
            {modules.map((module) => (
              <CurriculumCard key={module.n} module={module} />
            ))}
            <CurriculumCta href={applyHref} moduleCount={moduleCount} />
          </StaggerGroup>
        ) : (
          <div className="pd-outline">
            {[
              ["Overview", program.overview],
              ["Curriculum", program.curriculum],
              ["Outcomes", program.outcomes],
            ].map(([label, points]) => (
              <article className="pd-outline__card" key={label}>
                <h3>{label}</h3>
                <ul>
                  {points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ProgramCurriculum;