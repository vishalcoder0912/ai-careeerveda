import {Suspense, lazy, useEffect} from "react";
import {Link, Navigate, useParams} from "react-router-dom";
import {useReducedMotion} from "framer-motion";
import {Reveal, StaggerGroup, StaggerItem} from "../components/motionPrimitives";
import {useViewportTier} from "../hooks/useViewportTier";
import {useDocumentTitle} from "../hooks/useDocumentTitle";
import {getProgram} from "../data/programCatalog";
import {useContentItem} from "../hooks/useContent";
import {adaptProgram} from "../lib/contentAdapters";
import {applySeo} from "../lib/seoTags";
import {courseSchema, breadcrumbSchema, useJsonLd} from "../lib/structuredData";
import {absoluteUrl, OG_IMAGE} from "../config/siteMeta";
import {composeTitle, programMeta} from "../config/pageMeta";
// This page wears .page-shell but is the one route that does not render the
// PageShell component, so nothing else pulls its stylesheet in. It has to be
// imported here by hand: without it every --ps-* token is undefined, and the
// page loses its gutters, its card surfaces and borders, its buttons, and the
// fee — which is gradient text, so an undefined gradient paints it transparent.
// It only ever looked right because the pages that DO import it used to be in
// the entry bundle; code-splitting the routes took that away.
// Imported before program-detail.css so the page's own rules still win.
import "../components/page-shell.css";
import "../components/program-detail.css";

// Lazily loaded so three.js is code-split out of the main bundle. Only this hero
// uses it, so every other route stops paying for the download.
const LaserFlow = lazy(() => import("../components/ui/LaserFlow"));

// One page, seven programs. Every section below is driven by the program's
// record in programCatalog.js and skipped when that program has no data for it,
// so a thin program renders a short page rather than a page full of empty
// headings.
const ProgramDetailPage = () => {
  const {slug} = useParams();
  // The static catalogue is the fallback for this exact slug, so a live URL
  // renders instantly and keeps working even if the API is unreachable. When
  // the API answers, its copy wins — that is what makes an edit in the admin
  // panel show up here.
  const {item: program, isLoading} = useContentItem("programs", slug, {
    fallback: getProgram(slug),
    adapt: adaptProgram,
  });
  const reduceMotion = useReducedMotion();
  const tier = useViewportTier();

  // This route is dynamic, so it is not in pageMeta — RouteMeta leaves the tab as
  // the brand name and this refines it to the program once loaded. Called before
  // the unknown-slug guard below to satisfy the rules of hooks; a missing program
  // simply leaves the title as "CareerVeda" for the instant before the redirect.
  // Shared with scripts/prerender.mjs so the tags baked into the HTML and the
  // ones written here are the same sentence — see the note in pageMeta.js.
  const programDescription = programMeta(program)?.description;

  useDocumentTitle(program && program.title, programDescription);

  // Canonical, Open Graph and Twitter tags for this specific program. RouteMeta
  // deliberately skips this route so these are not written and then immediately
  // overwritten — without them every program URL shared to LinkedIn or WhatsApp
  // carried the home page's title and image.
  useEffect(() => {
    if (!program) return;

    applySeo({
      title: composeTitle(program.title),
      description: programDescription,
      url: absoluteUrl(`/programs/${program.id}`),
      image: program.image || OG_IMAGE,
      // Not "website": this is a specific offering, and the type is what makes
      // a share render as a rich card rather than a bare link.
      type: "article",
    });
  }, [program, programDescription]);

  // Course structured data — the schema that can earn a rich result in search
  // for a program page. Removed on unmount by useJsonLd, so navigating to
  // another program does not leave the previous one's Course data behind.
  useJsonLd(
    "ld-course",
    program
      ? courseSchema(program)
      : null,
  );

  useJsonLd(
    "ld-breadcrumb",
    program
      ? breadcrumbSchema([
          // `path`, not `url` — breadcrumbSchema reads crumb.path, and the key
          // it does not find becomes absoluteUrl(undefined), which defaults to
          // the origin. Every crumb pointed at the home page, so the trail said
          // careerveda.in › careerveda.in › careerveda.in and earned nothing.
          {name: "Home", path: "/"},
          {name: "Programs", path: "/programs"},
          {name: program.title, path: `/programs/${program.id}`},
        ])
      : null,
  );

  // The beam is decoration on a page whose job is to be read, so anyone who asked
  // for less motion still gets none of it. Phones do get it: it was withheld from
  // them on cost grounds, but the shader already scales its own resolution down
  // when it misses frames (see adjustDprIfNeeded in LaserFlow), and capping the
  // starting DPR at 1 means a 3x phone screen renders a ninth of the pixels a
  // naive mount would. Cheap enough to keep the page looking like the page.
  const showLaser = !reduceMotion;
  const laserDpr = tier === "mobile" ? 1 : undefined;

  // A program created in the admin panel has no entry in the static catalogue,
  // so there is nothing to render on the first pass and `program` is null while
  // the API call is still in flight. Redirecting on that null is what used to
  // bounce every database-only program straight back to /programs — the page
  // has to wait for an answer before deciding the URL is dead.
  if (isLoading) {
    return <main className="spline-page page-shell" aria-busy="true" />;
  }

  // Now it is a real dead URL: neither the API nor the catalogue has this slug.
  if (!program) return <Navigate to="/programs" replace />;

  const applyHref = `/enroll?program=${program.id}`;

  const highlights = [
    program.nextBatch && ["Next Batch", program.nextBatch],
    ["Duration", `${program.duration} · ${program.format}`],
    program.projects && ["Industry Projects", program.projects],
    program.eligibility && ["Eligibility", program.eligibility],
  ].filter(Boolean);

  return (
    <main className="spline-page page-shell program-detail">
      <section className="pd-hero">
        {showLaser && (
          <div className="pd-hero__laser" aria-hidden="true">
            <Suspense fallback={null}>
              <LaserFlow
                color="#2dd4bf"
                dpr={laserDpr}
                horizontalBeamOffset={0.4}
                verticalBeamOffset={0.0}
                horizontalSizing={0.5}
                verticalSizing={2.0}
                /* Near-zero, and measured rather than eyeballed. The canvas
                   composites with `screen`, so fog is NOT local to the beam: at
                   the component's default (0.45) it lifted the black behind the
                   headline by 16/255, washing out the copy while the beam itself
                   stayed hidden behind the price card. The beam should be the only
                   thing that adds light here. */
                fogIntensity={0.04}
                wispIntensity={3.2}
                flowSpeed={0.3}
                mouseTiltStrength={0.008}
              />
            </Suspense>
          </div>
        )}

        <div className="ps-inner">
          <Link className="pd-back" to="/programs">← All programs</Link>

          <div className="pd-hero__grid">
            <Reveal className="pd-hero__copy">
              {program.badges?.length > 0 && (
                <div className="pd-badges">
                  {program.badges.map((badge) => (
                    <span key={badge}>{badge}</span>
                  ))}
                </div>
              )}

              <h1>{program.fullTitle || program.title}</h1>
              <p className="pd-lead">{program.lead || program.description}</p>

              <div className="pd-meta">
                <div>
                  <small>Duration</small>
                  <strong>{program.duration}</strong>
                </div>
                <div>
                  <small>Mode</small>
                  <strong>{program.format}</strong>
                </div>
                {program.learners && (
                  <div>
                    <small>Learners</small>
                    <strong>{program.learners}</strong>
                  </div>
                )}
              </div>

              <div className="pd-hero__actions">
                <Link className="page-btn page-btn--primary" to={applyHref}>
                  Enroll Now{program.fee ? ` - ${program.fee.amount}` : ""}
                </Link>
                {/* No brochure file exists yet, so this goes to the consultation
                    form, where the team sends one. If a PDF is added later, point
                    this at it — the label already promises a download. */}
                <Link className="page-btn page-btn--ghost" to="/#consultation">
                  Download Brochure
                </Link>
              </div>
            </Reveal>

            {/* The price card. Sticky on desktop so Apply stays reachable through
                a curriculum that runs to 24 modules; it un-sticks on narrow
                screens, where a pinned card would eat the viewport. */}
            <Reveal as="aside" className="pd-price" amount={0.1}>
              {program.fee && (
                <div className="pd-price__amount">
                  <small>{program.fee.label}</small>
                  <strong>{program.fee.amount}</strong>
                  {program.fee.note && <span>{program.fee.note}</span>}
                </div>
              )}

              <dl className="pd-price__rows">
                {program.emi && (
                  <div>
                    <dt>EMI options available</dt>
                    <dd>{program.emi}</dd>
                  </div>
                )}
                {program.nextBatch && (
                  <div>
                    <dt>Next batch starts</dt>
                    <dd>{program.nextBatch}</dd>
                  </div>
                )}
                {program.seats && (
                  <div>
                    <dt>Limited seats</dt>
                    <dd>{program.seats}</dd>
                  </div>
                )}
              </dl>

              <Link className="page-btn page-btn--primary pd-price__cta" to={applyHref}>
                Reserve your seat
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {highlights.length > 0 && (
        <section className="page-section">
          <div className="ps-inner">
            <StaggerGroup className="pd-highlights">
              {highlights.map(([label, value]) => (
                <StaggerItem className="pd-highlight" key={label}>
                  <small>{label}</small>
                  <strong>{value}</strong>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </section>
      )}

      <section className="page-section">
        <div className="ps-inner">
          <Reveal className="pd-heading">
            <h2>What you&rsquo;ll gain from this program</h2>
            <p>{program.gainsIntro || program.description}</p>
          </Reveal>

          <StaggerGroup className="pd-gains" stagger={0.03}>
            {(program.gains || [...program.overview, ...program.outcomes]).map((gain) => (
              <StaggerItem className="pd-gain" key={gain}>
                <span aria-hidden="true">✓</span>
                {gain}
              </StaggerItem>
            ))}
          </StaggerGroup>

          {program.skills?.length > 0 && (
            <div className="pd-skills">
              {program.skills.map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="page-section">
        <div className="ps-inner">
          <Reveal className="pd-heading">
            <h2>{program.fullTitle || program.title} curriculum</h2>
            <p>{program.curriculumIntro || program.description}</p>
          </Reveal>

          {program.modules?.length > 0 ? (
            <>
              <p className="pd-module-count">
                📚 {program.modules.length} modules · learning roadmap
              </p>
              <div className="pd-modules">
                {program.modules.map((module, index) => (
                  // Open the first module so the section reads as content, not as
                  // a wall of closed rows.
                  <details className="pd-module" key={module.n} open={index === 0}>
                    <summary>
                      <span className="pd-module__n">
                        {String(module.n).padStart(2, "0")}
                      </span>
                      {module.title}
                    </summary>
                    <ul>
                      {module.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </>
          ) : (
            <div className="pd-outline">
              {[
                ["Overview", program.overview],
                ["Curriculum", program.curriculum],
                ["Outcomes", program.outcomes],
              ].map(([label, points]) => (
                <article className="page-card" key={label}>
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

      {(program.internship || program.softSkills) && (
        <section className="page-section">
          <div className="ps-inner">
            <div className="pd-tracks">
              {program.internship && (
                <article className="pd-track">
                  <span className="pd-track__icon" aria-hidden="true">🎯</span>
                  <h3>Internship program</h3>
                  <ul>
                    {program.internship.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </article>
              )}
              {program.softSkills && (
                <article className="pd-track">
                  <span className="pd-track__icon" aria-hidden="true">💼</span>
                  <h3>Soft skills program</h3>
                  <ul>
                    {program.softSkills.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </article>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="page-section">
        <div className="ps-inner">
          <Reveal className="page-cta">
            <h2>Ready to start {program.title}?</h2>
            <p>
              Reserve your seat and a career expert will confirm your batch, fee and
              EMI options.
            </p>
            <div className="page-hero__actions">
              <Link className="page-btn page-btn--primary" to={applyHref}>
                Apply Now
              </Link>
              <Link className="page-btn page-btn--ghost" to="/programs">
                Compare programs
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
};

export default ProgramDetailPage;
