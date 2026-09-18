import {useState} from "react";
import {Link} from "react-router-dom";
import {Reveal} from "../motionPrimitives";
import {cdnImage} from "../../lib/imageCdn";
import {initialsOf} from "../../data/mentors";

// The headshot, or the initials monogram until/unless one loads — mirrored from
// MentorGrid so a broken or missing CDN photo reads as a deliberate card rather
// than a broken-image icon.
const Photo = ({mentor}) => {
  const [failed, setFailed] = useState(false);
  if (!mentor.photo || failed) {
    return (
      <span className="pd-mentor__photo pd-mentor__photo--initials" aria-hidden="true">
        {initialsOf(mentor.name)}
      </span>
    );
  }
  return (
    <img
      className="pd-mentor__photo"
      src={cdnImage(mentor.photo, 200)}
      alt={mentor.name}
      width={200}
      height={150}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
};

const ProgramMentors = ({mentors}) => {
  if (!mentors.length) return null;

  return (
    <section className="pd-section pd-section--alt" id="pd-mentors">
      <div className="pd-inner">
        <Reveal className="pd-heading">
          <p className="pd-eyebrow">Learn from Industry Mentors</p>
          <h2>The experts guiding this program</h2>
          <p>
            Live, mentor-led sessions from practitioners who have shipped the work
            this program teaches.
          </p>
        </Reveal>

        <div className="pd-mentors">
          {mentors.map((mentor) => {
            const facts = mentor.expertise || mentor.facts || [];
            return (
              <Reveal className="pd-mentor" key={mentor.id} amount={0.1}>
                <Photo mentor={mentor} />
                <h3>{mentor.name}</h3>
                <p className="pd-mentor__role">{mentor.role}</p>
                {mentor.discipline && (
                  <p className="pd-mentor__discipline">{mentor.discipline}</p>
                )}
                {mentor.experience && (
                  <p className="pd-mentor__experience">{mentor.experience} experience</p>
                )}
                {facts.length > 0 && (
                  <ul className="pd-mentor__facts">
                    {facts.slice(0, 3).map((fact) => (
                      <li key={fact}>{fact}</li>
                    ))}
                  </ul>
                )}
              </Reveal>
            );
          })}
        </div>

        <Reveal className="pd-heading" amount={0.1}>
          <Link className="pd-btn pd-btn--ghost pd-mentors__more" to="/faculty">
            Meet the full faculty →
          </Link>
        </Reveal>
      </div>
    </section>
  );
};

export default ProgramMentors;