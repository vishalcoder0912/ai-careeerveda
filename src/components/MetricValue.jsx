import {useCountUp} from "../hooks/useCountUp";

// Animated stat value. Metrics arrive as ready-made display strings ("13,000+",
// "86%", "10,000+"), so useCountUp animates the numeric core and the non-numeric
// suffix/prefix is re-attached — exactly the pattern LearnerOutcomes already
// uses, shared here so every count-up on the site reads the same way.
const parseMetric = (value) => {
  const text = String(value ?? "");
  const match = text.match(/[\d,.]+/);
  const numeric = match ? Number(match[0].replace(/,/g, "")) : 0;
  const suffix = match ? text.slice(match[0].length).trim() : text;
  const display = match
    ? (val) => `${Number(val).toLocaleString("en-US")}${suffix}`
    : () => text;
  return {numeric, display};
};

const MetricValue = ({value, className}) => {
  const {numeric, display} = parseMetric(value);
  const {ref, value: count} = useCountUp(numeric);
  const cls = className ? ` ${className}` : "";
  return (
    <span className={`metric-value${cls}`} ref={ref}>
      {display(count)}
    </span>
  );
};

export default MetricValue;