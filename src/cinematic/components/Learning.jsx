import {useParallax} from "../fx/hooks";
import {learningPillars} from "../data";
import {SectionLabel} from "./Atmosphere";

export const LearningExperience = () => {
  const gridPar = useParallax(-0.02);

  return (
    <section className="ga-learning" id="ga-learning">
      <div className="ga-learning-head">
        <SectionLabel index="11">The Experience</SectionLabel>
        <h2 className="ga-display">
          Learn.
          <br />
          Create. Achieve.
        </h2>
      </div>

      <div className="ga-learning-grid" ref={gridPar}>
        {learningPillars.map((p, i) => (
          <div
            className="ga-learning-card ga-reveal ga-reveal-up"
            key={p.title}
            data-cursor
            style={{transitionDelay: `${(i % 4) * 70}ms`}}
          >
            <p.icon className="ga-learning-icon" size={21} strokeWidth={1.4} aria-hidden="true" />
            <h3>{p.title}</h3>
            <p>{p.note}</p>
            <span className="ga-learning-index">{String(i + 1).padStart(2, "0")}</span>
            <span className="ga-learning-sweep" aria-hidden="true" />
          </div>
        ))}
      </div>
    </section>
  );
};

export default LearningExperience;