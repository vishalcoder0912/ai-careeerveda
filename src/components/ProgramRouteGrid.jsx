import {useMemo} from "react";
import {Link} from "react-router-dom";
import {Reveal, StaggerGroup, StaggerItem} from "./motionPrimitives";
import {programCatalog} from "../data/programCatalog";
import {useContentList} from "../hooks/useContent";
import {adaptProgram} from "../lib/contentAdapters";
import TiltCard from "./TiltCard";
import "./program-route-grid.css";

/* ── All Eleven Programs. One Route Each. ───────────────────────────────────
 *
 * A card grid of every career track in the catalogue. Each card is the whole
 * link and walks its own route: the cinematic landing a program declares via
 * `landingPath`, or its /programs/:slug detail page.
 *
 * The grid is live-data driven and mirrors the explorer rail: published
 * programs arrive from the API ordered by the admin's displayOrder (the rail
 * labels the first "01"), so the card numbers always agree with the sidebar.
 * PG Program in AI Systems & Agentic AI Engineering
 * (/programs/ai-systems-agentic-ai) is the one track the admin panel does not
 * publish into that list, so it is appended from the static catalogue, giving
 * the full eleven-track line-up on every render. Cards for a record missing
 * from the API simply link to their catalogue route; duplicating an id never
 * happens.
 *
 * Every field shown comes off the program's own record; nothing is invented.
 */

const formatPrice = (price) =>
  price && !String(price).trim().startsWith("₹")
    ? `₹${String(price).trim()}`
    : price;

const routePath = (program) => program.landingPath || `/programs/${program.id}`;

const ProgramRouteGrid = () => {
  // Published programs in admin order. Empty fallback is fine here: the
  // catalogue merge below fills in everything the API does not answer with.
  const {items: published} = useContentList("programs", {
    fallback: [],
    adapt: adaptProgram,
  });

  // Published first (so the numbers match the rail), then the catalogue-only
  // tracks whose routes live outside the admin list.
  const programs = useMemo(() => {
    const seen = new Set(published.map((program) => program.id));
    return [...published, ...programCatalog.filter((program) => !seen.has(program.id))];
  }, [published]);

  return (
    <section className="route-grid-section" aria-labelledby="route-grid-title">
      <Reveal className="route-grid-header">
        <p className="route-grid-eyebrow">Career Tracks Catalogue</p>
        <h2 id="route-grid-title">All Eleven Programs. One Route Each.</h2>
        <p>
          Eleven career tracks from the catalogue — open any card to walk that
          program's own route.
        </p>
      </Reveal>

      <StaggerGroup as="ul" className="route-grid" stagger={0.05}>
        {programs.map((program, index) => {
          const price = formatPrice(program.startingPrice);

          return (
            <StaggerItem as="li" key={program.id} className="route-tile">
              <TiltCard className="route-tile-tilt">
                <Link
                  className="route-tile-link"
                  to={routePath(program)}
                  aria-label={`${program.title} — explore route`}
                >
                <span className="route-tile-top">
                  <span className="route-tile-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="route-tile-arrow" aria-hidden="true">
                    &rarr;
                  </span>
                </span>

                <h3 className="route-tile-title">{program.title}</h3>
                <p className="route-tile-meta">
                  {[program.category, program.duration, program.format]
                    .filter(Boolean)
                    .join(" · ")}
                </p>

                {program.subtitle && (
                  <p className="route-tile-subtitle">{program.subtitle}</p>
                )}

                {price && (
                  <p className="route-tile-price">
                    From <strong>{price}</strong>
                  </p>
                )}

                <span className="route-tile-cta">
                  Explore route <span aria-hidden="true">&rarr;</span>
                </span>
                </Link>
              </TiltCard>
            </StaggerItem>
          );
        })}
      </StaggerGroup>
    </section>
  );
};

export default ProgramRouteGrid;