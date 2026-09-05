import { lazy, useRef } from "react";
import Hero from "../components/Hero";
import DeferUntilVisible from "../components/DeferUntilVisible";
import ConsultationAtmosphere from "../components/ConsultationAtmosphere";
import { Reveal, StaggerGroup, StaggerItem } from "../components/motionPrimitives";
import { useCinematicInteractions } from "../hooks/useCinematicInteractions";
import { stats, faqs as staticFaqs } from "../data/siteData";
import { useContentList } from "../hooks/useContent";
import { adaptFaq, adaptAlumniReview } from "../lib/contentAdapters";
import { faqSchema, useJsonLd } from "../lib/structuredData";
import "../components/SplineLanding.css";
import "../components/careerveda-hero-refinement.css";
import "../components/cinematic-interactions.css";
import "../components/shape-grid.css";
import "./HomePage.css";

/* Only the hero is above the fold. Everything below it is split out and fetched
   as the reader approaches it, so the first paint is the hero and the navigation
   rather than the whole page's worth of code. */
const TrustedCompanies = lazy(() => import("../components/TrustedCompanies"));
const RecommendedCourses = lazy(() => import("../components/Recommended/RecommendedCourses1"));
const LearnerOutcomes = lazy(() => import("../components/LearnerOutcomes"));
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
      {/* Backdrop layer for the whole page. The layer stays — its ::before and
          ::after in shape-grid.css are the teal/blue glow clouds that give the
          page margins their ambience — but it hosts NO grid canvas. It used to
          run a second ShapeGrid, fixed to the VIEWPORT, while the hero's grid
          was anchored to the DOCUMENT: two coordinate systems that agreed only
          at scrollY 0. Since then the single grid moved again — the hero's
          document-anchored canvas retired with it, and the ONE CursorGrid now
          lives viewport-fixed behind every route (see
          components/background/CareerVedaBackground.jsx); these clouds are the
          glow system that rides above it. */}
      <div className="cv-grid-layer" aria-hidden="true" />

      <div className="scroll-progress" aria-hidden="true" />
      <Hero stats={stats} />

      {/* Negative margin. This section sits close enough behind the hero that a
          phone's initial viewport already intersects its placeholder — even at
          rootMargin 0 — which mounted it during the load and pulled in its
          chunk AND framer-motion (which it imports) AND five hero-card PNGs
          from ImageKit, all competing with the LCP for bandwidth. A -120px
          margin meant the reader must scroll into the section itself before
          anything is fetched; the minHeight placeholder holds the layout so
          there is nothing to shift, and the card images are loading="lazy"
          behind it. The negative pull existed to overlap the old cloud-band
          fog seam, which has been removed — no overlap is wanted now, and
          pulling the cards over the stat strip would create the broken
          stats → programs transition. */}
      <DeferUntilVisible minHeight={600} margin="-150px">
        <RecommendedCourses />
      </DeferUntilVisible>

      <DeferUntilVisible minHeight={520}>
        <LearnerOutcomes reviews={reviews} stats={stats} />
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
