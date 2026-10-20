import { lazy } from "react";
import { Link } from "react-router-dom";
import { useCinematicInteractions } from "../hooks/useCinematicInteractions";
import { Reveal, StaggerGroup, StaggerItem } from "../components/motionPrimitives";
import DeferUntilVisible from "../components/DeferUntilVisible";
import { differentiators, supportTracks, careerSteps } from "../data/siteData";
import BrandWord from "../components/BrandWord";

// Decorative mini-icons for the support track cards. Each is a 24px line glyph
// that inherits the card's accent colour via currentColor, so the cards keep the
// teal ramp and add a recognisable mark without a different illustration system.
const SUPPORT_ICONS = {
  workshops: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  ),
  tutoring: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  ),
  mentorship: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
    </svg>
  ),
};

// Decorative icons for the three career step cards. Each is a 24px line glyph
// that inherits the card's accent colour via currentColor, matching the support
// track glyphs above.
const CAREER_STEP_ICONS = {
  projects: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="m9 8 2 2-2 2" />
      <path d="m15 8-2 2 2 2" />
    </svg>
  ),
  certification: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  ),
  placement: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M22 7 13.5 15.5 8.5 10.5 2 17" />
      <path d="M16 7h6v6" />
    </svg>
  ),
};

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

      <section id="faculty" className="section-block dark-section">
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
              <span className="support-card__icon" aria-hidden="true">
                {SUPPORT_ICONS[track.icon]}
              </span>
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
          <h2>Discover the unique features that set <BrandWord /> apart in professional training</h2>
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
                <span className="step-card__icon" aria-hidden="true">
                  {CAREER_STEP_ICONS[step.icon]}
                </span>
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
