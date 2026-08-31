import { useEffect, useRef } from "react";
import { differentiators, stats } from "../../data/siteData";
import "./CareerOutcomeSection.css";

const journey = [
  ["01", "LEARN", "Build the right foundation", "Industry-led curriculum, live instruction and structured fundamentals."],
  ["02", "BUILD", "Turn knowledge into proof", "Projects, case studies and portfolio work show what you can do."],
  ["03", "LAUNCH", "Move confidently toward the job", "Mentorship, interview preparation and placement support."],
];

const principles = [
  ["✓", "Outcome Driven", "Programs are built around skills, proof of work and career readiness."],
  ["◎", "Mentor Led", "Learn from experienced professionals with practical industry context."],
  ["↗", "Learn by Doing", "Projects and case studies turn concepts into usable skills."],
  ["✦", "Accessible to Everyone", "Flexible learning and structured support help learners move forward."],
];

const categories = [
  ["Data Analytics", "Turn business questions into data-driven decisions.", "SQL · Python · BI"],
  ["Product Management", "Discover, build and grow digital products.", "Strategy · UX · Agile"],
  ["Data Science + Gen AI", "Build modern AI and data science capability.", "ML · NLP · LLMs"],
  ["Business / Emerging Skills", "Develop practical skills for changing careers.", "Business · Technology · AI"],
];

export default function CareerOutcomeSection() {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const nodes = root.querySelectorAll("[data-reveal]");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
    }), { threshold: 0.12 });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return <section ref={ref} className="career-outcome">
    <div className="co-container co-hero-grid">
      <div data-reveal>
        <span className="co-eyebrow">PRACTICAL LEARNING. REAL CAREERS.</span>
        <h2>Turn ambition into <em>career-ready skills.</em></h2>
        <p className="co-lead">CareerVeda helps you learn by doing — through live instruction, real projects, practical case studies, expert mentorship and structured career support.</p>
        <div className="co-actions"><a className="co-button co-primary" href="/enroll">Start Learning →</a><a className="co-button" href="/programs">Explore Programs</a></div>
      </div>
      <div className="co-dashboard" data-reveal aria-label="Conceptual practical learning interface">
        <div className="co-learning-head"><div><span>PRACTICAL LEARNING</span><small>Learn by building real things</small></div><b><i />72% ACTIVE</b></div>
        <small className="co-micro-label">BUILD → APPLY → IMPROVE</small>
        <div className="co-skills"><strong>Skill Progress</strong>{[["Python",78],["SQL",92],["Product Thinking",74],["Projects",68]].map(([name, progress]) => <div key={name}><span>{name}</span><b>{progress}%</b><em><i style={{ width: `${progress}%` }} /></em></div>)}</div>
        <div className="co-project"><small>REAL PROJECT · PROJECT 04</small><h3>Customer Segmentation Dashboard</h3><span className="co-project-status">In Progress · 3 / 4 milestones</span><div className="co-tasks">{[["✓","Data Cleaning","done"],["✓","SQL Analysis","done"],["●","Dashboard","progress"],["○","Presentation","pending"]].map(([icon, task, status]) => <span className={status} key={task}><b>{icon}</b>{task}</span>)}</div><div className="co-chips"><i>SQL</i><i>Python</i><i>Analytics</i><i>Power BI</i></div></div>
        <aside className="co-float co-float-top"><span>MENTOR FEEDBACK</span><strong>3 suggestions</strong><small>“Add customer-segment insights.”</small></aside>
      </div>
    </div>

    <div className="co-container co-metrics">{stats.concat([["ISO", "Certified Platform"]]).map(([value, label]) => <article data-reveal key={label}><span>◆</span><strong>{value}</strong><small>{label}</small></article>)}</div>

    <div className="co-container co-section"><div className="co-heading" data-reveal><span className="co-eyebrow">WHY CAREERVEDA</span><h2>Education designed around <em>real career outcomes.</em></h2><p>Move from knowledge to confidence, proof of skill and career readiness.</p></div><div className="co-journey">{journey.map(([number, label, title, text]) => <article data-reveal key={number}><b>{number}</b><span>{label}</span><h3>{title}</h3><p>{text}</p></article>)}</div></div>

    <div className="co-container co-engine co-section"><div data-reveal><span className="co-eyebrow">YOUR CAREER ENGINE</span><h2>Everything you need to <em>move forward.</em></h2><p>Learning, projects, mentorship, interview preparation and placement support in one continuous experience.</p></div><div className="co-stack" data-reveal>{["Learning · 82%", "Projects · 12 completed", "Mentorship · 08 sessions", "Placement · Career Ready"].map((item, i) => <div style={{ "--i": i }} key={item}>{item}</div>)}</div></div>

    <div className="co-container co-section"><div className="co-heading" data-reveal><span className="co-eyebrow">WHAT WE VALUE</span><h2>Principles that shape <em>every program.</em></h2></div><div className="co-cards">{principles.map(([icon, title, text]) => <article data-reveal key={title}><b>{icon}</b><h3>{title}</h3><p>{text}</p></article>)}</div></div>

    <div className="co-container co-section"><div className="co-heading" data-reveal><span className="co-eyebrow">CAREERVEDA DIFFERENCE</span><h2>Built for the <em>real world.</em></h2></div><div className="co-difference">{differentiators.map(([title, text], i) => <article className={i === 0 || i === 4 ? "wide" : ""} data-reveal key={title}><b>0{i + 1}</b><h3>{title}</h3><p>{text}</p></article>)}</div></div>

    <div className="co-container co-section"><div className="co-heading" data-reveal><span className="co-eyebrow">PROGRAM ECOSYSTEM</span><h2>Learn what the <em>market needs.</em></h2></div><div className="co-programs">{categories.map(([title, text, skills]) => <article data-reveal key={title}><small>{skills}</small><h3>{title}</h3><p>{text}</p><a href="/programs">Explore →</a></article>)}</div></div>

    <div className="co-container co-final" data-reveal><span className="co-eyebrow">YOUR NEXT CHAPTER STARTS HERE</span><h2>Ready to build a career <em>you're proud of?</em></h2><p>Join thousands of learners and take the next step toward your career goals.</p><a className="co-button co-primary" href="/enroll">Start Your Journey →</a></div>
  </section>;
}
