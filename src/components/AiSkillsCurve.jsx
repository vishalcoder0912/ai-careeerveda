import {useId, useState} from "react";
import {skillsCurveData} from "../data/skillsCurve";
import "./ai-skills-curve.css";

const lpa = (value) => `₹${Number(value.toFixed(1))} LPA`;

const AiSkillsCurve = () => {
  const rows = skillsCurveData();
  const [active, setActive] = useState(null);
  const titleId = useId();

  // Clean 10-LPA ticks up to just past the largest value.
  const axisMax = Math.ceil(Math.max(...rows.map((row) => row.upskilled)) / 10) * 10;
  const ticks = Array.from({length: axisMax / 10 + 1}, (_, index) => index * 10);
  const pct = (value) => `${(value / axisMax) * 100}%`;

  return (
    <section className="skills-curve" aria-labelledby={titleId}>
      <header className="skills-curve__head">
        <span className="skills-curve__eyebrow">AI skills premium</span>
        <h2 id={titleId}>
          The AI skills curve is <span>accelerating</span>
        </h2>
        <p>
          Traditional workflows are rapidly evolving. Mastering AI, data analytics and
          automation is the ultimate edge for modern professionals.
        </p>
      </header>

      <figure className="skills-curve__card">
        <figcaption className="skills-curve__caption">
          <span>Mid-level annual pay in India (3–6 years), ₹ LPA</span>
          <span className="skills-curve__legend">
            <span><i className="is-average" aria-hidden="true" />Average</span>
            <span><i className="is-upskilled" aria-hidden="true" />AI-upskilled</span>
          </span>
        </figcaption>

        <div className="skills-curve__plot" aria-hidden="true">
          <div className="skills-curve__grid">
            {ticks.map((tick) => (
              <span key={tick} style={{left: pct(tick)}}><em>{tick}</em></span>
            ))}
          </div>

          {rows.map((row) => {
            const uplift = Math.round(((row.upskilled - row.average) / row.average) * 100);
            return (
              <div
                key={row.id}
                className={`skills-curve__row${active === row.id ? " is-active" : ""}`}
                onMouseEnter={() => setActive(row.id)}
                onMouseLeave={() => setActive(null)}
              >
                <span className="skills-curve__label">{row.label}</span>
                <div className="skills-curve__bars">
                  <div className="skills-curve__bar is-average" style={{"--w": pct(row.average)}}>
                    <b>{lpa(row.average)}</b>
                  </div>
                  <div className="skills-curve__bar is-upskilled" style={{"--w": pct(row.upskilled)}}>
                    <b>{lpa(row.upskilled)}</b>
                  </div>
                  {active === row.id ? (
                    <div className="skills-curve__tip" style={{left: pct(row.upskilled)}}>
                      <strong>{row.label}</strong>
                      <span><i className="is-average" />Average {lpa(row.average)}</span>
                      <span><i className="is-upskilled" />AI-upskilled {lpa(row.upskilled)}</span>
                      <em>+{uplift}% with AI skills</em>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* The same numbers for screen readers — the bars above are hidden from them. */}
        <table className="visually-hidden">
          <caption>Mid-level annual pay in India by role, in lakhs per annum</caption>
          <thead>
            <tr>
              <th scope="col">Role</th>
              <th scope="col">Average</th>
              <th scope="col">AI-upskilled</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <th scope="row">{row.label}</th>
                <td>{lpa(row.average)}</td>
                <td>{lpa(row.upskilled)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="skills-curve__note">
          Indicative benchmarks compiled from Glassdoor, AmbitionBox, Naukri and published
          salary surveys. Average is the middle of the mid-level band; AI-upskilled is its top.
        </p>
      </figure>
    </section>
  );
};

export default AiSkillsCurve;
