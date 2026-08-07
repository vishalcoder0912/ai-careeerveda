import { lazy, useRef } from "react";
import Hero from "../components/Hero";
import DeferUntilVisible from "../components/DeferUntilVisible";
import ShapeGrid from "../components/ShapeGrid";
import ConsultationAtmosphere from "../components/ConsultationAtmosphere";
import { Reveal, StaggerGroup, StaggerItem } from "../components/motionPrimitives";
import { useCinematicInteractions } from "../hooks/useCinematicInteractions";
import { stats, faqs as staticFaqs } from "../data/siteData";
import { useContentList } from "../hooks/useContent";
import { adaptFaq, adaptAlumniReview } from "../lib/contentAdapters";
import { faqSchema, useJsonLd } from "../lib/structuredData";
import "../components/SplineLanding.css";
import "../components/cinematic-interactions.css";
import "../components/shape-grid.css";

/* Only the hero is above the fold. Everything below it is split out and fetched
   as the reader approaches it, so the first paint is the hero and the navigation
   rather than the whole page's worth of code. */
const TrustedCompanies = lazy(() => import("../components/TrustedCompanies"));
const RecommendedCourses1 = lazy(() => import("../components/Recommended/RecommendedCourses1"));
const OutcomeStories = lazy(() => import("../components/OutcomeStories"));
const ConsultationForm = lazy(() => import("../components/ConsultationForm"));
const PressSection = lazy(() => import("../components/PressSection"));

const HomePage = () => {
  const pageRef = useCinematicInteractions();
  // Site-wide FAQs, editable in the admin panel. Program-specific FAQs live on
  // the program record instead and render on its own page.
  const { items: faqs } = useContentList("faqs", { fallback: staticFaqs, adapt: adaptFaq });

  // FAQPage JSON-LD over the same list the accordion renders.
  //
  // faqSchema() has existed in lib/structuredData.js since that file was written
  // and was never called from anywhere, so the answers were on the page and
  // invisible as structured data. This is the block that lets a question-shaped
  // query ("how long is the data analytics course", "does CareerVeda offer
  // placement assistance") resolve to an answer attributed to this site rather
  // than to whoever else answered it — in a Google result and, increasingly, in
  // an AI answer that cites its sources.
  //
  // Built from `faqs`, not staticFaqs, so an answer edited in the admin panel
  // updates the markup with the page instead of the two drifting apart.
  useJsonLd("ld-faq", faqs.length ? faqSchema(faqs) : null);
  // The outcome strip is the alumni collection, filtered to the stories an admin
  // ticked "Featured". The full set still lives on /alumni; this is a chosen
  // few, not a listing, because a home page that prints all seventeen is a
  // directory nobody reads.
  //
  // Untick every one of them and the section disappears rather than falling back
  // to the static four — an answered request is authoritative, filtered or not,
  // which is the same rule that lets deleting a record actually remove it from
  // the site. OutcomeStories returns null on an empty list, so what is left is
  // no section, not a heading over nothing.
  //
  // No static fallback: this strip shows what the admin published or it shows
  // nothing. The trade is deliberate and it is a real one — with the API
  // unreachable, or a deploy that has no VITE_PUBLIC_API_BASE_URL set, the
  // section disappears instead of degrading to the four entries in src/data.
  // That is the point: two sources meant an admin edit could be silently
  // overridden by a copy nobody remembers editing.
  const { items: reviews } = useContentList("alumni", {
    adapt: adaptAlumniReview,
    params: { featured: true },
  });
  // The consultation heading is the pointer eventSource for the particle field
  // behind it, so the cursor lines up with the effect's focal point.
  const consultationCopyRef = useRef(null);

  return (
    <main ref={pageRef} className="spline-page spline-page--grid">
      {/* Backdrop for the whole page. Fixed and inert, so it sits under every
          section and never takes a click — see shape-grid.css for which bands
          are made transparent to let it show, and why the hero is not one. */}
      <div className="cv-grid-layer" aria-hidden="true">
        <ShapeGrid
          shape="square"
          direction="diagonal"
          speed={0.1}
          squareSize={90}
          hoverTrailAmount={5}
          /* Teal on slate: the live palette is slate-color-system.css, and the
             page is dark, so the lines are the teal accent rather than the
             brand blue, which disappears into the background.

             No vignette. It is drawn as an opaque ring closing at half the
             canvas diagonal, which is exactly the margin either side of the
             content column — the one place on this page where there is nothing
             on top of the grid, so vignetting it hid the effect where it was
             the most visible. */
          borderColor="rgba(45, 212, 191, 0.30)"
          hoverFillColor="rgba(45, 212, 191, 0.22)"
          vignetteColor="rgba(15, 23, 42, 0)"
        />
      </div>

      <div className="scroll-progress" aria-hidden="true" />
      <Hero stats={stats} />

      {/* Cloud seam between the hero's stat strip and the course grid. It sits
          above both — negative margins on either side, so the hero's bottom edge
          and the card's top edge are inside the fog rather than either side of a
          gap. The child is the near layer: the veil that blurs the card top and
          the particles over it. All CSS, see SplineLanding.css. */}
      <div className="cloud-band" aria-hidden="true">
        <span className="cloud-band__particles" />
        <span className="cloud-band__veil" />
      </div>

      {/* Press first, then the logo wall: both are credibility, and the reader
          meets the named publications before the row of employer marks. */}

      {/* A wider margin than the rest: this is the one section whose mount is the
          start of a chain — chunk, then six card images — rather than the end of
          it, and at the shared 300px a phone arrived while the strips were still
          blank. 900px is roughly a viewport of warning on a phone, which covers
          the chunk and lets the images be in flight by the time the cards are
          read. The section is still not fetched by someone who never scrolls. */}
      <DeferUntilVisible minHeight={600} margin="900px">
        <RecommendedCourses1 />
      </DeferUntilVisible>

      <DeferUntilVisible minHeight={520}>
        <OutcomeStories reviews={reviews} stats={stats} />
      </DeferUntilVisible>
       <DeferUntilVisible minHeight={520}>
        <TrustedCompanies />
      </DeferUntilVisible>

 <DeferUntilVisible minHeight={800}>
        <PressSection />
      </DeferUntilVisible>

      <section id="consultation" className="consultation-section">
        {/* Copy and form now share a single unified panel/background instead of
            floating as two separate cards. */}
        <div className="consultation-panel">
          <Reveal
            className="consultation-copy consultation-copy--panel"
            ref={consultationCopyRef}
          >
            <ConsultationAtmosphere eventSource={consultationCopyRef} />
            <p className="section-label">ISO Certified Career Platform</p>
            <h2 className="consultation-headline">
              Transform Your Career with{" "}
              <span className="cv-typewriter-accent">CareerVeda</span>
            </h2>
            <p>
              Master cutting-edge technologies with industry experts, get certified
              programs, and receive placement support from a professional career platform
            </p>
          </Reveal>
          <DeferUntilVisible minHeight={520}>
            <ConsultationForm />
          </DeferUntilVisible>
        </div>
      </section>

      <section className="faq-section">
        <Reveal className="section-heading compact">
          <p className="section-label">Everything You Need to Know</p>
          <h2>Got questions? We've got answers</h2>
          <p>Find everything you need to know about programs, projects, placement support, and learning experience</p>
        </Reveal>
        <StaggerGroup className="faq-list" stagger={0.06}>
          {faqs.map(([question, answer]) => (
            <StaggerItem as="details" key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </section>
    </main>
  );
};

export default HomePage;
