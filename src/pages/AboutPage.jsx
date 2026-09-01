import { useEffect, useRef, useState } from "react";
import { stats } from "../data/siteData";
import { Reveal, StaggerGroup, StaggerItem } from "../components/motionPrimitives";
import "./AboutPage.css";
import ScrollStack, { ScrollStackItem } from "../components/ScrollStack";
import TextType from "../components/ui/TextType";
import Folder from "../components/ui/Folder";
import CareerVedaWay from "../components/CareerVedaWay";

/* The 5-stage methodology the whole page teaches. */
const journeySteps = [
  {
    number: "01",
    title: "Learn",
    body: "Industry-led curriculum and live instruction build the right foundation.",
    tag: "Live Classes",
  },
  {
    number: "02",
    title: "Practice",
    body: "Real assignments and case studies turn concepts into usable skill.",
    tag: "Hands-On Work",
  },
  {
    number: "03",
    title: "Build",
    body: "Portfolio-ready projects prove you can ship work that matters.",
    tag: "Real Projects",
  },
  {
    number: "04",
    title: "Get Feedback",
    body: "Mentor review and iteration sharpen your craft before it counts.",
    tag: "Mentor Review",
  },
  {
    number: "05",
    title: "Become Career-Ready",
    body: "Interview prep, resume and placement support move you toward the job.",
    tag: "Placement Support",
  },
];

const aboutStats = stats.slice(0, 4).map(([value, label]) => [
  value,
  label === "Successful Learners" ? "Learners Reached" : label,
]);

/* The pain points that pivot into the CareerVeda Way. */
const learningProblems = [
  "No practical experience",
  "Learning in isolation",
  "Limited mentorship",
  "Difficulty getting feedback",
  "Outdated curriculum",
  "No real-world projects",
  "Doubt clearing is slow",
  "Little career direction",
];

const interactiveProblems = learningProblems.map((title, i) => ({
  title,
  short: [
    "Knowing something is different from being able to build with it.",
    "Progress accelerates when learning has context and community.",
    "Without a guide, small gaps become expensive detours.",
    "You need a clear signal about what to improve next.",
    "Work changes quickly; learning should stay close to reality.",
    "Practice becomes capability when it produces something useful.",
    "Momentum fades when questions wait too long.",
    "Skills matter more when they connect to a path forward.",
  ][i],
}));

/* The four connected parts of the CareerVeda learning system. */
const learningJourney = [
  ["LEARN", "Build strong foundations.", "Live instructor-led classes, industry frameworks and fundamentals.", ["● INSTRUCTOR", "LIVE", "NOTES"]],
  ["PRACTICE", "Turn ideas into skill.", "Daily exercises, case studies and problem solving.", ["TODAY'S PRACTICE", "SQL CHALLENGE", "07 / 10"]],
  ["BUILD", "Create proof of work.", "Real-world projects, portfolio work and capstones.", ["✓ DATA PREP", "✓ SQL ANALYSIS", "● DASHBOARD"]],
  ["FEEDBACK", "Improve with direction.", "Mentor reviews, iteration and doubt solving.", ["MENTOR REVIEW", "3 SUGGESTIONS", "ITERATE"]],
  ["CAREER READY", "Move toward the next step.", "Interview preparation, profile building and career support.", ["✓ PORTFOLIO", "✓ INTERVIEW", "✓ COMMUNICATION"]],
];

/* The career engine: everything connects toward one goal. */
const careerEngine = [
  { step: "01", icon: "📚", label: "Learning", note: "skills + fundamentals" },
  { step: "02", icon: "🛠️", label: "Projects", note: "proof of work" },
  { step: "03", icon: "🧭", label: "Mentorship", note: "guidance + feedback" },
  { step: "04", icon: "💼", label: "Portfolio", note: "what you can show" },
  { step: "05", icon: "🎤", label: "Interviews", note: "readiness + prep" },
  { step: "06", icon: "🚀", label: "Career", note: "the outcome" },
];

/* Asymmetric differentiators: the big three get wide cards. */
const differencePrimary = [
  { icon: "🛠️", title: "Hands-On Learning", body: "Build portfolio-ready projects, solve real assignments and work through case studies that mirror workplace problems.", tag: "LEARN BY DOING" },
  { icon: "🧭", title: "Expert Mentorship", body: "Personalized guidance from 200+ professionals through live sessions, doubt clearing, feedback and career planning.", tag: "MENTOR LED" },
  { icon: "🚀", title: "Career Support", body: "Resume support, LinkedIn optimization, mock interviews, soft-skills training, referrals and hiring partners.", tag: "CAREER READY" },
];

const differenceSecondary = [
  { icon: "🎓", title: "Industry-Aligned Curriculum", body: "Tools, workflows and skills employers actively seek." },
  { icon: "🏅", title: "Recognized Certifications", body: "Document your learning with credentials that add credibility to your professional profile." },
  { icon: "🌐", title: "Global Certification", body: "Industry-validated credentials that stand out with employers." },
  { icon: "♾️", title: "Lifetime Support", body: "Job alerts, alumni networking and upskilling beyond graduation." },
  { icon: "🗓️", title: "Flexible Schedule", body: "Weekday or weekend batches, recordings and resources." },
  { icon: "📊", title: "Industry Case Studies", body: "Business challenges that build decision-making confidence." },
];

const whoWeAre = [
  {
    number: "01",
    title: "Our Mission",
    body: "Make learning practical, accessible and connected to career readiness.",
    icon: "◎",
  },
  {
    number: "02",
    title: "What We Do",
    body: "Teach by doing — live instruction, real projects and mentorship across analytics, product, data and AI.",
    icon: "▤",
  },
  {
    number: "03",
    title: "How We Help",
    body: "Connect learning to outcomes: portfolios, interviews and placements that move careers forward.",
    icon: "↗",
  },
];

const principles = [
  { icon: "🎯", title: "Outcome Driven", body: "Programs built around skills, proof of work and career readiness.", tone: "teal" },
  { icon: "🧑‍🏫", title: "Mentor Led", body: "Learn from experienced professionals with practical context.", tone: "blue" },
  { icon: "🔨", title: "Learn by Doing", body: "Projects and case studies turn concepts into usable skill.", tone: "cyan" },
  { icon: "🌍", title: "Accessible to Everyone", body: "Flexible learning and structured support help learners move forward.", tone: "mint" },
];

const heroSkills = [
  ["SQL", 92, "four"],
  ["Python", 78, "three"],
  ["Product Thinking", 74, "three"],
  ["Projects", 68, "two"],
];

const heroTasks = [
  ["✓", "Data preparation", "done"],
  ["✓", "SQL analysis", "done"],
  ["●", "Dashboard", "progress"],
  ["○", "Final presentation", "pending"],
];

/* Renders a centered section heading. A `*…*` span inside the title string is
   emphasised in the CareerVeda teal, matching the hero. */
const sectionHeading = (eyebrow, title, sub) => {
  const parts = title.split("*");
  return (
    <div className="about-heading">
      <span className="about-eyebrow">{eyebrow}</span>
      <h2>
        {parts.map((part, i) =>
          i % 2 === 1 ? <em key={i}>{part}</em> : <span key={i}>{part}</span>,
        )}
      </h2>
      {sub ? <p className="about-sub">{sub}</p> : null}
    </div>
  );
};

export default function AboutPage() {
  const rootRef = useRef(null);
  const [activeProblem, setActiveProblem] = useState(0);
  const [visibleJourneyCards, setVisibleJourneyCards] = useState(0);
  const revealTimers = useRef([]);
  const revealJourney = (open) => {
    revealTimers.current.forEach(clearTimeout);
    if (!open) return setVisibleJourneyCards(0);
    revealTimers.current = learningJourney.map((_, i) => setTimeout(() => setVisibleJourneyCards(i + 1), i * 120));
  };
  useEffect(() => () => revealTimers.current.forEach(clearTimeout), []);
  const [problemPositions, setProblemPositions] = useState([
    [6, 8], [0, 40], [10, 76], [76, 2], [80, 40], [76, 76], [28, 22], [52, 66],
  ]);

  const dragProblem = (index, event) => {
    const orbit = event.currentTarget.parentElement;
    const rect = orbit.getBoundingClientRect();
    const x = Math.max(0, Math.min(82, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(86, ((event.clientY - rect.top) / rect.height) * 100));
    setProblemPositions((positions) => positions.map((position, i) => i === index ? [x, y] : position));
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const nodes = root.querySelectorAll("[data-reveal]");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.12 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <main ref={rootRef} className="spline-page page-shell">
      <div className="about-page">

        {/* ── 1. Centered EdTech hero ─────────────────────────────────────── */}
        <section className="about-hero">
          <div className="about-wrap about-hero-copy">
            <Reveal as="div" className="about-hero-inner">
              <span className="about-eyebrow">ABOUT CAREERVEDA</span>
              <h1>
                <span className="about-h1-sr">Building Careers, Not Just Courses.</span>
                <span className="about-h1-visible" aria-hidden="true">
                  <span className="about-h1-fixed">Building Careers, Not Just</span>
                  <br />
                  <em className="about-h1-moving">
                    <TextType
                      text={[
                        "courses.",
                        "projects.",
                        "career skills.",
                      ]}
                      as="span"
                      typingSpeed={70}
                      deletingSpeed={35}
                      pauseDuration={1700}
                      showCursor
                      hideCursorWhileTyping
                      cursorCharacter="|"
                      className="about-typed"
                    />
                  </em>
                </span>
              </h1>
              <p className="about-lead">
                CareerVeda helps you learn by doing — through live instruction,
                real projects, practical case studies, expert mentorship and
                structured career support.
              </p>
              <div className="about-actions">
                <a className="about-btn about-btn-primary" href="/enroll">
                  Explore Our Programs →
                </a>
                <a className="about-btn" href="/programs">
                  Meet Our Approach
                </a>
              </div>
            </Reveal>
          </div>

          <div className="about-wrap">
            <Reveal as="div" className="about-learn-sys" amount={0.1}>
              <span className="about-learn-sys-title">CAREER LEARNING SYSTEM</span>

              <div className="about-learn-panel">
                <div className="about-learn-panel-head">
                  <div>
                    <strong>Practical Learning</strong>
                    <small>Learn by building real things</small>
                  </div>
                  <b><i />72% ACTIVE</b>
                </div>

                <label className="about-micro-label">BUILD → APPLY → IMPROVE</label>

                <div className="about-skills">
                  <strong>Skill Progress</strong>
                  {heroSkills.map(([name, progress, tier]) => (
                    <div className="about-skill" key={name}>
                      <span>{name}</span>
                      <b>{progress}%</b>
                      <em className={tier}><i style={{ width: `${progress}%` }} /></em>
                    </div>
                  ))}
                </div>

                <div className="about-project">
                  <small>REAL PROJECT · PROJECT 04</small>
                  <h3>Customer Segmentation Dashboard</h3>
                  <span className="about-project-status">In Progress · 3 / 4 milestones</span>
                  <div className="about-tasks">
                    {heroTasks.map(([icon, task, status]) => (
                      <span className={status} key={task}>
                        <b>{icon}</b>{task}
                      </span>
                    ))}
                  </div>
                  <div className="about-chips">
                    <i>SQL</i><i>Python</i><i>Analytics</i><i>Power BI</i>
                  </div>
                </div>
              </div>

              <span className="about-float about-float-live">LIVE CLASS</span>
              <span className="about-float about-float-project">PROJECT</span>
              <span className="about-float about-float-feedback">MENTOR FEEDBACK</span>
              <span className="about-float about-float-portfolio">PORTFOLIO</span>
            </Reveal>
          </div>
        </section>

        {/* ── 2. How CareerVeda works — the journey ───────────────────────── */}
        <section className="about-section about-journey-section">
          <div className="about-wrap">
            <Reveal>
              {sectionHeading(
                "CAREER JOURNEY",
                "From learning to *opportunity.*",
                "Career development is a journey, not a single course.",
              )}
            </Reveal>

            <div className="about-journey" data-reveal>
              {journeySteps.map((step, i) => (
                <div className="about-journey-step" key={step.title} style={{ "--step": i }}>
                  <div className="about-journey-row">
                    <article className="about-journey-card">
                      <b>{step.number}</b>
                      <h3>{step.title}</h3>
                      <p>{step.body}</p>
                      <small>{step.tag}</small>
                    </article>
                    {i < journeySteps.length - 1 && <span className="about-connector" />}
                  </div>
                  <span className="about-journey-line" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. Why traditional learning falls short ────────────────────── */}
        <section className="about-section about-problems-section" style={{ display: "none" }}>
          <div className="about-wrap">
            <Reveal>
              {sectionHeading(
                "THE GAP",
                "Why traditional learning *falls short.*",
                "Most courses stop at content. Careers are built on practice, feedback and direction.",
              )}
            </Reveal>

            <div className="about-problem-map" data-reveal>
              <div className="about-problem-orbit">
                {interactiveProblems.map((problem, i) => <button className={`about-problem-node node-${i + 1}${activeProblem === i ? " is-active" : ""}`} style={{ left: `${problemPositions[i][0]}%`, top: `${problemPositions[i][1]}%` }} key={problem.title} onMouseEnter={() => setActiveProblem(i)} onFocus={() => setActiveProblem(i)} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setActiveProblem(i); }} onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) dragProblem(i, event); }}><strong>{problem.title}</strong><small>{activeProblem === i ? problem.short : "Drag to explore"}</small></button>)}
                <div className="about-problem-core"><span>CONTENT<br />IS ONLY<br /><em>THE START.</em></span><small>Practice creates capability.</small></div>
              </div>
              <div className="about-problem-status"><b>{String(activeProblem + 1).padStart(2, "0")} / 08</b><span>{interactiveProblems[activeProblem].title}</span></div>
            </div>
            <div className="about-pill-field" aria-hidden="true">
              <span className="about-pill-core">LEARNING</span>
              <div className="about-pills">
                {learningProblems.slice(0, 4).map((p) => (
                  <span className="about-pill" key={p}>{p}</span>
                ))}
              </div>
              <div className="about-pills about-pills-bottom">
                {learningProblems.slice(4).map((p) => (
                  <span className="about-pill" key={p}>{p}</span>
                ))}
              </div>
            </div>

            <Reveal className="about-pivot" amount={0.15}>
              <div className="about-pivot-line" />
              <div className="about-pivot-pair">
                <span className="about-pivot-from">PASSIVE LEARNING</span>
                <span className="about-pivot-divider">→</span>
                <span className="about-pivot-to">ACTIVE CAREER LEARNING</span>
              </div>
              <span className="about-eyebrow about-pivot-eyebrow">THE CAREERVEDA WAY</span>
            </Reveal>
          </div>
        </section>

        {/* ── 4. The CareerVeda Way — four learning-system cards ─────────── */}
        <CareerVedaWay />
        <section className="about-section about-way-section" style={{ display: "none" }}>
          <div className="about-wrap">
            <Reveal>
              {sectionHeading(
                "THE CAREERVEDA WAY",
                "Four parts of *one learning system.*",
                "Learning, projects, mentorship and career support in one continuous experience.",
              )}
            </Reveal>

            <div className="career-way-folder-hub">
              <Folder
                size={2.2}
                color="#16D4D0"
                className="about-way-folder"
                items={["LEARN", "PRACTICE", "BUILD"].map(label => <span className="about-way-folder-item" key={label}>{label}</span>)}
                onOpenChange={revealJourney}
              />
              <span>OPEN THE CAREER SYSTEM</span>
            </div>

            <ScrollStack className="about-way-stack" itemDistance={70} itemStackDistance={24} baseScale={0.94} itemScale={0.015}>
              {learningJourney.map(([stage, title, body, papers], i) => <ScrollStackItem itemClassName={`about-way-card ${i < visibleJourneyCards || i === 0 ? "is-revealed" : ""}`} key={stage}><span className="about-way-number">0{i + 1}</span><span className="about-way-stage">{stage}</span><h3>{title}</h3><p>{body}</p><div className="about-way-visual"><Folder size={1.4} color={["#14b8a6", "#2563eb", "#0891b2", "#0d9488"][i]} className="about-way-folder" items={papers.map((label) => <span className="about-way-folder-item">{label}</span>)} onOpenChange={revealJourney} /></div></ScrollStackItem>)}
            </ScrollStack>
          </div>
        </section>

        {/* ── 5. Proof — the numbers behind the platform ─────────────────── */}
        <section className="about-section about-proof-section">
          <div className="about-wrap">
            <Reveal>
              {sectionHeading(
                "OUR IMPACT",
                "Built around *learner progress.*",
              )}
            </Reveal>

            <div className="about-proof-rail" data-reveal>
              {aboutStats.map(([value, label]) => (
                <div className="about-proof-cell" key={label}>
                  <strong>{value}</strong>
                  <small>{label.toUpperCase()}</small>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 6. Who we are — mission / do / help as one system ──────────── */}
        <section className="about-section about-who-section">
          <div className="about-wrap">
            <Reveal>
              {sectionHeading(
                "OUR MISSION",
                "Make learning more meaningful. *Make careers more possible.*",
                "We connect structured learning with practical experience and career direction.",
              )}
            </Reveal>

            <StaggerGroup className="about-who-grid" stagger={0.08}>
              {whoWeAre.map((item, i) => (
                <StaggerItem as="article" className="about-who-card" key={item.title}>
                  <div className="about-who-flow">
                    <span className="about-who-icon">{item.icon}</span>
                    {i < whoWeAre.length - 1 && <span className="about-who-flow-line" />}
                  </div>
                  <b>{item.number}</b>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </section>

        {/* ── 7. What we value — four principles ─────────────────────────── */}
        <section className="about-section about-value-section">
          <div className="about-wrap">
            <Reveal>
              {sectionHeading(
                "WHAT WE VALUE",
                "Principles That Shape *Every Program.*",
              )}
            </Reveal>

            <StaggerGroup className="about-value-grid" stagger={0.08}>
              {principles.map((p) => (
                <StaggerItem as="article" className={`about-value-card tone-${p.tone}`} key={p.title}>
                  <span className="about-value-icon">{p.icon}</span>
                  <h3>{p.title}</h3>
                  <p>{p.body}</p>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </section>

        {/* ── 8. Career Engine — the signature vertical timeline ─────────── */}
        <section className="about-section about-engine-section">
          <div className="about-wrap">
            <Reveal>
              {sectionHeading(
                "CAREER ENGINE",
                "From learning to *opportunity.*",
                "Learning → projects → mentorship → portfolio → interviews → career.",
              )}
            </Reveal>

            <div className="about-engine" data-reveal>
              {careerEngine.map((item, i) => (
                <div className="about-engine-item" key={item.label} style={{ "--i": i }}>
                  <span className="about-engine-dot" />
                  <div className="about-engine-card">
                    <b>{item.step}</b>
                    <span aria-hidden="true">{item.icon}</span>
                    <h3>{item.label}</h3>
                    <small>{item.note}</small>
                  </div>
                  {i < careerEngine.length - 1 && <span className="about-engine-connector" />}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 9. Everything that makes us different ──────────────────────── */}
        <section className="about-section about-difference-section">
          <div className="about-wrap">
            <Reveal>
              {sectionHeading(
                "EVERYTHING THAT MAKES US DIFFERENT",
                "More Than Courses. *A Career Development Experience.*",
              )}
            </Reveal>

            <Reveal className="about-diff-primary" amount={0.1}>
              {differencePrimary.map((d) => (
                <article className="about-diff-card about-diff-wide" key={d.title}>
                  <span className="about-diff-icon" aria-hidden="true">{d.icon}</span>
                  <span className="about-diff-tag">{d.tag}</span>
                  <h3>{d.title}</h3>
                  <p>{d.body}</p>
                </article>
              ))}
            </Reveal>

            <div className="about-diff-secondary" data-reveal>
              {differenceSecondary.map((d) => (
                <article className="about-diff-card" key={d.title}>
                  <span className="about-diff-icon" aria-hidden="true">{d.icon}</span>
                  <h3>{d.title}</h3>
                  <p>{d.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── 10. Final CTA — the culmination ────────────────────────────── */}
        <section className="about-section about-final">
          <div className="about-wrap">
            <Reveal className="about-final-inner">
              <span className="about-eyebrow">YOUR NEXT STEP</span>
              <h2>Ready to build something <em>real?</em></h2>
              <p>
                Start learning, build practical experience, and take your next step toward a stronger career.
              </p>
              <div className="about-actions">
                <a className="about-btn about-btn-primary" href="/enroll">
                  Start Your Journey →
                </a>
                <a className="about-btn" href="/programs">
                  Explore Programs
                </a>
              </div>
            </Reveal>
          </div>
        </section>

      </div>
    </main>
  );
}
