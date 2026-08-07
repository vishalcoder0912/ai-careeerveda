import {Link} from "react-router-dom";
import {PageHero, SectionHeading} from "../components/PageShell";
import {Reveal, StaggerGroup, StaggerItem} from "../components/motionPrimitives";
import {stats, differentiators} from "../data/siteData";

const values = [
  ["🎯", "Outcomes over hours", "Every program is measured by placement readiness and real skill gain, not just content delivered."],
  ["🤝", "Mentor-first learning", "200+ working professionals guide learners through projects, feedback, and career decisions."],
  ["🧭", "Guidance at every step", "From the first class to the final offer, learners are supported end to end."],
  ["🌍", "Access for everyone", "Flexible schedules and practical curricula built for students, professionals, and switchers alike."],
];

const timeline = [
  ["Our mission", "Make career-defining education practical, mentor-led, and outcome-driven for learners across India."],
  ["What we do", "Live, industry-aligned programs in analytics, data science, AI, finance, security, and engineering."],
  ["How we help", "Hands-on projects, 1:1 mentorship, certifications, and placement support with 900+ hiring partners."],
];

const AboutPage = () => {
  return (
    <main className="spline-page page-shell">
      <PageHero
        eyebrow="About CareerVeda"
        title={<>We turn ambition into <span className="accent">career outcomes</span></>}
        lead="CareerVeda is a professional learning platform built around one goal — helping learners move from coursework to real, in-demand roles through mentorship, practical projects, and dedicated placement support"
      >
        <Link className="page-btn page-btn--primary" to="/enroll">Enroll Now</Link>
        <Link className="page-btn page-btn--ghost" to="/programs">Explore Programs</Link>
      </PageHero>

      <section className="page-section">
        <div className="ps-inner">
          <StaggerGroup className="page-stat-row">
            {stats.slice(0, 4).map(([value, label]) => (
              <StaggerItem className="page-stat" key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      <section className="page-section">
        <div className="ps-inner">
          <SectionHeading label="Who we are" title="A learning platform designed for real careers">
            {/* TODO: Replace with CareerVeda's official story / founding narrative. */}
          </SectionHeading>
          <StaggerGroup className="page-grid">
            {timeline.map(([title, body], i) => (
              <StaggerItem as="article" interactive className="page-card" key={title}>
                <span className="card-index">{String(i + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      <section className="page-section">
        <div className="ps-inner">
          <SectionHeading label="What we value" title="Principles that shape every program">
            The beliefs that guide how we design curricula, mentor learners, and measure success
          </SectionHeading>
          <StaggerGroup className="page-grid">
            {values.map(([icon, title, body]) => (
              <StaggerItem as="article" interactive className="page-card" key={title}>
                <span className="card-icon" aria-hidden="true">{icon}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      <section className="page-section">
        <div className="ps-inner">
          <SectionHeading label="Why learners choose us" title="Everything that makes CareerVeda different">
            A complete learning, mentorship, certification, and placement system built around employability
          </SectionHeading>
          <StaggerGroup className="page-grid" stagger={0.06}>
            {differentiators.slice(0, 6).map(([title, body], i) => (
              <StaggerItem as="article" interactive className="page-card" key={title}>
                <span className="card-index">{String(i + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      <section className="page-section">
        <div className="ps-inner">
          <Reveal className="page-cta">
            <h2>Ready to build a career you're proud of?</h2>
            <p>Talk to a career expert, explore the right program, and start with a free consultation</p>
            <div className="page-hero__actions">
              <Link className="page-btn page-btn--primary" to="/enroll">Enroll Now</Link>
              <Link className="page-btn page-btn--ghost" to="/contact">Contact Us</Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
};

export default AboutPage;
