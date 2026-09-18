import {Link} from "react-router-dom";
import {Reveal} from "../motionPrimitives";
import {cdnImage, cdnSrcSet} from "../../lib/imageCdn";
import {titleParts} from "./programAssist";
import SkillMark from "../SkillMark";

// Small inline stroke icons — 16-18px, one consistent family, no icon library.
const iconPaths = {
  calendar: (
    <path d="M8 2v4M16 2v4M3 9h18M5 4h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
  ),
  monitor: (
    <path d="M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6ZM8 20h8M12 15v5" />
  ),
  user: (
    <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c0-4 3.6-7 8-7s8 3 8 7" />
  ),
  users: (
    <path d="M16 21v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-1a4 4 0 0 0-3-3.9M15.5 3.2a4 4 0 0 1 0 7.6" />
  ),
};

const MetaIcon = ({name}) => (
  <svg
    className="pd-meta__icon"
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
    {iconPaths[name]}
  </svg>
);

const ProgramHero = ({program, applyHref}) => {
  const category = program.category;
  const status = program.seats
    ? "Admissions Open · Limited Seats"
    : program.nextBatch
      ? `Next batch · ${program.nextBatch}`
      : null;

  // Reference headline is two-tone: the shared prefix stays navy and the
  // program name carries the brand accent.
  const {prefix, keyword} = titleParts(program.fullTitle || program.title);

  const meta = [
    program.duration && {label: "Duration", value: program.duration, icon: "calendar"},
    program.mentorship && {
      label: "Mentorship",
      value: Array.isArray(program.mentorship) ? program.mentorship.join(", ") : program.mentorship,
      icon: "user",
    },
    program.format && {label: "Format", value: program.format, icon: "monitor"},
    program.learners && {label: "Learners", value: program.learners, icon: "users"},
  ].filter(Boolean);

  return (
    <section className="pd-hero">
      <div className="pd-inner">
        <Reveal as="nav" className="pd-crumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span className="pd-crumbs__sep" aria-hidden="true">/</span>
          <Link to="/programs">Programs</Link>
          <span className="pd-crumbs__sep" aria-hidden="true">/</span>
          <span className="pd-crumbs__now">{program.title}</span>
          <Link className="pd-crumbs__back" to="/programs">← All programs</Link>
        </Reveal>

        <div className="pd-hero__grid">
          <Reveal className="pd-hero__copy">
            <p className="pd-eyebrow">CareerVeda Program Studio</p>

            {(category || status || program.badges?.length > 0) && (
              <div className="pd-badges">
                {category && <span className="pd-badge pd-badge--category">{category}</span>}
                {status && <span className="pd-badge pd-badge--status">{status}</span>}
                {program.badges?.map((badge) => (
                  <span className="pd-badge" key={badge}>{badge}</span>
                ))}
              </div>
            )}

            <h1>
              {prefix}
              <span className="pd-accent">{keyword}</span>
            </h1>
            {program.subtitle && <p className="pd-subtitle">{program.subtitle}</p>}
            <p className="pd-lead">{program.lead || program.description}</p>

            {program.skills?.length > 0 && (
              <ul className="pd-tags">
                {program.skills.map((skill) => (
                  <li key={skill}>
                    <SkillMark name={skill} />
                    {skill}
                  </li>
                ))}
              </ul>
            )}

            <div className="pd-hero__actions">
              <Link className="pd-btn pd-btn--primary" to={applyHref}>
                Reserve your seat
              </Link>
              <Link className="pd-btn pd-btn--ghost" to="/#consultation">
                Download Brochure
              </Link>
            </div>
          </Reveal>

          <Reveal className="pd-hero__visual" amount={0.1}>
            {program.image ? (
              <div className="pd-visual-frame">
                <img
                  src={cdnImage(program.image, 880)}
                  srcSet={cdnSrcSet(program.image, 880)}
                  sizes="(max-width: 767px) 92vw, (max-width: 1199px) 60vw, 560px"
                  width={880}
                  height={550}
                  alt=""
                  loading="eager"
                  decoding="async"
                  draggable="false"
                  onError={(event) => {
                    event.currentTarget.closest(".pd-visual-frame")?.remove();
                  }}
                />
                {program.skills?.length > 0 && (
                  <div className="pd-visual-chips" aria-hidden="true">
                    {program.skills.slice(0, 3).map((skill, index) => (
                      <span className={`pd-visual-chip pd-visual-chip--${index + 1}`} key={skill}>
                        <SkillMark name={skill} />
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="pd-visual-frame pd-visual-frame--empty" aria-hidden="true">
                <span>{program.category || "CareerVeda"}</span>
              </div>
            )}
          </Reveal>
        </div>

        {meta.length > 0 && (
          <Reveal className="pd-meta" amount={0.1}>
            {meta.map((item) => (
              <div className="pd-meta__item" key={item.label}>
                <MetaIcon name={item.icon} />
                <span>
                  <strong>{item.value}</strong>
                  <small>{item.label}</small>
                </span>
              </div>
            ))}
          </Reveal>
        )}
      </div>
    </section>
  );
};

export default ProgramHero;