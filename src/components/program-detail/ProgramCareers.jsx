import {useEffect, useState, useRef} from "react";
import {Link} from "react-router-dom";
import {Reveal, StaggerGroup, StaggerItem} from "../motionPrimitives";
import {useContentList} from "../../hooks/useContent";
import {adaptAlumniReview} from "../../lib/contentAdapters";
import {matchJobs} from "./jobTracks";
import {careerStats, careerReviews} from "./careerOutcomes";
import MetricValue from "../MetricValue";

const AUTOCYCLE_MS = 6000;

const MATCH_RE = (program) => {
  const name = (program.category || program.title || "").toLowerCase();
  return (entry) => {
    const entryName = String(entry[3] || "").toLowerCase();
    return entryName && (name.includes(entryName) || entryName.includes(name));
  };
};

const TestimonialCarousel = ({items}) => {
  const [idx, setIdx] = useState(0);
  const [brokenPhotos, setBrokenPhotos] = useState(() => new Set());
  const timer = useRef(null);
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reducedMotion || items.length <= 1) return undefined;
    timer.current = setInterval(() => {
      setIdx((i) => (i + 1) % items.length);
    }, AUTOCYCLE_MS);
    return () => clearInterval(timer.current);
  }, [items.length, reducedMotion]);

  const [name, role, quote, , photo] = items[idx] || [];
  const initials = String(name || "")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const photoBroken = !photo || brokenPhotos.has(photo);

  return (
    <figure className="pd-proof" aria-roledescription="carousel">
      <figcaption className="pd-proof__sr">Testimonials from successful learners</figcaption>
      <blockquote className="pd-proof__quote">
        <span aria-hidden="true" className="pd-proof__mark">&ldquo;</span>
        <p>{quote}</p>
      </blockquote>

      <div className="pd-proof__meta">
        {photoBroken ? (
          <span className="pd-proof__avatar pd-proof__avatar--mono" aria-hidden="true">
            {initials}
          </span>
        ) : (
          <img
            src={photo}
            alt=""
            width={44}
            height={44}
            loading="lazy"
            decoding="async"
            draggable="false"
            onError={() => setBrokenPhotos((prev) => new Set(prev).add(photo))}
            className="pd-proof__avatar"
          />
        )}
        <div>
          <strong className="pd-proof__name">{name}</strong>
          <small className="pd-proof__role">{role}</small>
        </div>
      </div>

      {items.length > 1 && (
        <div className="pd-proof__controls">
          <button
            type="button"
            className="pd-carousel-btn"
            aria-label="Previous testimonial"
            onClick={() => {
              setIdx((i) => (i - 1 + items.length) % items.length);
              clearInterval(timer.current);
            }}
          >
            ‹
          </button>
          <span className="pd-proof__dots" role="list">
            {items.map((_, i) => (
              <button
                type="button"
                key={i}
                role="listitem"
                aria-label={`Go to testimonial ${i + 1}`}
                className={`pd-dot${i === idx ? " pd-dot--active" : ""}`}
                onClick={() => {
                  setIdx(i);
                  clearInterval(timer.current);
                }}
              />
            ))}
          </span>
          <button
            type="button"
            className="pd-carousel-btn"
            aria-label="Next testimonial"
            onClick={() => {
              setIdx((i) => (i + 1) % items.length);
              clearInterval(timer.current);
            }}
          >
            ›
          </button>
        </div>
      )}
    </figure>
  );
};

const JobCard = ({job}) => (
  <li className="pd-job">
    <div className="pd-job__head">
      <h4 className="pd-job__title">{job.title}</h4>
      <span className="pd-job__company">{job.company}</span>
    </div>
    <p className="pd-job__meta">
      <span>{job.experience}</span>
      <span aria-hidden="true">·</span>
      <span>{job.location}</span>
      {job.salary && (
        <>
          <span aria-hidden="true">·</span>
          <span className="pd-job__salary">{job.salary}</span>
        </>
      )}
    </p>
    {job.skills?.length > 0 && (
      <ul className="pd-job__skills" aria-label="Key skills">
        {job.skills.slice(0, 3).map((skill) => (
          <li key={skill}>{skill}</li>
        ))}
      </ul>
    )}
    <a
      className="pd-btn pd-btn--ghost pd-btn--sm"
      href={job.applyUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      Apply on LinkedIn ↗
    </a>
  </li>
);

const ProgramCareers = ({program}) => {
  const outcomes = program.outcomes || [];

  // Only alumni the admin has approved (published + "Show in program Career
  // Outcomes" ticked) feed this carousel. The static `reviews` list stands in
  // until the API answers — and forever when it cannot be reached — so the
  // section still renders the same testimonials today and offline, then swaps
  // to exactly what was approved in the panel the moment the backend is live.
  const {items: approvedReviews} = useContentList("alumni", {
    fallback: careerReviews,
    adapt: adaptAlumniReview,
    params: {showOnCareerPage: true},
  });

  // Honest review matching: only renders a testimonial if the alumni's tag
  // genuinely relates to the program being viewed.
  const matchedReviews = approvedReviews.filter(MATCH_RE(program));

  const matchedJobs = matchJobs(program, 3);

  return (
    <section className="pd-section" id="pd-careers">
      <div className="pd-inner">
        <Reveal className="pd-heading">
          <p className="pd-eyebrow">Career Outcomes</p>
          <h2>Career shifts backed by real progress</h2>
          <p>
            Every program is built around the tools and workflows employers are
            hiring for, with placement support that runs alongside your learning
            rather than after it.
          </p>
        </Reveal>

        <div
          className={
            matchedReviews.length > 0
              ? "pd-careers__split pd-careers__split--has-proof"
              : "pd-careers__split"
          }
        >
          {careerStats.length > 0 && (
            <StaggerGroup as="ul" className="pd-metrics pd-metrics--compact" stagger={0.04}>
              {careerStats.map(([value, label]) => (
                <StaggerItem as="li" className="pd-metric" key={label}>
                  <strong>
                    <MetricValue value={value} />
                  </strong>
                  <small>{label}</small>
                </StaggerItem>
              ))}
            </StaggerGroup>
          )}

          {matchedReviews.length > 0 && (
            <Reveal className="pd-careers__proof" amount={0.1}>
              <TestimonialCarousel items={matchedReviews} />
            </Reveal>
          )}
        </div>

        {outcomes.length > 0 && (
          <ul className="pd-outcomes">
            {outcomes.map((outcome, index) => (
              <Reveal as="li" className="pd-outcome" key={outcome} amount={0.1}>
                <span className="pd-outcome__n" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p>{outcome}</p>
              </Reveal>
            ))}
          </ul>
        )}

        {matchedJobs.length > 0 && (
          <Reveal className="pd-jobs" amount={0.1} id="pd-jobs">
            <div className="pd-jobs__head">
              <div>
                <p className="pd-eyebrow">Live roles for this track</p>
                <h3>Where graduates are being hired</h3>
              </div>
              <Link to="/jobs" className="pd-btn pd-btn--ghost pd-btn--sm">
                View all jobs →
              </Link>
            </div>
            <ul className="pd-jobs__list" aria-label="Related job openings">
              {matchedJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </ul>
          </Reveal>
        )}
      </div>
    </section>
  );
};

export default ProgramCareers;