import { lazy } from "react";
import { Link } from "react-router-dom";
import { useCinematicInteractions } from "../hooks/useCinematicInteractions";
import { Reveal, StaggerGroup, StaggerItem } from "../components/motionPrimitives";
import DeferUntilVisible from "../components/DeferUntilVisible";
import { differentiators, supportTracks, careerSteps } from "../data/siteData";

// The bento grid carries its own GSAP spotlight/particle machinery; it sits below
// the section heading, so it can arrive as the reader reaches it.
const MagicBento = lazy(() => import("../components/MagicBento"));
// The mentor directory is below the fold on every screen, so it arrives as the
// reader reaches it rather than in the first paint.
const MentorGrid = lazy(() => import("../components/MentorGrid"));
import "../components/SplineLanding.css";
import "../components/cinematic-interactions.css";

const FacultyPage = () => {
  const pageRef = useCinematicInteractions();

  return (
    <main ref={pageRef} className="spline-page">
      <div className="scroll-progress" aria-hidden="true" />

      <section id="faculty" className="section-block dark-section" style={{ paddingTop: "120px" }}>
        <Reveal className="section-heading">
          <p className="section-label">What Makes CareerVeda Different?</p>
          {/* h1: this route had none. See the note on ProgramsPage — the
              stylesheets match `.section-heading :is(h1, h2)`, so the rendering
              is unchanged. */}
          <h1>Transform your career with India's leading professional training platform</h1>
          <p>
            A complete learning, mentorship, certification, and placement support
            system built around employability
          </p>
        </Reveal>
        <DeferUntilVisible minHeight={60}>
          <MagicBento
            ariaLabel="What makes CareerVeda different"
            cards={differentiators.map(([title, body], index) => ({
              label: String(index + 1).padStart(2, "0"),
              title,
              description: body,
            }))}
            glowColor="45, 212, 191"
            spotlightRadius={320}
            particleCount={10}
            enableTilt={false}
            enableMagnetism
            clickEffect
          />
        </DeferUntilVisible>
      </section>

      <section className="section-block support-section">
        <Reveal className="section-heading">
          <p className="section-label">CareerVeda Learning & Career Support</p>
          <h2>Get expert guidance and personalized support at every step of your learning journey</h2>
        </Reveal>
        <StaggerGroup className="support-grid">
          {supportTracks.map((track) => (
            <StaggerItem as="article" interactive key={track.title}>
              <h3>{track.title}</h3>
              <ul>
                {track.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </section>

      {/* Straight after the support tracks: those describe the help on offer, and
          this is who actually gives it. The claim, then the people behind it. */}
      <DeferUntilVisible minHeight={620}>
        <MentorGrid />
      </DeferUntilVisible>

      <section className="section-block strategy-section">
        <Reveal className="section-heading compact">
          <p className="section-label">Shaping Tomorrow with Today's Strategies</p>
          <h2>Discover the unique features that set CareerVeda apart in professional training</h2>
        </Reveal>
        <div className="strategy-layout">
          <div className="project-number">
            <strong>500+</strong>
            <span>Projects</span>
            <p>
              Gain hands-on experience through real-world projects, comprehensive
              case studies, and exclusive internship opportunities with industry partners
            </p>
            <Link className="outcome-cta" to="/programs">
              Explore Programs
            </Link>
          </div>
          <StaggerGroup className="step-list">
            {careerSteps.map((step) => (
              <StaggerItem as="article" interactive key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                <div>
                  {step.tags.map((tag) => (
                    <small key={tag}>{tag}</small>
                  ))}
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>
    </main>
  );
};

export default FacultyPage;
