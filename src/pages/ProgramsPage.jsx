import { lazy } from "react";
import ProgramExplorer from "../components/ProgramExplorer";
import DeferUntilVisible from "../components/DeferUntilVisible";
import { Reveal } from "../components/motionPrimitives";
import { useCinematicInteractions } from "../hooks/useCinematicInteractions";
import { stats } from "../data/siteData";
import { useContentList } from "../hooks/useContent";
import { adaptAlumniReview } from "../lib/contentAdapters";
import { programCatalog } from "../data/programCatalog";
import { programListSchema, useJsonLd } from "../lib/structuredData";
import "../components/SplineLanding.css";
import "../components/cinematic-interactions.css";
import "../components/programs-page-responsive.css";

// The explorer is the page — it stays eager. These two sit under it.
const RecommendedCourses1 = lazy(() => import("../components/Recommended/RecommendedCourses1"));
const OutcomeStories = lazy(() => import("../components/OutcomeStories"));

const ProgramsPage = () => {
  const pageRef = useCinematicInteractions();

  // This page used to import `reviews` straight from src/data/siteData, so it
  // was the one outcome strip on the site the admin panel could not touch —
  // editing, adding or deleting an alumni story changed the home and alumni
  // pages and left this one showing the four hardcoded entries forever.
  //
  // Same resource and same `featured` flag as the home page: both render the
  // OutcomeStories strip, and Alumni.js documents `featured` as the flag for it.
  // No fallback, so nothing renders here that an admin did not publish.
  const {items: reviews} = useContentList("alumni", {
    adapt: adaptAlumniReview,
    params: {featured: true},
  });

  // The catalog is already in this route's chunk — ProgramExplorer imports it as
  // its own fallback — so listing it here costs nothing extra to download.
  useJsonLd("ld-program-list", programListSchema(programCatalog));
  // The Home > Programs trail is emitted centrally by RouteMeta in App.jsx now,
  // along with the one every other static route was missing. Kept here it would
  // be a second BreadcrumbList on the same page saying the same thing.

  return (
    <main ref={pageRef} className="spline-page">
      <div className="scroll-progress" aria-hidden="true" />
      <section id="programs" className="section-block light-section program-showcase-section" style={{ paddingTop: "120px" }}>
        {/* h1, not h2. This is the page's primary heading and /programs had no
            h1 at all — an audit of the built HTML found 0 on this route and on
            /faculty, while every other page had exactly one. Every SEO tool
            flags a missing h1, and on the commercial landing page for nine
            programs it is the heading Google weighs most.

            The stylesheets target `.section-heading :is(h1, h2)`, so this
            renders identically to the h2 it replaces — :is() takes the
            specificity of its most specific argument, which for two element
            selectors is the same (0,0,1) the bare `h2` had. */}
        <Reveal className="section-heading">
          <p className="section-label">Discover CareerVeda Learning Pathways</p>
          <h1>Explore every career track through an interactive program studio.</h1>
          <p>
            Choose a practical pathway across analytics, product, data science,
            investment banking, backend engineering, and generative AI.
          </p>
        </Reveal>
        <Reveal amount={0.1}>
          <ProgramExplorer />
        </Reveal>
        <DeferUntilVisible minHeight={600}>
          <RecommendedCourses1 />
        </DeferUntilVisible>
        <DeferUntilVisible minHeight={520}>
          <OutcomeStories reviews={reviews} stats={stats} />
        </DeferUntilVisible>
      </section>
    </main>
  );
};

export default ProgramsPage;
