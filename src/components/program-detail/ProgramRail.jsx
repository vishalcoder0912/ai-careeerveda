import {Link} from "react-router-dom";
import {programCatalog} from "../../data/programCatalog";
import {titleParts} from "./programAssist";

// The "All Programs" navigator from the reference. One component, two faces:
// the vertical rail that holds the left-hand grid column on desktop, and a
// compact horizontal strip that replaces it on tablet and phone. Only one face
// is in the accessibility tree at a time — the other is display:none.

const programLabel = (program) =>
  titleParts(program.fullTitle || program.title).keyword;

const ProgramRail = ({activeId}) => {
  const items = programCatalog.map((program, index) => {
    const isActive = program.id === activeId;
    return {
      program,
      index,
      isActive,
      href: program.landingPath || `/programs/${program.id}`,
    };
  });

  return (
    <>
      <nav className="pd-rail" aria-label="All programs">
        <div className="pd-rail__head">
          <strong>All Programs</strong>
          <span className="pd-rail__count">
            01–{String(items.length).padStart(2, "0")}
          </span>
        </div>
        <ul className="pd-rail__list">
          {items.map(({program, index, isActive, href}) => (
            <li key={program.id}>
              <Link
                className={`pd-rail__link${isActive ? " is-active" : ""}`}
                to={href}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="pd-rail__n">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="pd-rail__text">
                  <strong>{programLabel(program)}</strong>
                  <small>{program.category}</small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <nav className="pd-strip" aria-label="All programs (compact)">
        <div className="pd-strip__in">
          {items.map(({program, index, isActive, href}) => (
            <Link
              key={program.id}
              className={`pd-strip__chip${isActive ? " is-active" : ""}`}
              to={href}
              aria-current={isActive ? "page" : undefined}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {programLabel(program)}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
};

export default ProgramRail;