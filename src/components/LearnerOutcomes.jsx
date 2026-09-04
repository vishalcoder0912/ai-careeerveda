import {cdnImage} from "../lib/imageCdn";
import {useCountUp} from "../hooks/useCountUp";
import {Reveal, StaggerGroup, StaggerItem} from "./motionPrimitives";
import "./learner-outcomes.css";

// Portrait widths rendered at (1x and 2x come from cdnImage): the featured
// learner gets a larger frame than the secondary learners.
const FEATURED_AVATAR_WIDTH = 72;
const AVATAR_WIDTH = 56;

const getInitials = (name) =>
  typeof name === "string"
    ? name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";

// "13,000+" -> 13000 / "+", "86%" -> 86 / "%". Metrics arrive as ready-made
// display strings, so the number is animated with useCountUp and the non-numeric
// suffix is re-attached afterwards.
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

// Pull the company out of a role string that may be written either as
// "Product Manager at Razorpay" or, as the API's adaptAlumni re-joins it,
// "Product Manager, Razorpay". The employer is the segment after the last
// " at " or ", "; the job title is everything before it. Whichever separator
// appears last wins, so a title that itself contains a comma ("Senior, Product
// Owner") still keeps the right company.
const companyOf = (role) => {
  if (typeof role !== "string") return "";
  const at = role.lastIndexOf(" at ");
  const comma = role.lastIndexOf(", ");
  const idx = Math.max(at, comma);
  return idx === -1 ? "" : role.slice(idx + (at > comma ? 4 : 2)).trim();
};

// The job title, with the employer cut off. Mirrors roleTitle's separators so a
// "Role at Company" and a "Role, Company" string both reduce to the title.
const titleOf = (role) => {
  if (typeof role !== "string") return "";
  const at = role.lastIndexOf(" at ");
  const comma = role.lastIndexOf(", ");
  const idx = Math.max(at, comma);
  return idx === -1 ? role.trim() : role.slice(0, idx).trim();
};

// Featured-story selection is by name (not array index), so it stays stable no
// matter what order the API returns the records in. Falls back to the first
// story if the expected learner is absent — never random per render.
const isFeatured = (name) => /anant/i.test(name || "");

// Accent per learner, kept inside the CareerVeda palette. Drives the card's
// chip, the avatar ring and the hover glow for each story.
const accentFor = (name, fallback) => {
  const n = (name || "").toLowerCase();
  if (n.includes("anant")) return "teal";
  if (n.includes("syed")) return "blue";
  if (n.includes("anjali")) return "cyan";
  if (n.includes("himani")) return "teal";
  return fallback;
};

// Stable grid-span key per secondary learner: the asymmetric wall gives each
// known story its own column span, keyed by first name so it survives changes
// to the record's ordering.
const slotKey = (name) => {
  const n = (name || "").toLowerCase();
  if (n.includes("syed")) return "syed";
  if (n.includes("anjali")) return "anjali";
  if (n.includes("himani")) return "himani";
  return "medium";
};

const LearnerAvatar = ({src, name, size, eager}) => {
  const initials = getInitials(name);
  return (
    <span className="learner-avatar" aria-hidden="true">
      {src ? (
        <img
          className="learner-avatar__img"
          src={cdnImage(src, size)}
          alt=""
          width={size}
          height={size}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onError={(event) => {
            event.currentTarget.remove();
          }}
        />
      ) : null}
      {initials}
    </span>
  );
};

const MetricValue = ({value}) => {
  const {numeric, display} = parseMetric(value);
  const {ref, value: count} = useCountUp(numeric);
  return <span className="learner-metric-value" ref={ref}>{display(count)}</span>;
};

const MetricProof = ({metrics}) => (
  <Reveal className="learner-metrics-block">
    <p className="learner-proof-label"></p>
    <dl className="learner-metrics" aria-label="CareerVeda outcome highlights">
      {metrics.slice(0, 3).map(([value, label]) => (
        <div className="learner-metric" key={label}>
          <dt>{label}</dt>
          <dd>
            <MetricValue value={value} />
          </dd>
        </div>
      ))}
    </dl>
  </Reveal>
);

const SecondaryCard = ({story, accent}) => (
  <StaggerItem as="article" className="learner-story learner-story--secondary" data-accent={accent}>
    <div className="learner-story-inner">
      <div className="learner-card-meta">
        <span className="learner-chip">{story.category}</span>
        <span className="learner-quote-mark" aria-hidden="true">&rdquo;</span>
      </div>
      <blockquote className="learner-quote">
        <p>{story.quote}</p>
      </blockquote>
      <footer className="learner-learner">
        <LearnerAvatar src={story.image} name={story.name} size={AVATAR_WIDTH} />
        <span className="learner-learner-copy">
          <strong>{story.name}</strong>
          {story.company ? <small>{story.company}</small> : <small>{story.title}</small>}
        </span>
      </footer>
    </div>
  </StaggerItem>
);

const FeaturedCard = ({story, accent}) => (
  <Reveal className="learner-story learner-story--featured" data-accent={accent}>
    <div className="learner-story-inner">
      <div className="learner-card-meta">
        <span className="learner-chip">{story.category}</span>
        <span className="learner-quote-mark" aria-hidden="true">&rdquo;</span>
      </div>
      <blockquote className="learner-quote">
        <p>{story.quote}</p>
      </blockquote>
      <footer className="learner-learner">
        <LearnerAvatar src={story.image} name={story.name} size={FEATURED_AVATAR_WIDTH} eager />
        <span className="learner-learner-copy">
          <strong>{story.name}</strong>
          {story.company ? <small>{story.company}</small> : <small>{story.title}</small>}
          {story.company ? <em>{story.title}</em> : null}
        </span>
      </footer>
    </div>
  </Reveal>
);

const LearnerOutcomes = ({reviews, stats}) => {
  if (!reviews || reviews.length === 0) return null;

  const stories = reviews.map(([name, role, quote, program, image]) => {
    const title = role ? titleOf(role) : program;
    return {
      name,
      role,
      title,
      company: companyOf(role),
      category: program || title,
      quote,
      image,
      featured: isFeatured(name),
    };
  });

  const featured = stories.find((s) => s.featured) || stories[0];
  const secondary = stories.filter((s) => s !== featured).slice(0, 3);

  return (
    <section className="learner-outcomes" aria-labelledby="learner-outcomes-title">
      <div className="learner-outcomes-inner">
        <header className="learner-header">
          <p className="learner-eyebrow">Learner outcomes</p>
          <h2 id="learner-outcomes-title">
            Career shifts backed by <span className="learner-highlight">real progress</span>
          </h2>
          <p className="learner-lead">
            Learners use practical projects, mentor feedback, and placement preparation
            to move from course work into stronger roles.
          </p>
        </header>

        <div className="learner-wall">
          <MetricProof metrics={stats} />
          <FeaturedCard story={featured} accent={accentFor(featured.name, "teal")} />

          <StaggerGroup className="learner-secondaries" stagger={0.09} amount={0.1}>
            {secondary.map((story) => (
              <div key={story.name} className={`learner-secondary-slot learner-secondary-slot--${slotKey(story.name)}`}>
                <SecondaryCard story={story} accent={accentFor(story.name, "teal")} />
              </div>
            ))}
          </StaggerGroup>
        </div>
      </div>
    </section>
  );
};

export default LearnerOutcomes;
