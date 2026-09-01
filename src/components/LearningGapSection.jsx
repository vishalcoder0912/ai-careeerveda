import { useState } from "react";
import "./LearningGapSection.css";
import "./learning-gap-transparent.css";

const gaps = [
  ["Learning in isolation", "You’re trying to figure everything out alone.", "Where do I start?", "isolation"],
  ["Too much theory", "You understand concepts but struggle to turn them into skills.", "Now what?", "theory"],
  ["No clear direction", "You don’t know what to learn next or what actually matters.", "What's next?", "direction"],
  ["Hard to stay consistent", "Motivation fades when progress feels invisible.", "Still stuck.", "consistent"],
  ["No meaningful feedback", "You build things but don’t know what to improve.", "Am I doing this right?", "feedback"],
  ["Outdated learning", "What you learn doesn’t always match the real world.", "Reality check", "outdated"],
  ["Hard to apply knowledge", "Knowing something is different from being able to use it.", "Theory ≠ skill", "apply"],
  ["Starting but not finishing", "You start with energy, then lose momentum halfway.", "Momentum lost", "finish"],
];

export default function LearningGapSection() {
  const [active, setActive] = useState(null);
  return <section className="learning-gap-section" aria-labelledby="learning-reality-title">
    <header className="learning-gap-header"><span className="about-eyebrow">THE REALITY</span><h2 id="learning-reality-title">Why learning often <em>feels frustrating</em></h2><p>It’s not a lack of effort. The way most learning is designed makes progress harder than it needs to be.</p></header>
    <div className="learning-map" aria-label="Common obstacles in a learner's journey">
      <svg className="learning-map-lines" viewBox="0 0 1000 570" aria-hidden="true"><path d="M105 120 C260 40 320 170 445 245"/><path d="M555 245 C680 155 750 100 900 145"/><path d="M130 430 C280 510 350 390 445 325"/><path d="M555 325 C690 400 760 465 900 405"/></svg>
      <div className="learning-map-path"><span>START</span><i>→</i><span>LEARN</span><i>→</i><b>GET STUCK</b><i>→</i><span>LOSE MOMENTUM</span></div>
      {gaps.map(([title, text, note, position], i) => <button className={`learning-gap-card card-${position}${active === i ? " is-active" : ""}`} key={title} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onClick={() => setActive(i)}><small>{note}</small><strong>{title}</strong><span>{text}</span></button>)}
    </div>
    <div className="learning-gap-conclusion"><p>These gaps aren’t caused by a lack of effort.</p><strong>THE LEARNING EXPERIENCE IS THE PROBLEM.</strong></div>
  </section>;
}
