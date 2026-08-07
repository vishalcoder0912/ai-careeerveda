import {motion,useReducedMotion} from "framer-motion";
import {Link} from "react-router-dom";
import {cdnImage} from "../lib/imageCdn";
import {roleTitle} from "./roleTitle";
import "./outcome-stories.css";

const AVATAR_WIDTH = 96;

const getInitials = (name) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0,2)
    .toUpperCase();

const OutcomeStories = ({reviews,stats}) => {
  const reduceMotion = useReducedMotion();
  const visibleStats = stats.slice(0,3);
  const listMotion = reduceMotion
    ? {}
    : {
        hidden: {},
        visible: {
          transition: {staggerChildren: 0.1},
        },
      };

  const cardMotion = reduceMotion
    ? {}
    : {
        hidden: {opacity: 0,y: 22},
        visible: {
          opacity: 1,
          y: 0,
          transition: {duration: 0.45,ease: [0.22,1,0.36,1]},
        },
      };

  if (!reviews || reviews.length === 0) return null;

  return (
    <section className="outcome-stories" aria-labelledby="outcome-stories-title">
      <div className="outcome-stories-inner">
        <div className="outcome-stories-heading">
          <div>
            <p className="outcome-stories-label">Learner outcomes</p>
            <h2 id="outcome-stories-title">Career shifts backed by real progress</h2>
            <p>
              Learners use practical projects, mentor feedback, and placement preparation
              to move from course work into stronger roles.
            </p>
          </div>

          <Link className="outcome-stories-link" to="/jobs">
            View job openings
          </Link>
        </div>

        <dl className="outcome-stories-metrics" aria-label="CareerVeda outcome highlights">
          {visibleStats.map(([value,label]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <motion.div
          className="outcome-stories-grid"
          variants={listMotion}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "visible"}
          viewport={{once: true,amount: 0.2}}
        >
          {reviews.map(([name,role,quote,program,photo],index) => (
            <motion.article
              key={`${name}-${program}`}
              className={`outcome-story-card${index === 1 ? " is-featured" : ""}`}
              variants={cardMotion}
            >
              {/* API records only carry a programTitle when the admin filled one
                  in, and most do not — that left an empty pill above the quote.
                  The role is the next-best label for the same slot, and if there
                  is neither the chip goes away rather than printing blank. */}
              {program || role ? (
                <span className="outcome-story-program">{program || roleTitle(role)}</span>
              ) : null}
              <blockquote>
                <p>{quote}</p>
              </blockquote>
              <footer>
                <span className="outcome-story-avatar" aria-hidden="true">
                  {photo ? (
                    <img
                      className="outcome-story-avatar__img"
                      src={cdnImage(photo, AVATAR_WIDTH)}
                      alt=""
                      width={AVATAR_WIDTH}
                      height={AVATAR_WIDTH}
                      loading="lazy"
                      decoding="async"
                      // A dead image URL would leave an empty circle, so drop back
                      // to the initials underneath.
                      onError={(event) => {
                        event.currentTarget.remove();
                      }}
                    />
                  ) : null}
                  {getInitials(name)}
                </span>
                <span>
                  <strong>{name}</strong>
                  <small>{role}</small>
                </span>
              </footer>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default OutcomeStories;
