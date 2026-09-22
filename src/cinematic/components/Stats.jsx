import {useCountUp} from "../fx/hooks";
import {statistics} from "../data";
import {SectionLabel} from "./Atmosphere";

export const StatisticsSection = () => {
  return (
    <section className="ga-stats" id="ga-stats">
      <div className="ga-stats-inner">
        <SectionLabel index="09">Program Statistics</SectionLabel>
        <div className="ga-stats-grid">
          {statistics.map((s) => (
            <StatCell key={s.label} {...s} />
          ))}
        </div>
      </div>
    </section>
  );
};

const StatCell = ({value, suffix, label, note}) => {
  const [ref, display] = useCountUp(value, {duration: 1600});
  return (
    <div className="ga-stat" ref={ref} data-cursor>
      <span className="ga-stat-value">
        {display}
        <span className="ga-stat-suffix">{suffix}</span>
      </span>
      <span className="ga-stat-label">{label}</span>
      <span className="ga-stat-note">{note}</span>
      <span className="ga-stat-rule" aria-hidden="true" />
    </div>
  );
};

export default StatisticsSection;