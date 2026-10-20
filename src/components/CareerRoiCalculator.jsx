import {useId, useState} from "react";
import {Link} from "react-router-dom";
import {getSalaryMarket} from "../data/salaryMarket";
import "./career-roi-calculator.css";

// The four tracks the calculator covers. `id` is the program slug, which is
// also the key into salaryMarket.js and the /programs/:id URL.
//
// hikeLow/hikeHigh are the advertised salary-hike range for each track, in
// percent. Edit them here when the placement numbers change.
export const ROI_TRACKS = [
  {id: "product-management", label: "Product Management", hikeLow: 70, hikeHigh: 120},
  {id: "gen-ai-agentic-ai", label: "Gen AI & Agentic AI", hikeLow: 80, hikeHigh: 140},
  {id: "business-analytics", label: "Business Analytics with Gen AI", hikeLow: 45, hikeHigh: 65},
  {id: "data-analytics", label: "Data Analytics with Gen AI", hikeLow: 60, hikeHigh: 90},
];

const MIN_CTC = 1;
const MAX_CTC = 60;

// Projected CTC range in LPA. The hike is capped at the top of the track's
// market band (salaryMarket.js), so a senior salary is never projected past
// what the role actually pays — and never projected below what they earn now.
export const projectCtc = (ctc, track) => {
  const market = getSalaryMarket(track.id);
  const marketTop = Math.max(...market.bands.map((band) => band.high));
  const ceiling = Math.max(ctc, marketTop);
  const low = Math.min(ctc * (1 + track.hikeLow / 100), ceiling);
  const high = Math.min(ctc * (1 + track.hikeHigh / 100), ceiling);
  return {low, high, marketTop, capped: high === ceiling && ceiling > ctc, role: market.role};
};

const lpa = (value) => `₹${Number(value.toFixed(1))} LPA`;

const ISSUED = new Date()
  .toLocaleDateString("en-GB", {day: "2-digit", month: "short", year: "numeric"})
  .toUpperCase();

const CareerRoiCalculator = () => {
  // The box keeps what was typed (so it can be cleared and retyped); the
  // number used everywhere else is that text clamped to the slider's range.
  const [text, setText] = useState("6");
  const ctc = Math.min(Math.max(Number(text) || MIN_CTC, MIN_CTC), MAX_CTC);
  const [trackId, setTrackId] = useState(ROI_TRACKS[0].id);
  const [shown, setShown] = useState(false);
  const titleId = useId();

  const track = ROI_TRACKS.find((entry) => entry.id === trackId);
  const result = projectCtc(ctc, track);
  // Bars are drawn against the larger of the two numbers, so both always fit.
  const scale = Math.max(result.high, ctc);

  return (
    <section className="roi-section" aria-labelledby={titleId}>
      <div className="roi-copy">
        <span className="roi-eyebrow">Career ROI Calculator</span>
        <h2 id={titleId}>
          See what your next career move could be <span>worth.</span>
        </h2>
        <p>
          Explore the potential career growth with CareerVeda programs. Enter your
          current CTC and pick a track to see your projected salary.
        </p>
      </div>

      <form
        className="roi-card"
        onSubmit={(event) => {
          event.preventDefault();
          setShown(true);
        }}
      >
        <header className="roi-card__head">
          <span>CTC statement</span>
          <span>Issued: {ISSUED}</span>
        </header>

        <label className="roi-ctc">
          <span className="roi-label">Current annual CTC</span>
          <span className="roi-ctc__value">
            <input
              type="number"
              inputMode="decimal"
              min={MIN_CTC}
              max={MAX_CTC}
              step="0.5"
              value={text}
              onChange={(event) => setText(event.target.value)}
              onBlur={() => setText(String(ctc))}
              aria-label="Current annual CTC in lakhs per annum"
            />
            <span>LPA</span>
          </span>
        </label>
        <input
          className="roi-range"
          type="range"
          min={MIN_CTC}
          max={MAX_CTC}
          step="0.5"
          value={ctc}
          onChange={(event) => setText(event.target.value)}
          aria-label="Current annual CTC slider"
          style={{"--fill": `${((ctc - MIN_CTC) / (MAX_CTC - MIN_CTC)) * 100}%`}}
        />
        <div className="roi-range__ticks" aria-hidden="true">
          <span>₹1 LPA</span>
          <span>₹30 LPA</span>
          <span>₹60 LPA</span>
        </div>

        <fieldset className="roi-tracks">
          <legend className="roi-label">Select program track</legend>
          {ROI_TRACKS.map((entry) => (
            <label key={entry.id} className="roi-track">
              <input
                type="radio"
                name="roi-track"
                value={entry.id}
                checked={entry.id === trackId}
                onChange={() => setTrackId(entry.id)}
              />
              <span className="roi-track__body">
                <span>{entry.label}</span>
                <small>{entry.hikeLow}–{entry.hikeHigh}% hike</small>
              </span>
            </label>
          ))}
        </fieldset>

        {shown ? (
          <div className="roi-result" role="status" aria-live="polite">
            <span className="roi-label">Projected CTC after {track.label}</span>
            <strong className="roi-result__value">
              {lpa(result.low)} – {lpa(result.high)}
            </strong>
            <span className="roi-result__gain">
              +{lpa(result.low - ctc)} to +{lpa(result.high - ctc)} a year
            </span>

            <div className="roi-bars" aria-hidden="true">
              <div className="roi-bar">
                <span>Today</span>
                <i style={{"--w": `${(ctc / scale) * 100}%`}} />
                <b>{lpa(ctc)}</b>
              </div>
              <div className="roi-bar roi-bar--next">
                <span>Projected</span>
                <i style={{"--w": `${(result.high / scale) * 100}%`}} />
                <b>{lpa(result.high)}</b>
              </div>
            </div>

            <p className="roi-note">
              {result.capped
                ? `Capped at the ${lpa(result.marketTop)} top of the market for ${result.role} roles. `
                : `Market range for ${result.role}: up to ${lpa(result.marketTop)}. `}
              Indicative only — actual offers depend on your experience, skills and the hiring company.
            </p>

            <div className="roi-actions">
              <Link className="roi-btn" to={`/programs/${track.id}`}>Explore the program</Link>
              <Link className="roi-btn roi-btn--ghost" to="/enroll">Talk to a counsellor</Link>
            </div>
          </div>
        ) : (
          <button type="submit" className="roi-btn roi-btn--wide">
            Calculate my projection <span aria-hidden="true">›</span>
          </button>
        )}
      </form>
    </section>
  );
};

export default CareerRoiCalculator;
