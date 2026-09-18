import {Reveal, StaggerGroup, StaggerItem} from "../motionPrimitives";
import SkillMark from "../SkillMark";

// The program's internship and soft-skills tracks, rendered only when the record
// carries them — the same honesty contract as the rest of the page.
const ProgramTracks = ({program}) => {
  if (!program.internship && !program.softSkills) return null;

  return (
    <div className="pd-tracks">
      {program.internship && (
        <article className="pd-track">
          <span className="pd-track__n" aria-hidden="true">01</span>
          <h3>Internship program</h3>
          <ul>
            {program.internship.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </article>
      )}
      {program.softSkills && (
        <article className="pd-track">
          <span className="pd-track__n" aria-hidden="true">02</span>
          <h3>Soft skills program</h3>
          <ul>
            {program.softSkills.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </article>
      )}
    </div>
  );
};

const ProgramOverview = ({program}) => {
  const gains = program.gains || [...(program.overview || []), ...(program.outcomes || [])];

  return (
    <section className="pd-section" id="pd-overview">
      <div className="pd-inner">
        <Reveal className="pd-heading">
          <p className="pd-eyebrow">Program Overview</p>
          <h2>What you&rsquo;ll gain from this program</h2>
          <p>{program.gainsIntro || program.description}</p>
        </Reveal>

        {gains.length > 0 && (
          <StaggerGroup className="pd-gains" stagger={0.03}>
            {gains.map((gain) => (
              <StaggerItem className="pd-gain" key={gain}>
                <span className="pd-gain__check" aria-hidden="true">✓</span>
                {gain}
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}

        {program.skills?.length > 0 && (
          <ul className="pd-tags" aria-label="Skills covered">
            {program.skills.map((skill) => (
              <li key={skill}>
                <SkillMark name={skill} />
                {skill}
              </li>
            ))}
          </ul>
        )}

        <ProgramTracks program={program} />
      </div>
    </section>
  );
};

export default ProgramOverview;