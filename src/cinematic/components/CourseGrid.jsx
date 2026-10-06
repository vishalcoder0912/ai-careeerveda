import {Link} from "react-router-dom";
import {ArrowRight} from "lucide-react";
import {programCatalog} from "../../data/programCatalog";
import {SectionLabel} from "./Atmosphere";

const feeLabel = (program) => {
  if (typeof program.startingPrice === "string") {
    // Most catalogue prices already carry the \u20B9; strip it so it is never doubled.
    return `From \u20B9${program.startingPrice.trim().replace(/^\u20B9\s*/, "")}`;
  }
  if (program.fee && program.fee.amount) {
    return `\u20B9${program.fee.amount}`;
  }
  return "Program investment";
};

const metaText = (program) =>
  [program.category, program.duration, program.format]
    .filter(Boolean)
    .join(" \u00B7 ");

const CourseCard = ({program, index}) => {
  const route = program.landingPath || `/programs/${program.id}`;

  return (
    <div
      className="ga-journey-cell ga-reveal ga-reveal-up"
      style={{transitionDelay: `${index * 60}ms`}}
    >
      <Link
        className="ga-journey-card"
        to={route}
        aria-label={`Open ${program.title}`}
      >
        <span className="ga-journey-top">
          <span className="ga-journey-num" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="ga-journey-arrow" aria-hidden="true">
            <ArrowRight size={17} />
          </span>
        </span>

        <span className="ga-journey-card-body">
          <span className="ga-journey-title">{program.title}</span>
          <span className="ga-journey-range">{metaText(program)}</span>
          <span className="ga-journey-desc">{program.subtitle || program.description}</span>
        </span>

        <span className="ga-journey-foot">
          <span className="ga-journey-motif">{feeLabel(program)}</span>
          <span className="ga-journey-unlock-pill">Explore route &#8594;</span>
        </span>
      </Link>
    </div>
  );
};

export const CourseGrid = () => (
  <section className="ga-modules" id="ga-courses">
    <div className="ga-modules-head">
      <SectionLabel>Course Catalogue</SectionLabel>
      <h2 className="ga-display">
        All Eleven Programs.
        <br />
        <em>One Route Each.</em>
      </h2>
      <p className="ga-sub">
        Eleven career tracks from the catalogue — open any card to walk that program&rsquo;s own route.
      </p>
    </div>

    <div className="ga-journey">
      <div className="ga-journey-grid">
        {programCatalog.map((program, i) => (
          <CourseCard key={program.id} program={program} index={i} />
        ))}
      </div>
    </div>
  </section>
);

export default CourseGrid;
