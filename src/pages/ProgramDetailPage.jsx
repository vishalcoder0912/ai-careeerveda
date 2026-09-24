import {useEffect} from "react";
import {Navigate, useParams} from "react-router-dom";
import {useDocumentTitle} from "../hooks/useDocumentTitle";
import {getProgram} from "../data/programCatalog";
import {publishedMentors} from "../data/mentors";
import {useContentItem} from "../hooks/useContent";
import {adaptProgram} from "../lib/contentAdapters";
import {applySeo} from "../lib/seoTags";
import {courseSchema, breadcrumbSchema, useJsonLd} from "../lib/structuredData";
import {absoluteUrl, OG_IMAGE} from "../config/siteMeta";
import {composeTitle, programMeta} from "../config/pageMeta";
import ProgramHero from "../components/program-detail/ProgramHero";
import ProgramSectionNav from "../components/program-detail/ProgramSectionNav";
import ProgramOverview from "../components/program-detail/ProgramOverview";
import ProgramCurriculum from "../components/program-detail/ProgramCurriculum";
import ProgramCareers from "../components/program-detail/ProgramCareers";
import ProgramSalaries from "../components/program-detail/ProgramSalaries";
import ProgramMentors from "../components/program-detail/ProgramMentors";
import ProgramFees from "../components/program-detail/ProgramFees";
import ProgramFaq from "../components/program-detail/ProgramFaq";
import ProgramCta from "../components/program-detail/ProgramCta";

import {matchJobs} from "../components/program-detail/jobTracks";
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

// One page, nine programs. Every section below is driven by the program's
// record in programCatalog.js (or the API's answer for it) and skipped when
// that program has no data for it, so a thin program renders a short page
// rather than a page full of empty headings.
const ProgramDetailPage = ({slug: providedSlug}) => {
  const params = useParams();
  // A fixed slug can be handed to this page directly (the /generative-ai route
  // renders the gen-ai program under its own URL); otherwise it is the dynamic
  // :slug from /programs/:slug.
  const slug = providedSlug || params.slug;
  // The static catalogue is the fallback for this exact slug, so a live URL
  // renders instantly and keeps working even if the API is unreachable. When
  // the API answers, its copy wins — that is what makes an edit in the admin
  // panel show up here.
  const {item: program, isLoading} = useContentItem("programs", slug, {
    fallback: getProgram(slug),
    adapt: adaptProgram,
  });

  // Mentors are matched to their program by courseSlug (or the courseSlugs
  // array, which lets one mentor teach two related programs) in the same data
  // file, so the strip only appears when real faculty exist for this course.
  const programMentors = program
    ? publishedMentors.filter(
        (mentor) =>
          mentor.courseSlug === program.id ||
          (mentor.courseSlugs || []).includes(program.id),
      )
    : [];

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

  // A program created in the admin panel has no entry in the static catalogue,
  // so there is nothing to render on the first pass and `program` is null while
  // the API call is still in flight. Redirecting on that null is what used to
  // bounce every database-only program straight back to /programs — the page
  // has to wait for an answer before deciding the URL is dead.
  if (isLoading) {
    return <main className="spline-page page-shell program-detail" aria-busy="true" />;
  }

  // Now it is a real dead URL: neither the API nor the catalogue has this slug.
  if (!program) return <Navigate to="/programs" replace />;

  const applyHref = `/enroll?program=${program.id}`;
  const hasProgramJobs = matchJobs(program, 1).length > 0;

  // Programs can carry their own colour theme (e.g. the violet → cyan look of
  // the AI Systems flagship). The record's `theme` becomes a scoped class and
  // the overrides in program-detail.css re-tint the brand tokens and pools for
  // that page alone, so no other program changes with it. The static catalogue
  // supplies the theme even when the API answers without it (the field is
  // purely presentational and not yet part of the backend model).
  const theme = program.theme || getProgram(slug)?.theme;
  const themeClass = theme ? ` pd-theme-${theme}` : "";

  return (
    <main className={`spline-page page-shell program-detail${themeClass}`}>
      <div className="pd-layout">
        <div className="pd-layout__main">
          <ProgramHero program={program} applyHref={applyHref} />
          <ProgramSectionNav
            hasMentors={programMentors.length > 0}
            hasJobs={hasProgramJobs}
          />

          <ProgramOverview program={program} />

          <ProgramCurriculum program={program} applyHref={applyHref} />
          <ProgramCareers program={program} />
          <ProgramSalaries program={program} />

          {programMentors.length > 0 && (
            <ProgramMentors mentors={programMentors} />
          )}

          <ProgramFees program={program} applyHref={applyHref} />
          <ProgramFaq />
          <ProgramCta program={program} applyHref={applyHref} />
        </div>
      </div>
    </main>
  );
};

export default ProgramDetailPage;