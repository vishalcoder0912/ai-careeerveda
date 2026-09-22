import {Reveal} from "../motionPrimitives";
import {getSalaryMarket} from "../../data/salaryMarket";

// Round the y-axis to clean, evenly spaced values so the scale reads as a real
// chart rather than three off numbers. Picks the smallest tidy step that keeps
// the tallest bar inside the axis (at most four/five ticks including zero).
const niceStep = (maxLpa) => {
  const raw = maxLpa / 3;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  let step = magnitude;
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (m * magnitude >= raw) {
      step = m * magnitude;
      break;
    }
  }
  return Math.max(1, Math.round(step));
};

const ProgramSalaries = ({program}) => {
  const market = getSalaryMarket(program.id);
  if (!market) return null;

  const maxLpa = Math.max(...market.bands.map((band) => band.high));
  const step = niceStep(maxLpa);
  const plotTop = Math.ceil(maxLpa / step) * step;
  const ticks = [];
  for (let value = 0; value <= plotTop; value += step) ticks.push(value);

  const chartLabel = `${market.role} salary by experience in India: ` + market.bands
    .map((band) => `${band.level} (${band.years}) ₹${band.low}–${band.high} LPA`)
    .join(". ");

  return (
    <section className="pd-section pd-section--alt" id="pd-salaries">
      <div className="pd-inner">
        <Reveal className="pd-heading">
          <p className="pd-eyebrow">Market benchmarks · 2026</p>
          <h2>Salary growth at every stage</h2>
          <p>
            Indicative annual packages in India (LPA) for {market.role} by
            experience, benchmarked against Glassdoor, AmbitionBox, Naukri,
            Levels.fyi and published salary surveys. Actual pay depends on
            company tier, city, negotiation and your skillset.
          </p>
        </Reveal>

        <div className="pd-salary-chart">
          <Reveal className="pd-salary-plot" role="img" aria-label={chartLabel} amount={0.1}>
            {ticks.map((tick) => (
              <div
                className="pd-salary-gridline"
                key={tick}
                style={{bottom: `${(tick / plotTop) * 100}%`}}
              >
                <span>&#8377;{tick} LPA</span>
              </div>
            ))}

            <div className="pd-salary-cols">
              {market.bands.map((band) => {
                const highPct = (band.high / plotTop) * 100;
                const lowInBarPct = (band.low / band.high) * 100;
                return (
                  <div className="pd-salary-col" key={band.level}>
                    <div className="pd-salary-col__bar" style={{height: `${highPct}%`}}>
                      <span
                        className="pd-salary-col__low"
                        style={{bottom: `${lowInBarPct}%`}}
                        aria-hidden="true"
                      />
                    </div>
                    <span className="pd-salary-col__cap">
                      &#8377;{band.low}&ndash;{band.high} LPA
                    </span>
                    <div className="pd-salary-col__foot">
                      <strong>{band.level}</strong>
                      <small>{band.years}</small>
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>

          <p className="pd-salary-note">
            <span className="pd-salary-note__swatch" aria-hidden="true" />
            Each bar shows the full range &mdash; the pill above gives the typical
            low and high annual package in LPA; the white tick marks the low.
          </p>
        </div>

        <Reveal className="pd-salary-industries" amount={0.1}>
          <p className="pd-eyebrow">Who is hiring</p>
          <h3>Industries hiring {market.role} talent</h3>
          <ul className="pd-industry-list">
            {market.industries.map((industry) => (
              <li className="pd-industry" key={industry}>
                {industry}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
};

export default ProgramSalaries;